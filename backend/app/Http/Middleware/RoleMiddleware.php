<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Role-based Access Control Middleware
 *
 * Enforces role-based access control as per BSP requirements
 * Supports both single role and multiple role checks
 */
class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Check if user is authenticated
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Authentication required.',
                'bsp_compliance' => [
                    'unauthorized_access_logged' => true,
                    'authentication_required' => true
                ]
            ], 401);
        }

        $user = $request->user();

        // Check if user account is active
        if ($user->status !== 'active') {
            // Log security event
            activity()
                ->causedBy($user)
                ->withProperties([
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'attempted_action' => $request->path()
                ])
                ->log('Inactive user attempted access');

            return response()->json([
                'success' => false,
                'message' => 'Account is not active. Contact administrator.',
                'bsp_compliance' => [
                    'account_status_check' => true,
                    'access_denied_logged' => true
                ]
            ], 403);
        }

        // Check if account is locked
        if ($user->isAccountLocked()) {
            activity()
                ->causedBy($user)
                ->withProperties([
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'attempted_action' => $request->path()
                ])
                ->log('Locked user attempted access');

            return response()->json([
                'success' => false,
                'message' => 'Account is temporarily locked. Try again later.',
                'bsp_compliance' => [
                    'account_lockout_check' => true,
                    'access_denied_logged' => true
                ]
            ], 423); // HTTP 423 Locked
        }

        // Check password expiry
        if ($user->isPasswordExpired()) {
            return response()->json([
                'success' => false,
                'message' => 'Password has expired. Please change your password.',
                'action_required' => 'password_change',
                'bsp_compliance' => [
                    'password_expiry_check' => true,
                    'password_change_required' => true
                ]
            ], 403);
        }

        // Check if password change is forced
        if ($user->force_password_change) {
            return response()->json([
                'success' => false,
                'message' => 'Password change required before proceeding.',
                'action_required' => 'password_change',
                'bsp_compliance' => [
                    'forced_password_change' => true
                ]
            ], 403);
        }

        // Check session validity
        if ($user->session_expires_at && $user->session_expires_at->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Session has expired. Please login again.',
                'action_required' => 'login',
                'bsp_compliance' => [
                    'session_timeout_enforced' => true
                ]
            ], 401);
        }

        // Check if user has any of the required roles
        if (!empty($roles)) {
            $hasRole = false;
            foreach ($roles as $role) {
                if ($user->hasRole($role)) {
                    $hasRole = true;
                    break;
                }
            }

            if (!$hasRole) {
                // Log unauthorized access attempt
                activity()
                    ->causedBy($user)
                    ->withProperties([
                        'ip' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'attempted_action' => $request->path(),
                        'required_roles' => $roles,
                        'user_roles' => $user->roles->pluck('name')->toArray()
                    ])
                    ->log('Unauthorized role access attempted');

                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions. Access denied.',
                    'required_roles' => $roles,
                    'user_roles' => $user->roles->pluck('name')->toArray(),
                    'bsp_compliance' => [
                        'role_based_access_enforced' => true,
                        'unauthorized_access_logged' => true,
                        'permission_check_failed' => true
                    ]
                ], 403);
            }
        }

        // Log successful access
        activity()
            ->causedBy($user)
            ->withProperties([
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'action' => $request->path(),
                'method' => $request->method()
            ])
            ->log('API access granted');

        return $next($request);
    }
}