<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDeniedPermission;
use App\Services\BSPAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
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
     * Attach the bearer token as an httpOnly cookie instead of returning it
     * in the JSON body — keeps it out of JavaScript-accessible storage.
     */
    private function attachTokenCookie(JsonResponse $response, ?string $token, ?int $minutes = null): JsonResponse
    {
        if (! $token) {
            return $response;
        }

        $minutes ??= (int) config('sanctum.expiration', 30);

        return $response->cookie(
            'digicur_token',
            $token,
            $minutes,
            '/',
            null,
            ! app()->environment(['local', 'testing']),
            true,
            true,
            'Strict'
        );
    }

    /**
     * Clear the auth cookie (logout).
     */
    private function clearTokenCookie(JsonResponse $response): JsonResponse
    {
        return $response->cookie(
            'digicur_token',
            null,
            -1,
            '/',
            null,
            ! app()->environment(['local', 'testing']),
            true,
            true,
            'Strict'
        );
    }

    /**
     * Authenticate user with BSP compliance
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $result = $this->bspAuthService->authenticate($request);
            $token = $result['token'] ?? null;
            unset($result['token']);

            $response = response()->json([
                'success' => true,
                'message' => 'Authentication successful',
                'data' => $result,
                'bsp_compliance' => [
                    'audit_logged' => true,
                    'session_timeout' => $result['session_timeout'] ?? 30,
                    'mfa_enabled' => $request->user()->two_factor_enabled ?? false,
                    'risk_assessment_passed' => true,
                ],
            ], 200);

            return $this->attachTokenCookie($response, $token, $result['session_timeout'] ?? null);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication failed',
                'errors' => $e->errors(),
                'bsp_compliance' => [
                    'audit_logged' => true,
                    'failed_attempt_logged' => true,
                    'rate_limiting_applied' => true,
                ],
            ], 422);
        }
    }

    /**
     * Handle two-factor authentication verification (step 2 of login)
     */
    public function verifyTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'temporary_token' => 'required|string',
            'otp_code' => 'required|string|size:6',
        ]);

        $userId = Cache::get("temp_2fa_token_{$request->temporary_token}");

        if (! $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Verification session expired. Please log in again.',
                'errors' => ['temporary_token' => ['Session expired.']],
            ], 422);
        }

        $user = User::find($userId);

        if (! $user || ! $user->two_factor_enabled || ! $user->two_factor_secret) {
            return response()->json([
                'success' => false,
                'message' => 'Two-factor authentication is not properly configured.',
            ], 422);
        }

        $secret = decrypt($user->two_factor_secret);

        if (! $this->bspAuthService->verifyTOTP($secret, $request->otp_code)) {
            $user->incrementFailedLoginAttempts();

            return response()->json([
                'success' => false,
                'message' => 'Invalid two-factor authentication code.',
                'errors' => ['otp_code' => ['Invalid code. Please check your authenticator app.']],
                'bsp_compliance' => ['mfa_failed' => true, 'audit_logged' => true],
            ], 422);
        }

        Cache::forget("temp_2fa_token_{$request->temporary_token}");

        $result = $this->bspAuthService->completeAuthentication($user, $request);
        $token = $result['token'] ?? null;
        unset($result['token']);

        $response = response()->json([
            'success' => true,
            'message' => 'Two-factor authentication successful.',
            'data' => $result,
            'bsp_compliance' => ['mfa_verified' => true, 'audit_logged' => true],
        ], 200);

        return $this->attachTokenCookie($response, $token, $result['session_timeout'] ?? null);
    }

    /**
     * Complete forced first-time 2FA enrollment during login.
     * Verifies the OTP, saves 2FA to the user, then issues the auth token.
     */
    public function setupTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'temporary_token' => 'required|string',
            'otp_code' => 'required|string|size:6',
        ]);

        $cached = Cache::get("setup_2fa_token_{$request->temporary_token}");

        if (! $cached) {
            return response()->json([
                'success' => false,
                'message' => 'Setup session expired. Please log in again.',
                'errors' => ['temporary_token' => ['Session expired.']],
            ], 422);
        }

        $user = User::find($cached['user_id']);

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'User not found.'], 422);
        }

        if (! $this->bspAuthService->verifyTOTP($cached['secret'], $request->otp_code)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification code.',
                'errors' => ['otp_code' => ['Code does not match. Check your authenticator app and try again.']],
            ], 422);
        }

        $user->update([
            'two_factor_enabled' => true,
            'two_factor_secret' => encrypt($cached['secret']),
        ]);

        Cache::forget("setup_2fa_token_{$request->temporary_token}");

        activity()->causedBy($user)->log('Two-factor authentication enrolled (system-required)');

        $result = $this->bspAuthService->completeAuthentication($user, $request);
        $token = $result['token'] ?? null;
        unset($result['token']);

        $response = response()->json([
            'success' => true,
            'message' => 'Two-factor authentication enrolled. Welcome!',
            'data' => $result,
            'bsp_compliance' => ['mfa_enrolled' => true, 'mfa_verified' => true, 'audit_logged' => true],
        ], 200);

        return $this->attachTokenCookie($response, $token, $result['session_timeout'] ?? null);
    }

    /**
     * Complete a forced password change (step 2 for 'password_change_required').
     * Runs before any 2FA step so a user is never asked to bind an
     * authenticator app to a password they're about to replace.
     */
    public function forcePasswordChange(Request $request): JsonResponse
    {
        $request->validate([
            'temporary_token' => 'required|string',
            'current_password' => 'required|string',
            'new_password' => 'required|string|confirmed',
        ]);

        $user = $this->bspAuthService->resolveForcePasswordChangeToken($request->temporary_token);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Verification session expired. Please log in again.',
                'errors' => ['temporary_token' => ['Session expired.']],
            ], 422);
        }

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
                'errors' => ['current_password' => ['Current password is incorrect']],
            ], 422);
        }

        $passwordErrors = $this->bspAuthService->validatePasswordComplexity($request->new_password);
        if (! empty($passwordErrors)) {
            return response()->json([
                'success' => false,
                'message' => 'New password does not meet BSP complexity requirements',
                'errors' => ['new_password' => $passwordErrors],
                'bsp_compliance' => ['password_policy_enforced' => true],
            ], 422);
        }

        if (Hash::check($request->new_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'New password must be different from current password',
                'errors' => ['new_password' => ['New password must be different from current password']],
            ], 422);
        }

        $result = $this->bspAuthService->completeForcedPasswordChange(
            $user,
            $request->temporary_token,
            $request->new_password,
            $request
        );
        $token = $result['token'] ?? null;
        unset($result['token']);

        activity()->causedBy($user)->log('Password changed (forced, before 2FA)');

        $response = response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
            'data' => $result,
            'bsp_compliance' => ['audit_logged' => true, 'password_policy_enforced' => true],
        ], 200);

        return $this->attachTokenCookie($response, $token, $result['session_timeout'] ?? null);
    }

    /**
     * Complete login for a user who was shown a fresh recovery code
     * (step 2 for 'recovery_code_issued'). No code re-entry needed —
     * this just confirms they acknowledged saving it.
     */
    public function confirmRecoveryCode(Request $request): JsonResponse
    {
        $request->validate([
            'temporary_token' => 'required|string',
        ]);

        $userId = Cache::get("confirm_recovery_token_{$request->temporary_token}");

        if (! $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Verification session expired. Please log in again.',
                'errors' => ['temporary_token' => ['Session expired.']],
            ], 422);
        }

        $user = User::find($userId);

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'User not found.'], 422);
        }

        Cache::forget("confirm_recovery_token_{$request->temporary_token}");
        Cache::forget("pending_recovery_code_{$user->id}");

        activity()->causedBy($user)->log('Recovery code acknowledged by user');

        $result = $this->bspAuthService->completeAuthentication($user, $request);
        $token = $result['token'] ?? null;
        unset($result['token']);

        $response = response()->json([
            'success' => true,
            'message' => 'Recovery code saved. Welcome!',
            'data' => $result,
            'bsp_compliance' => ['audit_logged' => true],
        ], 200);

        return $this->attachTokenCookie($response, $token, $result['session_timeout'] ?? null);
    }

    /**
     * Complete login for a user entering their recovery code
     * (step 2 for 'recovery_code_required').
     */
    public function verifyRecoveryCode(Request $request): JsonResponse
    {
        $request->validate([
            'temporary_token' => 'required|string',
            'recovery_code' => 'required|string',
        ]);

        $userId = Cache::get("verify_recovery_token_{$request->temporary_token}");

        if (! $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Verification session expired. Please log in again.',
                'errors' => ['temporary_token' => ['Session expired.']],
            ], 422);
        }

        $user = User::find($userId);

        if (! $user || ! $user->recovery_code_hash) {
            return response()->json([
                'success' => false,
                'message' => 'Recovery code is not configured for this account.',
            ], 422);
        }

        if (! Hash::check($request->recovery_code, $user->recovery_code_hash)) {
            $user->incrementFailedLoginAttempts();

            return response()->json([
                'success' => false,
                'message' => 'Invalid recovery code.',
                'errors' => ['recovery_code' => ['Invalid recovery code.']],
                'bsp_compliance' => ['mfa_failed' => true, 'audit_logged' => true],
            ], 422);
        }

        Cache::forget("verify_recovery_token_{$request->temporary_token}");

        $result = $this->bspAuthService->completeAuthentication($user, $request);
        $token = $result['token'] ?? null;
        unset($result['token']);

        $response = response()->json([
            'success' => true,
            'message' => 'Signed in successfully.',
            'data' => $result,
            'bsp_compliance' => ['mfa_verified' => true, 'audit_logged' => true],
        ], 200);

        return $this->attachTokenCookie($response, $token, $result['session_timeout'] ?? null);
    }

    /**
     * Register new user (admin only with BSP compliance)
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
            'roles.*' => 'exists:roles,name',
        ]);

        // Validate password complexity
        $passwordErrors = $this->bspAuthService->validatePasswordComplexity($request->password);
        if (! empty($passwordErrors)) {
            return response()->json([
                'success' => false,
                'message' => 'Password does not meet BSP complexity requirements',
                'errors' => ['password' => $passwordErrors],
                'bsp_compliance' => [
                    'password_policy_enforced' => true,
                ],
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
                'force_password_change' => true, // Force change on first login
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
                    'force_password_change' => $user->force_password_change,
                ],
                'bsp_compliance' => [
                    'password_policy_enforced' => true,
                    'role_based_access_assigned' => true,
                    'audit_logged' => true,
                    'password_expiry_set' => true,
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'User registration failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current authenticated user information
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['roles.permissions', 'branch']);

        $denied = UserDeniedPermission::where('user_id', $user->id)
            ->pluck('permission_name')
            ->toArray();

        $effective = $user->getAllPermissions()
            ->pluck('name')
            ->reject(fn ($p) => in_array($p, $denied))
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'permissions' => $effective,
                'direct_permissions' => $user->getDirectPermissions()->pluck('name'),
                'roles' => $user->roles->pluck('name'),
                'session_timeout' => (int) Cache::get('system_setting_session_timeout', 30),
                'session_info' => [
                    'last_login_at' => $user->last_login_at,
                    'last_login_ip' => $user->last_login_ip,
                    'session_expires_at' => $user->session_expires_at,
                    'password_expires_at' => $user->password_expires_at,
                    'account_expires_at' => $user->account_expires_at,
                    'two_factor_enabled' => $user->two_factor_enabled,
                ],
            ],
            'bsp_compliance' => [
                'session_tracked' => true,
                'audit_logged' => true,
            ],
        ]);
    }

    /**
     * Logout user and revoke tokens
     */
    public function logout(Request $request): JsonResponse
    {
        $this->bspAuthService->logout($request);

        $response = response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
            'bsp_compliance' => [
                'session_terminated' => true,
                'tokens_revoked' => true,
                'audit_logged' => true,
            ],
        ]);

        return $this->clearTokenCookie($response);
    }

    /**
     * Change password with BSP compliance
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => [
                'required',
                'string',
                'confirmed',
                Password::min(12)->letters()->mixedCase()->numbers()->symbols()->uncompromised(),
            ],
        ]);

        $user = $request->user();

        // Verify current password
        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
                'errors' => ['current_password' => ['Current password is incorrect']],
            ], 422);
        }

        // Validate new password complexity
        $passwordErrors = $this->bspAuthService->validatePasswordComplexity($request->new_password);
        if (! empty($passwordErrors)) {
            return response()->json([
                'success' => false,
                'message' => 'New password does not meet BSP complexity requirements',
                'errors' => ['new_password' => $passwordErrors],
                'bsp_compliance' => [
                    'password_policy_enforced' => true,
                ],
            ], 422);
        }

        // Check if new password is different from current
        if (Hash::check($request->new_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'New password must be different from current password',
                'errors' => ['new_password' => ['New password must be different from current password']],
            ], 422);
        }

        // Update password with configurable expiry
        $expiryDays = BSPAuthService::getPasswordExpiryDays();
        $user->update([
            'password' => Hash::make($request->new_password),
            'password_changed_at' => now(),
            'password_expires_at' => $expiryDays > 0 ? now()->addDays($expiryDays) : null,
            'force_password_change' => false,
        ]);

        // Log password change
        activity()
            ->causedBy($user)
            ->log('Password changed successfully');

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
            'data' => [
                'password_expires_at' => $user->password_expires_at,
            ],
            'bsp_compliance' => [
                'password_policy_enforced' => true,
                'password_expiry_updated' => true,
                'audit_logged' => true,
            ],
        ]);
    }

    /**
     * Begin 2FA setup: generate a TOTP secret and return the QR code URL.
     * The user must then confirm with a valid code via confirmTwoFactor().
     */
    public function enableTwoFactor(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->two_factor_enabled) {
            return response()->json([
                'success' => false,
                'message' => 'Two-factor authentication is already enabled. Disable it first to reconfigure.',
            ], 422);
        }

        $secret = $this->bspAuthService->generateBase32Secret();

        // Store pending secret for up to 10 minutes while user scans QR code
        Cache::put("pending_2fa_secret_{$user->id}", $secret, now()->addMinutes(10));

        $issuer = 'DIGICUR';
        $account = urlencode($user->email);
        $otpauthUrl = "otpauth://totp/{$issuer}:{$account}?secret={$secret}&issuer={$issuer}&algorithm=SHA1&digits=6&period=30";
        $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='.urlencode($otpauthUrl);

        return response()->json([
            'success' => true,
            'message' => 'Scan the QR code with your authenticator app, then confirm with a 6-digit code.',
            'data' => [
                'secret' => $secret,
                'qr_code_url' => $qrCodeUrl,
                'otpauth_url' => $otpauthUrl,
            ],
        ]);
    }

    /**
     * Confirm 2FA setup by verifying the first TOTP code from the authenticator app.
     */
    public function confirmTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'otp_code' => 'required|string|size:6',
        ]);

        $user = $request->user();
        $pendingSecret = Cache::get("pending_2fa_secret_{$user->id}");

        if (! $pendingSecret) {
            return response()->json([
                'success' => false,
                'message' => 'No pending 2FA setup found. Please start setup again.',
                'errors' => ['otp_code' => ['Setup session expired. Please try again.']],
            ], 422);
        }

        if (! $this->bspAuthService->verifyTOTP($pendingSecret, $request->otp_code)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification code.',
                'errors' => ['otp_code' => ['Code does not match. Check your authenticator app and try again.']],
            ], 422);
        }

        $user->update([
            'two_factor_enabled' => true,
            'two_factor_secret' => encrypt($pendingSecret),
        ]);

        Cache::forget("pending_2fa_secret_{$user->id}");

        activity()->causedBy($user)->log('Two-factor authentication enabled');

        return response()->json([
            'success' => true,
            'message' => 'Two-factor authentication has been enabled successfully.',
            'bsp_compliance' => ['mfa_enabled' => true, 'audit_logged' => true],
        ]);
    }

    /**
     * Disable two-factor authentication (requires password + current OTP code).
     */
    public function disableTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'required|string',
            'otp_code' => 'required|string|size:6',
        ]);

        $user = $request->user();

        if (! $user->two_factor_enabled || ! $user->two_factor_secret) {
            return response()->json([
                'success' => false,
                'message' => 'Two-factor authentication is not currently enabled.',
            ], 422);
        }

        if (! Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password verification failed.',
                'errors' => ['password' => ['Incorrect password.']],
            ], 422);
        }

        $secret = decrypt($user->two_factor_secret);

        if (! $this->bspAuthService->verifyTOTP($secret, $request->otp_code)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid authenticator code.',
                'errors' => ['otp_code' => ['The code does not match. Please try again.']],
            ], 422);
        }

        $user->update([
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
        ]);

        activity()->causedBy($user)->log('Two-factor authentication disabled');

        return response()->json([
            'success' => true,
            'message' => 'Two-factor authentication has been disabled.',
            'bsp_compliance' => ['mfa_disabled' => true, 'audit_logged' => true],
        ]);
    }

    /**
     * Refresh the current token, issuing a new one and revoking the old
     */
    public function refreshToken(Request $request): JsonResponse
    {
        $user = $request->user();
        $minutes = (int) config('sanctum.expiration', 30);

        // Revoke current token
        $request->user()->currentAccessToken()->delete();

        // Issue new token
        $token = $user->createToken(
            'auth-token',
            ['*'],
            now()->addMinutes($minutes)
        );

        $user->update([
            'session_expires_at' => now()->addMinutes($minutes),
        ]);

        activity()
            ->causedBy($user)
            ->log('Token refreshed');

        $response = response()->json([
            'success' => true,
            'data' => [
                'expires_at' => $token->accessToken->expires_at,
            ],
        ]);

        return $this->attachTokenCookie($response, $token->plainTextToken, $minutes);
    }

    /**
     * Get active sessions
     */
    public function activeSessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $sessions = cache()->get("user_sessions_{$user->id}", []);

        $formattedSessions = collect($sessions)->map(function ($session, $token) {
            return [
                'token_preview' => substr($token, 0, 8).'...',
                'ip_address' => $session['ip'],
                'user_agent' => $session['user_agent'],
                'created_at' => $session['created_at'],
                'last_activity' => $session['last_activity'],
                'is_current' => $token === request()->bearerToken(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'sessions' => $formattedSessions,
                'total_sessions' => count($sessions),
                'max_allowed' => BSPAuthService::MAX_CONCURRENT_SESSIONS,
            ],
            'bsp_compliance' => [
                'session_monitoring' => true,
                'concurrent_session_limit' => BSPAuthService::MAX_CONCURRENT_SESSIONS,
            ],
        ]);
    }
}
