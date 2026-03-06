<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Customer;
use App\Models\User;
use App\Traits\BranchDashboardTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;
use Carbon\Carbon;

/**
 * Manager Controller - Banking Operations Management
 *
 * Handles banking operations management with BSP compliance
 * Limited administrative functions for managers
 */
class ManagerController extends Controller
{
    use BranchDashboardTrait;

    // =============================================
    // DASHBOARD
    // =============================================

    /**
     * Get real dashboard stats for manager's branch.
     */
    public function getDashboard(): JsonResponse
    {
        try {
            $user   = auth()->user();
            $branch = $user->branch()->with('children')->first();

            $branchIds = collect([$user->branch_id]);

            if ($branch) {
                $branchIds = $branchIds->merge($branch->children->pluck('id'));
            }

            return response()->json([
                'success' => true,
                'data'    => $this->getBranchDashboardData($branchIds->unique()->values()->all()),
            ]);
        } catch (\Exception $e) {
            Log::error('Manager dashboard error: ' . $e->getMessage());

            return response()->json(['success' => false, 'message' => 'Failed to load dashboard'], 500);
        }
    }

    // =============================================
    // USER MANAGEMENT METHODS (LIMITED SCOPE)
    // =============================================

    /**
     * Get users (limited scope for managers)
     */
    public function getUsers(Request $request): JsonResponse
    {
        $this->authorize('view users');

        try {
            $user = auth()->user();
            $query = User::query()->with(['roles', 'permissions']);

            // Managers can only view users in their branch
            if (!$user->hasRole('admin')) {
                $query->where('branch_code', $user->branch_code);
            }

            // Apply filters
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('department')) {
                $query->where('department', $request->department);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%");
                });
            }

            $users = $query->paginate($request->per_page ?? 15);

            activity()
                ->causedBy($user)
                ->withProperties(['action' => 'manager_viewed_users_list', 'filters' => $request->all()])
                ->log('Manager viewed users list');

            return response()->json([
                'success' => true,
                'message' => 'Users retrieved successfully',
                'data' => $users,
                'meta' => [
                    'branch_scope' => $user->branch_code,
                    'total_active' => User::where('status', 'active')
                        ->when(!$user->hasRole('admin'), fn($q) => $q->where('branch_code', $user->branch_code))
                        ->count(),
                    'total_inactive' => User::where('status', 'inactive')
                        ->when(!$user->hasRole('admin'), fn($q) => $q->where('branch_code', $user->branch_code))
                        ->count(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving users: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve users',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update user (limited scope)
     */
    public function updateUser(UpdateUserRequest $request, User $user): JsonResponse
    {
        try {
            $manager = auth()->user();

            // Managers can only update users in their branch
            if (!$manager->hasRole('admin') && $user->branch_code !== $manager->branch_code) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot update user from different branch'
                ], 403);
            }

            // Prevent updating super admin or admin users
            if ($user->hasRole(['super-admin', 'admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot update admin users'
                ], 403);
            }

            DB::beginTransaction();

            $userData = $request->validated();
            $originalData = $user->toArray();

            // Handle password update
            if (isset($userData['password'])) {
                $userData['password'] = Hash::make($userData['password']);
                $userData['password_changed_at'] = now();
                $userData['password_expires_at'] = now()->addDays(config('auth.password_expiry_days', 90));
            }

            $user->update($userData);

            DB::commit();

            activity()
                ->causedBy($manager)
                ->performedOn($user)
                ->withProperties([
                    'action' => 'manager_updated_user',
                    'original_data' => $originalData,
                    'updated_data' => $user->fresh()->toArray()
                ])
                ->log('Manager updated user');

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $user->fresh()->load(['roles', 'permissions'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Manager error updating user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Activate user account
     */
    public function activateUser(User $user): JsonResponse
    {
        $this->authorize('manage user status');

        try {
            $manager = auth()->user();

            // Branch restriction for managers
            if (!$manager->hasRole('admin') && $user->branch_code !== $manager->branch_code) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot activate user from different branch'
                ], 403);
            }

            $user->update([
                'status' => 'active',
                'account_locked_at' => null,
                'failed_login_attempts' => 0
            ]);

            activity()
                ->causedBy($manager)
                ->performedOn($user)
                ->withProperties(['action' => 'manager_activated_user'])
                ->log('Manager activated user account');

            return response()->json([
                'success' => true,
                'message' => 'User account activated successfully',
                'data' => $user->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error activating user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to activate user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Deactivate user account
     */
    public function deactivateUser(User $user): JsonResponse
    {
        $this->authorize('manage user status');

        try {
            $manager = auth()->user();

            // Branch restriction and role checks
            if (!$manager->hasRole('admin') && $user->branch_code !== $manager->branch_code) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot deactivate user from different branch'
                ], 403);
            }

            if ($user->hasRole(['admin', 'super-admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot deactivate admin users'
                ], 403);
            }

            if ($user->id === $manager->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot deactivate your own account'
                ], 403);
            }

            $user->update(['status' => 'inactive']);
            $user->tokens()->delete();

            activity()
                ->causedBy($manager)
                ->performedOn($user)
                ->withProperties(['action' => 'manager_deactivated_user'])
                ->log('Manager deactivated user account');

            return response()->json([
                'success' => true,
                'message' => 'User account deactivated successfully',
                'data' => $user->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error deactivating user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to deactivate user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Reset user password
     */
    public function resetUserPassword(Request $request, User $user): JsonResponse
    {
        $this->authorize('reset user passwords');

        $request->validate([
            'new_password' => [
                'required',
                'string',
                'min:12',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/',
            ],
            'force_change' => 'boolean'
        ], [
            'new_password.min' => 'Password must be at least 12 characters long (BSP requirement).',
            'new_password.regex' => 'Password must contain uppercase, lowercase, number and special character.'
        ]);

        try {
            $manager = auth()->user();

            // Branch restriction
            if (!$manager->hasRole('admin') && $user->branch_code !== $manager->branch_code) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot reset password for user from different branch'
                ], 403);
            }

            $user->update([
                'password' => Hash::make($request->new_password),
                'password_changed_at' => now(),
                'password_expires_at' => now()->addDays(config('auth.password_expiry_days', 90)),
                'force_password_change' => $request->force_change ?? true,
                'failed_login_attempts' => 0,
                'account_locked_at' => null
            ]);

            $user->tokens()->delete();

            activity()
                ->causedBy($manager)
                ->performedOn($user)
                ->withProperties(['action' => 'manager_reset_user_password'])
                ->log('Manager reset user password');

            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully',
                'data' => [
                    'force_change_required' => $request->force_change ?? true
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error resetting password: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to reset password',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Unlock user account
     */
    public function unlockUser(User $user): JsonResponse
    {
        $this->authorize('manage user status');

        try {
            $manager = auth()->user();

            // Branch restriction
            if (!$manager->hasRole('admin') && $user->branch_code !== $manager->branch_code) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot unlock user from different branch'
                ], 403);
            }

            $user->update([
                'account_locked_at' => null,
                'failed_login_attempts' => 0
            ]);

            activity()
                ->causedBy($manager)
                ->performedOn($user)
                ->withProperties(['action' => 'manager_unlocked_user'])
                ->log('Manager unlocked user account');

            return response()->json([
                'success' => true,
                'message' => 'User account unlocked successfully',
                'data' => $user->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error unlocking user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to unlock user',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // TRANSACTION MANAGEMENT METHODS
    // =============================================

    /**
     * Get transactions for approval/management
     */
    public function getTransactions(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $request->validate([
                'status' => 'nullable|in:pending,approved,rejected,completed',
                'type' => 'nullable|in:deposit,withdrawal,transfer',
                'amount_from' => 'nullable|numeric|min:0',
                'amount_to' => 'nullable|numeric|min:0',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            // Placeholder data - implement actual transaction retrieval
            $transactions = [
                [
                    'id' => 1,
                    'reference_number' => 'TXN-' . Str::random(10),
                    'type' => 'transfer',
                    'amount' => 50000.00,
                    'currency' => 'PHP',
                    'status' => 'pending_approval',
                    'from_account' => '1234567890',
                    'to_account' => '0987654321',
                    'branch_code' => $manager->branch_code,
                    'initiated_by' => 'John Doe',
                    'created_at' => now()->subHours(2),
                    'requires_manager_approval' => true
                ]
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_transactions', 'filters' => $request->all()])
                ->log('Manager viewed transactions');

            return response()->json([
                'success' => true,
                'message' => 'Transactions retrieved successfully',
                'data' => [
                    'transactions' => $transactions,
                    'pagination' => [
                        'total' => count($transactions),
                        'per_page' => $request->per_page ?? 20,
                        'current_page' => 1
                    ]
                ],
                'meta' => [
                    'branch_scope' => $manager->branch_code,
                    'pending_approval_count' => 5,
                    'high_value_count' => 2
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving transactions: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve transactions',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get pending transactions for approval
     */
    public function getPendingTransactions(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $pendingTransactions = [
                [
                    'id' => 1,
                    'reference_number' => 'TXN-PENDING-001',
                    'type' => 'withdrawal',
                    'amount' => 100000.00,
                    'currency' => 'PHP',
                    'account_number' => '1234567890',
                    'customer_name' => 'Jane Smith',
                    'branch_code' => $manager->branch_code,
                    'initiated_by' => 'Teller 1',
                    'initiated_at' => now()->subMinutes(30),
                    'priority' => 'high',
                    'requires_dual_approval' => true
                ]
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_pending_transactions'])
                ->log('Manager viewed pending transactions');

            return response()->json([
                'success' => true,
                'message' => 'Pending transactions retrieved successfully',
                'data' => [
                    'pending_transactions' => $pendingTransactions,
                    'summary' => [
                        'total_pending' => count($pendingTransactions),
                        'high_priority' => 1,
                        'total_amount' => 100000.00
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving pending transactions: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve pending transactions',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Approve transaction
     */
    public function approveTransaction(Request $request, string $transaction): JsonResponse
    {
        $this->authorize('approve transactions');

        $request->validate([
            'comments' => 'nullable|string|max:500',
            'override_limits' => 'boolean'
        ]);

        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_approved_transaction',
                    'transaction_id' => $transaction,
                    'comments' => $request->comments,
                    'override_limits' => $request->override_limits ?? false
                ])
                ->log('Manager approved transaction');

            return response()->json([
                'success' => true,
                'message' => 'Transaction approved successfully',
                'data' => [
                    'transaction_id' => $transaction,
                    'status' => 'approved',
                    'approved_by' => $manager->name,
                    'approved_at' => now(),
                    'comments' => $request->comments,
                    'next_step' => 'processing'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error approving transaction: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve transaction',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Reject transaction
     */
    public function rejectTransaction(Request $request, string $transaction): JsonResponse
    {
        $this->authorize('approve transactions');

        $request->validate([
            'reason' => 'required|string|max:500'
        ]);

        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_rejected_transaction',
                    'transaction_id' => $transaction,
                    'reason' => $request->reason
                ])
                ->log('Manager rejected transaction');

            return response()->json([
                'success' => true,
                'message' => 'Transaction rejected successfully',
                'data' => [
                    'transaction_id' => $transaction,
                    'status' => 'rejected',
                    'rejected_by' => $manager->name,
                    'rejected_at' => now(),
                    'reason' => $request->reason
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error rejecting transaction: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject transaction',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // ACCOUNT AND TRANSFER OPERATIONS
    // =============================================

    /**
     * Get accounts
     */
    public function getAccounts(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $request->validate([
                'status' => 'nullable|in:active,inactive,suspended,closed',
                'type' => 'nullable|in:savings,checking,time_deposit',
                'search' => 'nullable|string|max:100',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            // Placeholder data - implement actual account retrieval
            $accounts = [
                [
                    'account_number' => '1234567890',
                    'account_type' => 'savings',
                    'customer_name' => 'John Doe',
                    'status' => 'active',
                    'branch_code' => $manager->branch_code,
                    'balance' => 50000.00,
                    'currency' => 'PHP',
                    'opened_date' => now()->subYears(1),
                    'last_activity' => now()->subDays(3)
                ]
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_accounts', 'filters' => $request->all()])
                ->log('Manager viewed accounts');

            return response()->json([
                'success' => true,
                'message' => 'Accounts retrieved successfully',
                'data' => [
                    'accounts' => $accounts,
                    'pagination' => [
                        'total' => count($accounts),
                        'per_page' => $request->per_page ?? 20,
                        'current_page' => 1
                    ]
                ],
                'meta' => [
                    'branch_scope' => $manager->branch_code,
                    'total_accounts' => 150,
                    'active_accounts' => 140
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving accounts: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve accounts',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get account balance
     */
    public function getAccountBalance(Request $request, string $account): JsonResponse
    {
        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_viewed_account_balance',
                    'account_number' => $account
                ])
                ->log('Manager viewed account balance');

            return response()->json([
                'success' => true,
                'message' => 'Account balance retrieved successfully',
                'data' => [
                    'account_number' => $account,
                    'available_balance' => 50000.00,
                    'ledger_balance' => 52000.00,
                    'pending_transactions' => 2000.00,
                    'currency' => 'PHP',
                    'last_transaction_date' => now()->subDays(1),
                    'account_status' => 'active',
                    'branch_code' => $manager->branch_code
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving account balance: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve account balance',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Approve transfer
     */
    public function approveTransfer(Request $request): JsonResponse
    {
        $this->authorize('approve transfers');

        $request->validate([
            'transfer_id' => 'required|string',
            'comments' => 'nullable|string|max:500'
        ]);

        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_approved_transfer',
                    'transfer_id' => $request->transfer_id,
                    'comments' => $request->comments
                ])
                ->log('Manager approved transfer');

            return response()->json([
                'success' => true,
                'message' => 'Transfer approved successfully',
                'data' => [
                    'transfer_id' => $request->transfer_id,
                    'status' => 'approved',
                    'approved_by' => $manager->name,
                    'approved_at' => now(),
                    'comments' => $request->comments
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error approving transfer: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve transfer',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Generate account statement
     */
    public function generateStatement(Request $request, string $account): JsonResponse
    {
        $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'format' => 'nullable|in:pdf,excel,csv'
        ]);

        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_generated_statement',
                    'account_number' => $account,
                    'from_date' => $request->from_date,
                    'to_date' => $request->to_date,
                    'format' => $request->format ?? 'pdf'
                ])
                ->log('Manager generated account statement');

            return response()->json([
                'success' => true,
                'message' => 'Statement generated successfully',
                'data' => [
                    'statement_id' => 'STMT-MGR-' . Str::random(10),
                    'account_number' => $account,
                    'period' => [
                        'from' => $request->from_date ?? now()->subDays(30)->format('Y-m-d'),
                        'to' => $request->to_date ?? now()->format('Y-m-d')
                    ],
                    'format' => $request->format ?? 'pdf',
                    'download_url' => '/api/manager/statements/download/STMT-MGR-' . Str::random(10),
                    'expires_at' => now()->addHours(24),
                    'generated_by' => $manager->name
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error generating statement: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate statement',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // CUSTOMER MANAGEMENT METHODS
    // =============================================

    /**
     * Get customers
     */
    public function getCustomers(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $request->validate([
                'status' => 'nullable|in:active,inactive,pending_verification,suspended',
                'search' => 'nullable|string|max:100',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            // Placeholder data
            $customers = [
                [
                    'id' => 1,
                    'name' => 'John Doe',
                    'email' => 'john@example.com',
                    'phone' => '+63912345678',
                    'account_numbers' => ['1234567890', '0987654321'],
                    'status' => 'active',
                    'branch_code' => $manager->branch_code,
                    'kyc_status' => 'verified',
                    'created_at' => now()->subMonths(6),
                    'last_activity' => now()->subDays(2)
                ]
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_customers', 'filters' => $request->all()])
                ->log('Manager viewed customers');

            return response()->json([
                'success' => true,
                'message' => 'Customers retrieved successfully',
                'data' => [
                    'customers' => $customers,
                    'pagination' => [
                        'total' => count($customers),
                        'per_page' => $request->per_page ?? 20,
                        'current_page' => 1
                    ]
                ],
                'meta' => [
                    'branch_scope' => $manager->branch_code,
                    'total_customers' => 300,
                    'pending_verification' => 5
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving customers: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve customers',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update customer
     */
    public function updateCustomer(Request $request, string $customer): JsonResponse
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'email' => 'nullable|email|max:255',
            'status' => 'nullable|in:active,inactive,suspended'
        ]);

        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_updated_customer',
                    'customer_id' => $customer,
                    'updated_fields' => array_keys($request->only(['name', 'phone', 'address', 'email', 'status']))
                ])
                ->log('Manager updated customer information');

            return response()->json([
                'success' => true,
                'message' => 'Customer updated successfully',
                'data' => [
                    'customer_id' => $customer,
                    'updated_at' => now(),
                    'updated_by' => $manager->name,
                    'requires_compliance_review' => true
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error updating customer: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update customer',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Verify customer
     */
    public function verifyCustomer(Request $request, string $customer): JsonResponse
    {
        $this->authorize('verify customers');

        $request->validate([
            'verification_type' => 'required|in:identity,address,income,kyc_complete',
            'documents_reviewed' => 'required|array',
            'documents_reviewed.*' => 'string',
            'comments' => 'nullable|string|max:500'
        ]);

        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_verified_customer',
                    'customer_id' => $customer,
                    'verification_type' => $request->verification_type,
                    'documents_reviewed' => $request->documents_reviewed,
                    'comments' => $request->comments
                ])
                ->log('Manager verified customer');

            return response()->json([
                'success' => true,
                'message' => 'Customer verification completed successfully',
                'data' => [
                    'customer_id' => $customer,
                    'verification_type' => $request->verification_type,
                    'verified_by' => $manager->name,
                    'verified_at' => now(),
                    'status' => 'verified',
                    'comments' => $request->comments
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error verifying customer: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify customer',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Approve customer application
     */
    public function approveCustomerApplication(Request $request, string $customer): JsonResponse
    {
        $this->authorize('approve customer applications');

        $request->validate([
            'account_type' => 'required|in:savings,checking,time_deposit',
            'initial_deposit' => 'required|numeric|min:500',
            'comments' => 'nullable|string|max:500'
        ]);

        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_approved_customer_application',
                    'customer_id' => $customer,
                    'account_type' => $request->account_type,
                    'initial_deposit' => $request->initial_deposit,
                    'comments' => $request->comments
                ])
                ->log('Manager approved customer application');

            return response()->json([
                'success' => true,
                'message' => 'Customer application approved successfully',
                'data' => [
                    'customer_id' => $customer,
                    'account_type' => $request->account_type,
                    'account_number' => '12345' . str_pad(rand(0, 99999), 5, '0', STR_PAD_LEFT),
                    'initial_deposit' => $request->initial_deposit,
                    'approved_by' => $manager->name,
                    'approved_at' => now(),
                    'status' => 'approved',
                    'next_step' => 'account_creation'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error approving customer application: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve customer application',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // REPORT GENERATION METHODS
    // =============================================

    /**
     * Get available reports
     */
    public function getReports(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $availableReports = [
                [
                    'type' => 'daily_transactions',
                    'name' => 'Daily Transaction Report',
                    'description' => 'Summary of all transactions for a specific day',
                    'can_generate' => true,
                    'formats' => ['pdf', 'excel', 'csv']
                ],
                [
                    'type' => 'account_summary',
                    'name' => 'Account Summary Report',
                    'description' => 'Summary of all accounts in branch',
                    'can_generate' => true,
                    'formats' => ['pdf', 'excel']
                ],
                [
                    'type' => 'pending_approvals',
                    'name' => 'Pending Approvals Report',
                    'description' => 'List of all pending transactions and applications',
                    'can_generate' => true,
                    'formats' => ['pdf', 'excel']
                ]
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_reports'])
                ->log('Manager viewed available reports');

            return response()->json([
                'success' => true,
                'message' => 'Available reports retrieved successfully',
                'data' => [
                    'available_reports' => $availableReports,
                    'user_permissions' => [
                        'can_view_reports' => true,
                        'can_generate_reports' => true,
                        'can_export_reports' => true,
                        'can_schedule_reports' => false
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving reports: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve reports',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Generate report
     */
    public function generateReport(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:daily_transactions,account_summary,pending_approvals,branch_performance',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'format' => 'nullable|in:pdf,excel,csv',
            'include_details' => 'boolean'
        ]);

        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_generated_report',
                    'report_type' => $request->type,
                    'date_range' => [
                        'from' => $request->from_date,
                        'to' => $request->to_date
                    ],
                    'format' => $request->format ?? 'pdf'
                ])
                ->log('Manager generated report');

            return response()->json([
                'success' => true,
                'message' => 'Report generated successfully',
                'data' => [
                    'report_id' => 'MGR-RPT-' . Str::random(10),
                    'type' => $request->type,
                    'period' => [
                        'from' => $request->from_date,
                        'to' => $request->to_date
                    ],
                    'format' => $request->format ?? 'pdf',
                    'download_url' => '/api/manager/reports/download/MGR-RPT-' . Str::random(10),
                    'generated_at' => now(),
                    'generated_by' => $manager->name,
                    'expires_at' => now()->addHours(48),
                    'branch_scope' => $manager->branch_code
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error generating report: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get financial reports
     */
    public function getFinancialReports(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $request->validate([
                'period' => 'nullable|in:daily,weekly,monthly,quarterly',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from'
            ]);

            $financialReports = [
                [
                    'type' => 'cash_position',
                    'name' => 'Cash Position Report',
                    'data' => [
                        'opening_balance' => 1000000.00,
                        'total_deposits' => 500000.00,
                        'total_withdrawals' => 300000.00,
                        'closing_balance' => 1200000.00,
                        'currency' => 'PHP'
                    ]
                ],
                [
                    'type' => 'transaction_volume',
                    'name' => 'Transaction Volume Report',
                    'data' => [
                        'total_transactions' => 150,
                        'deposit_count' => 75,
                        'withdrawal_count' => 60,
                        'transfer_count' => 15,
                        'average_transaction_amount' => 25000.00
                    ]
                ]
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_financial_reports', 'filters' => $request->all()])
                ->log('Manager viewed financial reports');

            return response()->json([
                'success' => true,
                'message' => 'Financial reports retrieved successfully',
                'data' => [
                    'reports' => $financialReports,
                    'period' => $request->period ?? 'daily',
                    'branch_code' => $manager->branch_code,
                    'generated_at' => now()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving financial reports: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve financial reports',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // BRANCH OPERATIONS METHODS
    // =============================================

    /**
     * Get branch operations
     */
    public function getBranchOperations(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $branchOperations = [
                'branch_code' => $manager->branch_code,
                'operating_status' => 'operational',
                'staff_count' => 12,
                'active_tellers' => 6,
                'cash_limit_status' => 'within_limits',
                'daily_transaction_count' => 245,
                'pending_approvals' => 8,
                'system_alerts' => 2,
                'last_updated' => now()
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_branch_operations'])
                ->log('Manager viewed branch operations');

            return response()->json([
                'success' => true,
                'message' => 'Branch operations retrieved successfully',
                'data' => $branchOperations
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving branch operations: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve branch operations',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get branch reports
     */
    public function getBranchReports(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $request->validate([
                'period' => 'nullable|in:daily,weekly,monthly',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from'
            ]);

            $branchReports = [
                'branch_code' => $manager->branch_code,
                'performance_metrics' => [
                    'transaction_volume' => 245,
                    'customer_satisfaction' => 4.2,
                    'processing_time_avg' => 3.5,
                    'error_rate' => 0.02
                ],
                'financial_summary' => [
                    'total_deposits' => 2500000.00,
                    'total_withdrawals' => 1800000.00,
                    'net_cash_flow' => 700000.00,
                    'currency' => 'PHP'
                ],
                'operational_metrics' => [
                    'staff_utilization' => 85,
                    'system_uptime' => 99.8,
                    'queue_wait_time_avg' => 4.2
                ]
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_branch_reports', 'filters' => $request->all()])
                ->log('Manager viewed branch reports');

            return response()->json([
                'success' => true,
                'message' => 'Branch reports retrieved successfully',
                'data' => $branchReports
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving branch reports: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve branch reports',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Approve branch transaction
     */
    public function approveBranchTransaction(Request $request, string $transaction): JsonResponse
    {
        $this->authorize('approve branch transactions');

        $request->validate([
            'approval_level' => 'required|in:manager,senior_manager',
            'comments' => 'nullable|string|max:500'
        ]);

        try {
            $manager = auth()->user();

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_approved_branch_transaction',
                    'transaction_id' => $transaction,
                    'approval_level' => $request->approval_level,
                    'comments' => $request->comments
                ])
                ->log('Manager approved branch transaction');

            return response()->json([
                'success' => true,
                'message' => 'Branch transaction approved successfully',
                'data' => [
                    'transaction_id' => $transaction,
                    'approval_level' => $request->approval_level,
                    'approved_by' => $manager->name,
                    'approved_at' => now(),
                    'branch_code' => $manager->branch_code,
                    'comments' => $request->comments
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error approving branch transaction: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve branch transaction',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // =============================================
    // AUDIT AND COMPLIANCE METHODS
    // =============================================

    /**
     * Get audit logs (limited scope for managers)
     */
    public function getAuditLogs(Request $request): JsonResponse
    {
        $this->authorize('view audit logs');

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'user_id' => 'nullable|exists:users,id',
            'event' => 'nullable|string',
            'per_page' => 'nullable|integer|min:1|max:100'
        ]);

        try {
            $manager = auth()->user();

            $query = Activity::with(['causer', 'subject'])
                ->orderBy('created_at', 'desc');

            // Managers can only view logs from their branch
            if (!$manager->hasRole('admin')) {
                $query->whereHas('causer', function ($q) use ($manager) {
                    $q->where('branch_code', $manager->branch_code);
                });
            }

            if ($request->filled('date_from')) {
                $query->where('created_at', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->where('created_at', '<=', $request->date_to);
            }

            if ($request->filled('user_id')) {
                $query->where('causer_id', $request->user_id);
            }

            if ($request->filled('event')) {
                $query->where('description', 'like', "%{$request->event}%");
            }

            $logs = $query->paginate($request->per_page ?? 50);

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_viewed_audit_logs',
                    'filters' => $request->all(),
                    'branch_scope' => $manager->branch_code
                ])
                ->log('Manager viewed audit logs');

            return response()->json([
                'success' => true,
                'message' => 'Audit logs retrieved successfully',
                'data' => $logs,
                'meta' => [
                    'branch_scope' => $manager->branch_code,
                    'access_level' => 'manager'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving audit logs: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve audit logs',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get compliance reports
     */
    public function getComplianceReports(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $complianceReports = [
                [
                    'type' => 'daily_compliance_check',
                    'name' => 'Daily Compliance Check',
                    'status' => 'compliant',
                    'last_check' => now()->subHours(2),
                    'issues_found' => 0,
                    'branch_code' => $manager->branch_code
                ],
                [
                    'type' => 'transaction_monitoring',
                    'name' => 'Transaction Monitoring Report',
                    'status' => 'review_required',
                    'last_check' => now()->subHours(1),
                    'issues_found' => 2,
                    'branch_code' => $manager->branch_code
                ]
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_compliance_reports'])
                ->log('Manager viewed compliance reports');

            return response()->json([
                'success' => true,
                'message' => 'Compliance reports retrieved successfully',
                'data' => [
                    'reports' => $complianceReports,
                    'branch_scope' => $manager->branch_code,
                    'overall_status' => 'review_required'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving compliance reports: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve compliance reports',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get risk assessments
     */
    public function getRiskAssessments(Request $request): JsonResponse
    {
        try {
            $manager = auth()->user();

            $riskAssessments = [
                [
                    'id' => 1,
                    'type' => 'customer_risk',
                    'customer_id' => 'CUST-001',
                    'risk_level' => 'medium',
                    'score' => 65,
                    'status' => 'pending_review',
                    'created_at' => now()->subDays(1),
                    'branch_code' => $manager->branch_code,
                    'requires_manager_approval' => true
                ]
            ];

            activity()
                ->causedBy($manager)
                ->withProperties(['action' => 'manager_viewed_risk_assessments'])
                ->log('Manager viewed risk assessments');

            return response()->json([
                'success' => true,
                'message' => 'Risk assessments retrieved successfully',
                'data' => [
                    'assessments' => $riskAssessments,
                    'summary' => [
                        'total' => 1,
                        'pending_approval' => 1,
                        'high_risk' => 0,
                        'medium_risk' => 1,
                        'low_risk' => 0
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error retrieving risk assessments: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve risk assessments',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Approve risk assessment
     */
    public function approveRiskAssessment(Request $request, string $assessment): JsonResponse
    {
        $this->authorize('approve risk assessments');

        $request->validate([
            'approved' => 'required|boolean',
            'comments' => 'nullable|string|max:500',
            'override_reason' => 'nullable|string|max:500'
        ]);

        try {
            $manager = auth()->user();

            $status = $request->approved ? 'approved' : 'rejected';

            activity()
                ->causedBy($manager)
                ->withProperties([
                    'action' => 'manager_risk_assessment_decision',
                    'assessment_id' => $assessment,
                    'decision' => $status,
                    'comments' => $request->comments,
                    'override_reason' => $request->override_reason
                ])
                ->log('Manager made risk assessment decision');

            return response()->json([
                'success' => true,
                'message' => "Risk assessment {$status} successfully",
                'data' => [
                    'assessment_id' => $assessment,
                    'status' => $status,
                    'reviewed_by' => $manager->name,
                    'reviewed_at' => now(),
                    'comments' => $request->comments,
                    'override_reason' => $request->override_reason
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Manager error with risk assessment: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to process risk assessment',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}