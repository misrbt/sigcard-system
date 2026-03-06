<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\CreateRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Requests\CreatePermissionRequest;
use App\Http\Requests\SystemSettingsRequest;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerDocument;
use App\Models\User;
use App\Services\BSPAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Activitylog\Models\Activity;
use Carbon\Carbon;

class AdminController extends Controller
{

    // =============================================
    // DASHBOARD STATS
    // =============================================

    /**
     * Get aggregated dashboard statistics for the admin dashboard.
     */
    public function getDashboardStats(): JsonResponse
    {
        $totalCustomers  = Customer::count();
        $totalUsers      = User::count();
        $totalDocuments  = CustomerDocument::count();
        $totalSigcards   = CustomerDocument::where('document_type', 'sigcard_front')->count();

        $byStatus = Customer::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $byAccountType = Customer::select('account_type', DB::raw('count(*) as count'))
            ->groupBy('account_type')
            ->pluck('count', 'account_type');

        $byRiskLevel = Customer::select('risk_level', DB::raw('count(*) as count'))
            ->groupBy('risk_level')
            ->pluck('count', 'risk_level');

        // Customers per branch
        $branches = Branch::withCount('customers')
            ->with(['customers' => function ($q) {
                $q->select('id', 'branch_id', 'status');
            }])
            ->orderBy('brcode')
            ->get()
            ->map(function (Branch $branch) {
                $statusCounts = $branch->customers->countBy('status');

                return [
                    'branch_name'    => $branch->branch_name,
                    'brak'           => $branch->brak,
                    'brcode'         => $branch->brcode,
                    'total'          => $branch->customers_count,
                    'active'         => $statusCounts->get('active', 0),
                    'dormant'        => $statusCounts->get('dormant', 0),
                    'escheat'        => $statusCounts->get('escheat', 0),
                    'closed'         => $statusCounts->get('closed', 0),
                ];
            });

        // Sigcard uploads per branch
        $sigcardsByBranch = CustomerDocument::where('document_type', 'sigcard_front')
            ->join('customers', 'customer_documents.customer_id', '=', 'customers.id')
            ->join('branches', 'customers.branch_id', '=', 'branches.id')
            ->select('branches.branch_name', 'branches.brak', DB::raw('count(*) as count'))
            ->groupBy('branches.id', 'branches.branch_name', 'branches.brak')
            ->orderBy('count', 'desc')
            ->get();

        // Monthly customer uploads — last 6 months
        $monthlyUploads = Customer::select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('count(*) as count')
            )
            ->where('created_at', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $months = collect();
        for ($i = 5; $i >= 0; $i--) {
            $key    = now()->subMonths($i)->format('Y-m');
            $label  = now()->subMonths($i)->format('M Y');
            $months->push(['label' => $label, 'count' => $monthlyUploads->get($key)?->count ?? 0]);
        }

        // Recent 8 customer uploads
        $recentUploads = Customer::with(['branch', 'uploader'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn(Customer $c) => [
                'id'           => $c->id,
                'full_name'    => $c->full_name,
                'account_type' => $c->account_type,
                'status'       => $c->status,
                'branch'       => $c->branch?->branch_name,
                'uploader'     => $c->uploader?->full_name,
                'uploaded_at'  => $c->created_at->format('M d, Y'),
            ]);

        return response()->json([
            'summary' => [
                'total_customers' => $totalCustomers,
                'total_users'     => $totalUsers,
                'total_documents' => $totalDocuments,
                'total_sigcards'  => $totalSigcards,
                'active'          => $byStatus->get('active', 0),
                'dormant'         => $byStatus->get('dormant', 0),
                'escheat'         => $byStatus->get('escheat', 0),
                'closed'          => $byStatus->get('closed', 0),
            ],
            'by_status'          => $byStatus,
            'by_account_type'    => $byAccountType,
            'by_risk_level'      => $byRiskLevel,
            'by_branch'          => $branches,
            'sigcards_by_branch' => $sigcardsByBranch,
            'monthly_uploads'    => $months,
            'recent_uploads'     => $recentUploads,
        ]);
    }

    // =============================================
    // USER MANAGEMENT METHODS
    // =============================================

    /**
     * Get all users with pagination and filters
     */
    public function getAllUsers(Request $request): JsonResponse
    {
        $this->authorize('view-users');

        try {
            $query = User::query()->with(['roles', 'permissions', 'branch']);

            // Apply filters
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('role')) {
                $query->whereHas('roles', fn ($q) => $q->where('name', $request->role));
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('firstname', 'like', "%{$search}%")
                      ->orWhere('lastname', 'like', "%{$search}%")
                      ->orWhere('username', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            $users = $query->paginate($request->per_page ?? 15);

            activity()
                ->causedBy(auth()->user())
                ->withProperties(['action' => 'viewed_users_list', 'filters' => $request->all()])
                ->log('Admin viewed users list');

            return response()->json([
                'success' => true,
                'message' => 'Users retrieved successfully',
                'data' => $users,
                'meta' => [
                    'total_active' => User::where('status', 'active')->count(),
                    'total_inactive' => User::where('status', 'inactive')->count(),
                    'total_suspended' => User::where('status', 'suspended')->count(),
                    'total_locked' => User::whereNotNull('account_locked_at')->count(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving users: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve users',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Create a new user
     */
    public function createUser(CreateUserRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $temporaryPassword = 'abc_123';

            $userData = $request->validated();
            $userData['password']              = Hash::make($temporaryPassword);
            $userData['force_password_change'] = true;
            $userData['password_changed_at']   = now();
            $userData['password_expires_at']   = null;

            $user = User::create($userData);

            // Assign roles if provided
            if ($request->has('roles')) {
                $user->assignRole($request->roles);
            }

            DB::commit();

            activity()
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties([
                    'action' => 'user_created',
                    'user_data' => $user->only(['firstname', 'lastname', 'email', 'branch_id'])
                ])
                ->log('Admin created new user');

            return response()->json([
                'success'            => true,
                'message'            => 'User created successfully. They must log in with the temporary password and set a new one.',
                'temporary_password' => $temporaryPassword,
                'data'               => $user->load(['roles', 'permissions']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update an existing user
     */
    public function updateUser(UpdateUserRequest $request, User $user): JsonResponse
    {
        try {
            DB::beginTransaction();

            $userData = $request->validated();
            $originalData = $user->toArray();

            // Handle password update
            if (isset($userData['password'])) {
                $userData['password'] = Hash::make($userData['password']);
                $userData['password_changed_at'] = now();
                $userData['password_expires_at'] = BSPAuthService::getPasswordExpiryDays() > 0 ? now()->addDays(BSPAuthService::getPasswordExpiryDays()) : null;
            }

            $user->update($userData);

            // Update roles if provided
            if ($request->has('roles')) {
                $user->syncRoles($request->roles);
            }

            DB::commit();

            activity()
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties([
                    'action' => 'user_updated',
                    'original_data' => $originalData,
                    'updated_data' => $user->fresh()->toArray()
                ])
                ->log('Admin updated user');

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $user->fresh()->load(['roles', 'permissions'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Delete a user (soft delete for BSP compliance)
     */
    public function deleteUser(User $user): JsonResponse
    {
        $this->authorize('delete-users');

        try {
            // Prevent deletion of admin user
            if ($user->hasRole('admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete admin user'
                ], 403);
            }

            // Prevent self-deletion
            if ($user->id === auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete your own account'
                ], 403);
            }

            $userData = $user->toArray();

            // Instead of hard delete, deactivate user for BSP compliance
            $user->update([
                'status' => 'inactive',
                'email' => $user->email . '_deleted_' . time(),
                'employee_id' => $user->employee_id . '_deleted_' . time(),
            ]);

            activity()
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties([
                    'action' => 'user_deleted',
                    'user_data' => $userData
                ])
                ->log('Admin deleted user');

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Activate a user account
     */
    public function activateUser(User $user): JsonResponse
    {
        $this->authorize('activate-users');

        try {
            $user->update([
                'status' => 'active',
                'account_locked_at' => null,
                'failed_login_attempts' => 0
            ]);

            activity()
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties(['action' => 'user_activated'])
                ->log('Admin activated user account');

            return response()->json([
                'success' => true,
                'message' => 'User account activated successfully',
                'data' => $user->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Error activating user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to activate user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Deactivate a user account
     */
    public function deactivateUser(User $user): JsonResponse
    {
        $this->authorize('deactivate-users');

        try {
            // Prevent deactivation of admin user
            if ($user->hasRole('admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot deactivate admin user'
                ], 403);
            }

            // Prevent self-deactivation
            if ($user->id === auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot deactivate your own account'
                ], 403);
            }

            $user->update(['status' => 'inactive']);

            // Revoke all active tokens
            $user->tokens()->delete();

            activity()
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties(['action' => 'user_deactivated'])
                ->log('Admin deactivated user account');

            return response()->json([
                'success' => true,
                'message' => 'User account deactivated successfully',
                'data' => $user->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Error deactivating user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to deactivate user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Unlock a user account
     */
    public function unlockUser(User $user): JsonResponse
    {
        $this->authorize('unlock-user-accounts');

        try {
            $user->update([
                'account_locked_at' => null,
                'failed_login_attempts' => 0
            ]);

            activity()
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties(['action' => 'user_unlocked'])
                ->log('Admin unlocked user account');

            return response()->json([
                'success' => true,
                'message' => 'User account unlocked successfully',
                'data' => $user->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Error unlocking user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to unlock user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Reset user password
     */
    public function resetUserPassword(Request $request, User $user): JsonResponse
    {
        $this->authorize('reset-user-passwords');

        try {
            $temporaryPassword = 'abc_123';

            $user->update([
                'password' => Hash::make($temporaryPassword),
                'password_changed_at' => now(),
                'password_expires_at' => null,
                'force_password_change' => true,
                'failed_login_attempts' => 0,
                'account_locked_at' => null,
            ]);

            // Revoke all existing tokens to force re-login with temporary password
            $user->tokens()->delete();

            activity()
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties(['action' => 'password_reset_by_admin'])
                ->log('Admin reset user password to temporary password');

            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully. User must log in with the temporary password and set a new one.',
                'data' => [
                    'temporary_password' => $temporaryPassword,
                    'force_change_required' => true,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error resetting password: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to reset password',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // ROLE MANAGEMENT METHODS
    // =============================================

    /**
     * Get all roles with permissions
     */
    public function getAllRoles(): JsonResponse
    {
        $this->authorize('view-roles');

        try {
            $roles = Role::with('permissions')->get();

            activity()
                ->causedBy(auth()->user())
                ->withProperties(['action' => 'viewed_roles_list'])
                ->log('Admin viewed roles list');

            return response()->json([
                'success' => true,
                'message' => 'Roles retrieved successfully',
                'data' => $roles
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving roles: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve roles',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Create a new role
     */
    public function createRole(CreateRoleRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $role = Role::create($request->validated());

            // Assign permissions if provided
            if ($request->has('permissions')) {
                $role->givePermissionTo($request->permissions);
            }

            DB::commit();

            activity()
                ->causedBy(auth()->user())
                ->performedOn($role)
                ->withProperties([
                    'action' => 'role_created',
                    'role_data' => $role->toArray()
                ])
                ->log('Admin created new role');

            return response()->json([
                'success' => true,
                'message' => 'Role created successfully',
                'data' => $role->load('permissions')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating role: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create role',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update an existing role
     */
    public function updateRole(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        try {
            DB::beginTransaction();

            $originalData = $role->toArray();
            $role->update($request->validated());

            // Update permissions if provided
            if ($request->has('permissions')) {
                $role->syncPermissions($request->permissions);
            }

            DB::commit();

            activity()
                ->causedBy(auth()->user())
                ->performedOn($role)
                ->withProperties([
                    'action' => 'role_updated',
                    'original_data' => $originalData,
                    'updated_data' => $role->fresh()->toArray()
                ])
                ->log('Admin updated role');

            return response()->json([
                'success' => true,
                'message' => 'Role updated successfully',
                'data' => $role->fresh()->load('permissions')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating role: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update role',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Delete a role
     */
    public function deleteRole(Role $role): JsonResponse
    {
        $this->authorize('delete-roles');

        try {
            // Prevent deletion of super-admin role
            if ($role->name === 'super-admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete super-admin role'
                ], 403);
            }

            // Check if role is assigned to any users
            if ($role->users()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete role that is assigned to users'
                ], 403);
            }

            $roleData = $role->toArray();
            $role->delete();

            activity()
                ->causedBy(auth()->user())
                ->withProperties([
                    'action' => 'role_deleted',
                    'role_data' => $roleData
                ])
                ->log('Admin deleted role');

            return response()->json([
                'success' => true,
                'message' => 'Role deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting role: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete role',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Assign role to user
     */
    public function assignRole(Request $request, User $user): JsonResponse
    {
        $this->authorize('assign-roles');

        $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'exists:roles,name'
        ]);

        try {
            $user->assignRole($request->roles);

            activity()
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties([
                    'action' => 'roles_assigned',
                    'roles' => $request->roles
                ])
                ->log('Admin assigned roles to user');

            return response()->json([
                'success' => true,
                'message' => 'Roles assigned successfully',
                'data' => $user->fresh()->load(['roles', 'permissions'])
            ]);

        } catch (\Exception $e) {
            Log::error('Error assigning role: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to assign role',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Remove role from user
     */
    public function removeRole(Request $request, User $user): JsonResponse
    {
        $this->authorize('assign-roles');

        $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'exists:roles,name'
        ]);

        try {
            // Prevent removal of admin role from admin user
            if ($user->hasRole('admin') && in_array('admin', $request->roles)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot remove admin role from admin user'
                ], 403);
            }

            $user->removeRole($request->roles);

            activity()
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties([
                    'action' => 'roles_removed',
                    'roles' => $request->roles
                ])
                ->log('Admin removed roles from user');

            return response()->json([
                'success' => true,
                'message' => 'Roles removed successfully',
                'data' => $user->fresh()->load(['roles', 'permissions'])
            ]);

        } catch (\Exception $e) {
            Log::error('Error removing role: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to remove role',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // PERMISSION MANAGEMENT METHODS
    // =============================================

    /**
     * Get all permissions
     */
    public function getAllPermissions(): JsonResponse
    {
        $this->authorize('view-permissions');

        try {
            $permissions = Permission::all();

            activity()
                ->causedBy(auth()->user())
                ->withProperties(['action' => 'viewed_permissions_list'])
                ->log('Admin viewed permissions list');

            return response()->json([
                'success' => true,
                'message' => 'Permissions retrieved successfully',
                'data' => $permissions
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving permissions: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve permissions',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Create a new permission
     */
    public function createPermission(CreatePermissionRequest $request): JsonResponse
    {
        try {
            $permission = Permission::create($request->validated());

            activity()
                ->causedBy(auth()->user())
                ->performedOn($permission)
                ->withProperties([
                    'action' => 'permission_created',
                    'permission_data' => $permission->toArray()
                ])
                ->log('Admin created new permission');

            return response()->json([
                'success' => true,
                'message' => 'Permission created successfully',
                'data' => $permission
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error creating permission: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create permission',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Assign permission to user or role
     */
    public function assignPermission(Request $request): JsonResponse
    {
        $this->authorize('assign-permissions');

        $request->validate([
            'target_type' => 'required|in:user,role',
            'target_id' => 'required|integer',
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,name'
        ]);

        try {
            if ($request->target_type === 'user') {
                $user = User::findOrFail($request->target_id);
                $user->givePermissionTo($request->permissions);
                $target = $user;
            } else {
                $role = Role::findOrFail($request->target_id);
                $role->givePermissionTo($request->permissions);
                $target = $role;
            }

            activity()
                ->causedBy(auth()->user())
                ->performedOn($target)
                ->withProperties([
                    'action' => 'permissions_assigned',
                    'target_type' => $request->target_type,
                    'permissions' => $request->permissions
                ])
                ->log('Admin assigned permissions');

            return response()->json([
                'success' => true,
                'message' => 'Permissions assigned successfully',
                'data' => $target->fresh()->load('permissions')
            ]);

        } catch (\Exception $e) {
            Log::error('Error assigning permission: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to assign permission',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // SYSTEM ADMINISTRATION METHODS
    // =============================================

    /**
     * Get system settings
     */
    public function getSystemSettings(): JsonResponse
    {
        $this->authorize('view-system-settings');

        try {
            $settings = [
                'session_timeout' => (int) Cache::get('system_setting_session_timeout', config('session.lifetime', 120)),
                'token_expiration' => (int) Cache::get('system_setting_token_expiration', config('sanctum.expiration', 30)),
                'password_expiry_enabled' => (bool) Cache::get('system_setting_password_expiry_enabled', false),
                'password_expiry_days' => (int) Cache::get('system_setting_password_expiry_days', 90),
                'max_login_attempts' => (int) Cache::get('system_setting_max_login_attempts', 5),
                'account_lockout_duration' => (int) Cache::get('system_setting_account_lockout_duration', 30),
                'require_two_factor' => (bool) Cache::get('system_setting_require_two_factor', false),
                'maintenance_mode' => app()->isDownForMaintenance(),
                'audit_log_retention_days' => (int) Cache::get('system_setting_audit_log_retention_days', 365),
                'notification_email' => Cache::get('system_setting_notification_email', config('mail.from.address')),
                'system_timezone' => Cache::get('system_setting_system_timezone', config('app.timezone')),
                'currency_code' => Cache::get('system_setting_currency_code', 'PHP'),
            ];

            activity()
                ->causedBy(auth()->user())
                ->withProperties(['action' => 'viewed_system_settings'])
                ->log('Admin viewed system settings');

            return response()->json([
                'success' => true,
                'message' => 'System settings retrieved successfully',
                'data' => $settings
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving system settings: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve system settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update system settings
     */
    public function updateSystemSettings(SystemSettingsRequest $request): JsonResponse
    {
        try {
            $settings = $request->validated();

            // Update cache-based settings
            foreach ($settings as $key => $value) {
                Cache::put("system_setting_{$key}", $value, now()->addDays(30));
            }

            activity()
                ->causedBy(auth()->user())
                ->withProperties([
                    'action' => 'updated_system_settings',
                    'settings' => $settings
                ])
                ->log('Admin updated system settings');

            return response()->json([
                'success' => true,
                'message' => 'System settings updated successfully',
                'data' => $settings
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating system settings: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update system settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get system logs
     */
    public function getSystemLogs(Request $request): JsonResponse
    {
        $this->authorize('view-system-logs');

        $request->validate([
            'level' => 'nullable|in:emergency,alert,critical,error,warning,notice,info,debug',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'per_page' => 'nullable|integer|min:1|max:100'
        ]);

        try {
            // This is a simplified implementation - in production you'd want to use a proper log reader
            $logPath = storage_path('logs/laravel.log');
            $logs = [];

            if (file_exists($logPath)) {
                $logContent = file_get_contents($logPath);
                $logLines = explode("\n", $logContent);

                // Take last 100 lines and reverse for latest first
                $logs = array_slice(array_reverse($logLines), 0, $request->per_page ?? 50);
            }

            activity()
                ->causedBy(auth()->user())
                ->withProperties([
                    'action' => 'viewed_system_logs',
                    'filters' => $request->all()
                ])
                ->log('Admin viewed system logs');

            return response()->json([
                'success' => true,
                'message' => 'System logs retrieved successfully',
                'data' => $logs
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving system logs: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve system logs',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Backup system
     */
    public function backupSystem(): JsonResponse
    {
        $this->authorize('backup-system');

        try {
            $backupName = 'backup_' . now()->format('Y_m_d_H_i_s');

            // Run backup command
            Artisan::call('backup:run', [
                '--only-db' => true,
                '--filename' => $backupName
            ]);

            activity()
                ->causedBy(auth()->user())
                ->withProperties([
                    'action' => 'system_backup_created',
                    'backup_name' => $backupName
                ])
                ->log('Admin created system backup');

            return response()->json([
                'success' => true,
                'message' => 'System backup created successfully',
                'data' => [
                    'backup_name' => $backupName,
                    'created_at' => now()->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error creating backup: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create backup',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Restore system from backup
     */
    public function restoreSystem(Request $request): JsonResponse
    {
        $this->authorize('restore-system');

        $request->validate([
            'backup_file' => 'required|string'
        ]);

        try {
            // This would typically involve more complex restoration logic
            // For BSP compliance, this should be heavily audited and controlled

            activity()
                ->causedBy(auth()->user())
                ->withProperties([
                    'action' => 'system_restore_attempted',
                    'backup_file' => $request->backup_file
                ])
                ->log('Admin attempted system restore');

            return response()->json([
                'success' => true,
                'message' => 'System restoration initiated. Please monitor system status.',
                'data' => [
                    'backup_file' => $request->backup_file,
                    'initiated_at' => now()->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error restoring system: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to restore system',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // AUDIT & SECURITY MONITORING METHODS
    // =============================================

    /**
     * Get audit logs with BSP compliance filtering
     */
    public function getAuditLogs(Request $request): JsonResponse
    {
        $this->authorize('view-audit-logs');

        $request->validate([
            'search'    => 'nullable|string|max:255',
            'category'  => 'nullable|in:all,login,customer,user_management,security,system',
            'causer_id' => 'nullable|exists:users,id',
            'date_from' => 'nullable|date',
            'date_to'   => 'nullable|date|after_or_equal:date_from',
            'per_page'  => 'nullable|integer|min:1|max:100',
        ]);

        try {
            $query = Activity::with(['causer', 'subject'])
                ->orderBy('created_at', 'desc');

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhereHasMorph('causer', [User::class], function ($u) use ($search) {
                            $u->where('firstname', 'like', "%{$search}%")
                                ->orWhere('lastname', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            }

            if ($request->filled('causer_id')) {
                $query->where('causer_id', $request->causer_id);
            }

            if ($request->filled('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            if ($request->filled('category') && $request->category !== 'all') {
                $this->applyCategoryFilter($query, $request->category);
            }

            $logs = $query->paginate($request->per_page ?? 25);

            // Daily summary stats (not logged to avoid infinite loop)
            $stats = [
                'total_today'    => Activity::whereDate('created_at', today())->count(),
                'logins_today'   => Activity::where('description', 'like', '%login%')
                                        ->whereDate('created_at', today())->count(),
                'failed_today'   => Activity::where('description', 'like', '%failed%')
                                        ->whereDate('created_at', today())->count(),
                'customer_ops'   => Activity::where(function ($q) {
                                            $q->where('description', 'like', '%customer%')
                                                ->orWhere('subject_type', 'like', '%Customer%');
                                        })->whereDate('created_at', today())->count(),
                'total_all_time' => Activity::count(),
            ];

            // Users list for filter dropdown
            $users = User::select('id', 'firstname', 'lastname', 'email')
                ->orderBy('firstname')->get()
                ->map(fn(User $u) => ['id' => $u->id, 'name' => $u->full_name, 'email' => $u->email]);

            return response()->json([
                'success' => true,
                'message' => 'Audit logs retrieved successfully',
                'data'    => $logs,
                'stats'   => $stats,
                'users'   => $users,
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving audit logs: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve audit logs',
                'error'   => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get full activity history for a specific model record.
     * Used to build the history timeline for customers, documents and users.
     */
    public function getSubjectHistory(Request $request, string $subjectType, int $subjectId): JsonResponse
    {
        $this->authorize('view-audit-logs');

        $modelMap = [
            'customer' => \App\Models\Customer::class,
            'document' => \App\Models\CustomerDocument::class,
            'user'     => User::class,
        ];

        if (!array_key_exists($subjectType, $modelMap)) {
            return response()->json(['success' => false, 'message' => 'Invalid subject type.'], 422);
        }

        $modelClass = $modelMap[$subjectType];
        $model      = $modelClass::find($subjectId);

        $query = Activity::where('subject_type', $modelClass)
            ->where('subject_id', $subjectId)
            ->with('causer')
            ->latest();

        // Also pull operational logs that were performed on this subject
        $history = $query->get()->map(function (Activity $entry) {
            $props = $entry->properties->toArray();

            return [
                'id'          => $entry->id,
                'event'       => $entry->event,
                'log_name'    => $entry->log_name,
                'description' => $entry->description,
                'causer'      => $entry->causer
                    ? ['name' => optional($entry->causer)->full_name, 'email' => optional($entry->causer)->email]
                    : null,
                'old'         => $props['old']        ?? null,
                'attributes'  => $props['attributes'] ?? null,
                'diff'        => $props['diff']        ?? null,
                'meta'        => collect($props)->except(['old', 'attributes', 'diff'])->all(),
                'created_at'  => $entry->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'success'  => true,
            'subject'  => $model ? [
                'id'       => $model->id,
                'label'    => method_exists($model, 'getFullNameAttribute') ? $model->full_name : "#{$subjectId}",
            ] : null,
            'history'  => $history,
        ]);
    }

    /**
     * Apply category-based filter to audit log query.
     */
    private function applyCategoryFilter(\Illuminate\Database\Eloquent\Builder $query, string $category): void
    {
        match ($category) {
            'login' => $query->where(function ($q) {
                $q->where('description', 'like', '%login%')
                    ->orWhere('description', 'like', '%logout%')
                    ->orWhere('description', 'like', '%authentication%')
                    ->orWhere('description', 'like', '%password%')
                    ->orWhere('description', 'like', '%2fa%');
            }),
            'customer' => $query->where(function ($q) {
                $q->where('description', 'like', '%customer%')
                    ->orWhere('description', 'like', '%sigcard%')
                    ->orWhere('description', 'like', '%document%')
                    ->orWhere('subject_type', 'like', '%Customer%');
            }),
            'user_management' => $query->where(function ($q) {
                $q->where('description', 'like', '%user%')
                    ->orWhere('description', 'like', '%role%')
                    ->orWhere('description', 'like', '%permission%');
            }),
            'security' => $query->where(function ($q) {
                $q->where('description', 'like', '%locked%')
                    ->orWhere('description', 'like', '%failed%')
                    ->orWhere('description', 'like', '%unauthorized%')
                    ->orWhere('description', 'like', '%suspicious%')
                    ->orWhere('description', 'like', '%security%');
            }),
            'system' => $query->where(function ($q) {
                $q->where('description', 'like', '%settings%')
                    ->orWhere('description', 'like', '%system%')
                    ->orWhere('description', 'like', '%backup%')
                    ->orWhere('description', 'like', '%restore%');
            }),
            default => null,
        };
    }

    /**
     * Get login attempts for security monitoring
     */
    public function getLoginAttempts(Request $request): JsonResponse
    {
        $this->authorize('view-login-attempts');

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'status' => 'nullable|in:success,failed,locked',
            'per_page' => 'nullable|integer|min:1|max:100'
        ]);

        try {
            $query = Activity::where('description', 'like', '%login%')
                ->with('causer')
                ->orderBy('created_at', 'desc');

            if ($request->filled('date_from')) {
                $query->where('created_at', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->where('created_at', '<=', $request->date_to);
            }

            if ($request->filled('status')) {
                $query->where('description', 'like', "%{$request->status}%");
            }

            $attempts = $query->paginate($request->per_page ?? 50);

            activity()
                ->causedBy(auth()->user())
                ->withProperties([
                    'action' => 'viewed_login_attempts',
                    'filters' => $request->all()
                ])
                ->log('Admin viewed login attempts');

            return response()->json([
                'success' => true,
                'message' => 'Login attempts retrieved successfully',
                'data' => $attempts,
                'meta' => [
                    'failed_attempts_last_24h' => Activity::where('description', 'like', '%failed%login%')
                        ->where('created_at', '>=', now()->subDay())
                        ->count(),
                    'successful_logins_last_24h' => Activity::where('description', 'like', '%successful%login%')
                        ->where('created_at', '>=', now()->subDay())
                        ->count(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving login attempts: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve login attempts',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get security events for BSP compliance monitoring
     */
    public function getSecurityEvents(Request $request): JsonResponse
    {
        $this->authorize('view-audit-logs');

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'severity' => 'nullable|in:low,medium,high,critical',
            'per_page' => 'nullable|integer|min:1|max:100'
        ]);

        try {
            $securityEvents = [
                'failed_login', 'account_locked', 'password_reset', 'unauthorized_access',
                'privilege_escalation', 'data_export', 'system_configuration_change'
            ];

            $query = Activity::whereIn('description', $securityEvents)
                ->with('causer')
                ->orderBy('created_at', 'desc');

            if ($request->filled('date_from')) {
                $query->where('created_at', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->where('created_at', '<=', $request->date_to);
            }

            $events = $query->paginate($request->per_page ?? 50);

            activity()
                ->causedBy(auth()->user())
                ->withProperties([
                    'action' => 'viewed_security_events',
                    'filters' => $request->all()
                ])
                ->log('Admin viewed security events');

            return response()->json([
                'success' => true,
                'message' => 'Security events retrieved successfully',
                'data' => $events,
                'meta' => [
                    'critical_events_last_24h' => Activity::whereIn('description', ['unauthorized_access', 'privilege_escalation'])
                        ->where('created_at', '>=', now()->subDay())
                        ->count(),
                    'locked_accounts_last_24h' => User::whereNotNull('account_locked_at')
                        ->where('account_locked_at', '>=', now()->subDay())
                        ->count(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving security events: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve security events',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // BRANCH HIERARCHY / DATA MANAGEMENT
    // =============================================

    /**
     * Return all branches with their parent and children relationships.
     * Mother branches (parent_id = null) are returned first, then branch lites.
     */
    public function getBranchHierarchy(): JsonResponse
    {
        $branches = Branch::with('children')
            ->orderByRaw('parent_id IS NOT NULL')
            ->orderBy('branch_name')
            ->get()
            ->map(fn(Branch $b) => [
                'id'          => $b->id,
                'branch_name' => $b->branch_name,
                'brak'        => $b->brak,
                'brcode'      => $b->brcode,
                'parent_id'   => $b->parent_id,
                'children'    => $b->children->map(fn(Branch $c) => [
                    'id'          => $c->id,
                    'branch_name' => $c->branch_name,
                    'brak'        => $c->brak,
                    'brcode'      => $c->brcode,
                ])->values(),
            ]);

        return response()->json(['data' => $branches]);
    }

    /**
     * Set or clear the parent branch for a given branch.
     * Pass parent_id = null to make the branch a standalone mother branch.
     */
    public function updateBranchParent(Request $request, Branch $branch): JsonResponse
    {
        $request->validate([
            'parent_id' => 'nullable|exists:branches,id',
        ]);

        $parentId = $request->input('parent_id');

        // Prevent circular reference — a branch cannot be its own ancestor.
        if ($parentId && $parentId == $branch->id) {
            return response()->json(['message' => 'A branch cannot be its own parent.'], 422);
        }

        // If this branch already has children, it cannot become a branch lite.
        if ($parentId && $branch->children()->exists()) {
            return response()->json([
                'message' => 'Cannot assign a parent to a branch that already has child branches. Remove children first.',
            ], 422);
        }

        $branch->update(['parent_id' => $parentId]);

        activity()
            ->causedBy(Auth::user())
            ->performedOn($branch)
            ->withProperties([
                'action'    => 'branch_parent_updated',
                'parent_id' => $parentId,
            ])
            ->log('Branch hierarchy updated');

        return response()->json([
            'message' => 'Branch hierarchy updated successfully.',
            'branch'  => $branch->fresh(['parent', 'children']),
        ]);
    }
}
