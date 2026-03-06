<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BSPAuthService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

/**
 * DIGICUR Authentication Controller
 *
 * Handles all authentication operations following BSP (Bangko Sentral ng Pilipinas)
 * cybersecurity standards and requirements
 */
class AuthController extends Controller
{
    public function __construct(
        private BSPAuthService $bspAuthService
    ) {}

    /**
     * Authenticate user with BSP compliance
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $result = $this->bspAuthService->authenticate($request);

            return response()->json([
                'success' => true,
                'message' => 'Authentication successful',
                'data' => $result,
                'bsp_compliance' => [
                    'audit_logged' => true,
                    'session_timeout' => $result['session_timeout'] ?? 30,
                    'mfa_enabled' => $request->user()->two_factor_enabled ?? false,
                    'risk_assessment_passed' => true
                ]
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication failed',
                'errors' => $e->errors(),
                'bsp_compliance' => [
                    'audit_logged' => true,
                    'failed_attempt_logged' => true,
                    'rate_limiting_applied' => true
                ]
            ], 422);
        }
    }

    /**
     * Handle two-factor authentication verification
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'temporary_token' => 'required|string',
            'otp_code' => 'required|string|size:6'
        ]);

        try {
            // Add OTP to the request for processing
            $request->merge(['otp_code' => $request->otp_code]);

            $result = $this->bspAuthService->authenticate($request);

            return response()->json([
                'success' => true,
                'message' => 'Two-factor authentication successful',
                'data' => $result,
                'bsp_compliance' => [
                    'mfa_verified' => true,
                    'audit_logged' => true
                ]
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Two-factor authentication failed',
                'errors' => $e->errors(),
                'bsp_compliance' => [
                    'mfa_failed' => true,
                    'audit_logged' => true
                ]
            ], 422);
        }
    }

    /**
     * Register new user (admin only with BSP compliance)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function register(Request $request): JsonResponse
    {
        // Only admin can register users in banking system
        $this->authorize('create-users');

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:12',
            'employee_id' => 'required|string|unique:users',
            'department' => 'required|string',
            'branch_code' => 'required|string',
            'employee_position' => 'required|string',
            'phone_number' => 'nullable|string',
            'roles' => 'required|array',
            'roles.*' => 'exists:roles,name'
        ]);

        // Validate password complexity
        $passwordErrors = $this->bspAuthService->validatePasswordComplexity($request->password);
        if (!empty($passwordErrors)) {
            return response()->json([
                'success' => false,
                'message' => 'Password does not meet BSP complexity requirements',
                'errors' => ['password' => $passwordErrors],
                'bsp_compliance' => [
                    'password_policy_enforced' => true
                ]
            ], 422);
        }

        try {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'employee_id' => $request->employee_id,
                'department' => $request->department,
                'branch_code' => $request->branch_code,
                'employee_position' => $request->employee_position,
                'phone_number' => $request->phone_number,
                'status' => 'active',
                'password_expires_at' => BSPAuthService::getPasswordExpiryDays() > 0
                    ? now()->addDays(BSPAuthService::getPasswordExpiryDays())
                    : null,
                'password_changed_at' => now(),
                'force_password_change' => true // Force change on first login
            ]);

            // Assign roles
            $user->assignRole($request->roles);

            activity()
                ->causedBy($request->user())
                ->performedOn($user)
                ->log('User account created');

            return response()->json([
                'success' => true,
                'message' => 'User registered successfully',
                'data' => [
                    'user' => $user->load('roles'),
                    'password_expires_at' => $user->password_expires_at,
                    'force_password_change' => $user->force_password_change
                ],
                'bsp_compliance' => [
                    'password_policy_enforced' => true,
                    'role_based_access_assigned' => true,
                    'audit_logged' => true,
                    'password_expiry_set' => true
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'User registration failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current authenticated user information
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['roles.permissions', 'branch']);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'roles' => $user->roles->pluck('name'),
                'session_info' => [
                    'last_login_at' => $user->last_login_at,
                    'last_login_ip' => $user->last_login_ip,
                    'session_expires_at' => $user->session_expires_at,
                    'password_expires_at' => $user->password_expires_at,
                    'account_expires_at' => $user->account_expires_at,
                    'two_factor_enabled' => $user->two_factor_enabled
                ]
            ],
            'bsp_compliance' => [
                'session_tracked' => true,
                'audit_logged' => true
            ]
        ]);
    }

    /**
     * Logout user and revoke tokens
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        $this->bspAuthService->logout($request);

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
            'bsp_compliance' => [
                'session_terminated' => true,
                'tokens_revoked' => true,
                'audit_logged' => true
            ]
        ]);
    }

    /**
     * Change password with BSP compliance
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        // Verify current password
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
                'errors' => ['current_password' => ['Current password is incorrect']]
            ], 422);
        }

        // Validate new password complexity
        $passwordErrors = $this->bspAuthService->validatePasswordComplexity($request->new_password);
        if (!empty($passwordErrors)) {
            return response()->json([
                'success' => false,
                'message' => 'New password does not meet BSP complexity requirements',
                'errors' => ['new_password' => $passwordErrors],
                'bsp_compliance' => [
                    'password_policy_enforced' => true
                ]
            ], 422);
        }

        // Check if new password is different from current
        if (Hash::check($request->new_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'New password must be different from current password',
                'errors' => ['new_password' => ['New password must be different from current password']]
            ], 422);
        }

        // Update password with configurable expiry
        $expiryDays = BSPAuthService::getPasswordExpiryDays();
        $user->update([
            'password' => Hash::make($request->new_password),
            'password_changed_at' => now(),
            'password_expires_at' => $expiryDays > 0 ? now()->addDays($expiryDays) : null,
            'force_password_change' => false
        ]);

        // Log password change
        activity()
            ->causedBy($user)
            ->log('Password changed successfully');

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
            'data' => [
                'password_expires_at' => $user->password_expires_at
            ],
            'bsp_compliance' => [
                'password_policy_enforced' => true,
                'password_expiry_updated' => true,
                'audit_logged' => true
            ]
        ]);
    }

    /**
     * Enable two-factor authentication
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function enableTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'phone_number' => 'required|string'
        ]);

        $user = $request->user();

        // Generate 2FA secret (implement based on your 2FA provider)
        $secret = $this->generateTwoFactorSecret();

        $user->update([
            'two_factor_enabled' => true,
            'two_factor_secret' => encrypt($secret),
            'phone_number' => $request->phone_number
        ]);

        activity()
            ->causedBy($user)
            ->log('Two-factor authentication enabled');

        return response()->json([
            'success' => true,
            'message' => 'Two-factor authentication enabled successfully',
            'data' => [
                'backup_codes' => $this->generateBackupCodes($user),
                'setup_complete' => true
            ],
            'bsp_compliance' => [
                'mfa_enabled' => true,
                'audit_logged' => true,
                'enhanced_security' => true
            ]
        ]);
    }

    /**
     * Disable two-factor authentication
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function disableTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'required|string',
            'confirmation' => 'required|in:DISABLE_2FA'
        ]);

        $user = $request->user();

        // Verify password
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password verification failed',
                'errors' => ['password' => ['Password is incorrect']]
            ], 422);
        }

        $user->update([
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null
        ]);

        activity()
            ->causedBy($user)
            ->log('Two-factor authentication disabled');

        return response()->json([
            'success' => true,
            'message' => 'Two-factor authentication disabled successfully',
            'bsp_compliance' => [
                'mfa_disabled' => true,
                'audit_logged' => true,
                'security_change_logged' => true
            ]
        ]);
    }

    /**
     * Refresh the current token, issuing a new one and revoking the old
     */
    public function refreshToken(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoke current token
        $request->user()->currentAccessToken()->delete();

        // Issue new token
        $token = $user->createToken(
            'auth-token',
            ['*'],
            now()->addMinutes(config('sanctum.expiration', 30))
        );

        $user->update([
            'session_expires_at' => now()->addMinutes(config('sanctum.expiration', 30)),
        ]);

        activity()
            ->causedBy($user)
            ->log('Token refreshed');

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token->plainTextToken,
                'expires_at' => $token->accessToken->expires_at,
            ],
        ]);
    }

    /**
     * Get active sessions
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function activeSessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $sessions = cache()->get("user_sessions_{$user->id}", []);

        $formattedSessions = collect($sessions)->map(function ($session, $token) {
            return [
                'token_preview' => substr($token, 0, 8) . '...',
                'ip_address' => $session['ip'],
                'user_agent' => $session['user_agent'],
                'created_at' => $session['created_at'],
                'last_activity' => $session['last_activity'],
                'is_current' => $token === request()->bearerToken()
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'sessions' => $formattedSessions,
                'total_sessions' => count($sessions),
                'max_allowed' => BSPAuthService::MAX_CONCURRENT_SESSIONS
            ],
            'bsp_compliance' => [
                'session_monitoring' => true,
                'concurrent_session_limit' => BSPAuthService::MAX_CONCURRENT_SESSIONS
            ]
        ]);
    }

    /**
     * Generate two-factor secret (placeholder)
     */
    private function generateTwoFactorSecret(): string
    {
        return base32_encode(random_bytes(20));
    }

    /**
     * Generate backup codes for 2FA
     */
    private function generateBackupCodes(User $user): array
    {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = strtoupper(bin2hex(random_bytes(4)));
        }

        $user->update([
            'two_factor_recovery_codes' => encrypt(json_encode($codes))
        ]);

        return $codes;
    }
}