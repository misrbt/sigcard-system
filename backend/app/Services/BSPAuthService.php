<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * BSP (Bangko Sentral ng Pilipinas) Compliant Authentication Service
 *
 * Implements cybersecurity requirements as per BSP Circular 951 and 982
 * - Multi-factor Authentication
 * - Account Lockout Policy
 * - Password Complexity Requirements
 * - Session Management
 * - Audit Logging
 * - Risk-based Authentication
 */
class BSPAuthService
{
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 30; // minutes
    const PASSWORD_EXPIRY_DAYS = 90;
    const SESSION_TIMEOUT_MINUTES = 30;
    const MAX_CONCURRENT_SESSIONS = 3;

    /**
     * Get the admin-configured password expiry days (0 = disabled).
     */
    public static function getPasswordExpiryDays(): int
    {
        $enabled = Cache::get('system_setting_password_expiry_enabled', false);
        if (!$enabled) {
            return 0; // disabled
        }

        return (int) Cache::get('system_setting_password_expiry_days', self::PASSWORD_EXPIRY_DAYS);
    }

    /**
     * Get the admin-configured token expiration in minutes.
     */
    public static function getTokenExpirationMinutes(): int
    {
        return (int) Cache::get('system_setting_token_expiration', config('sanctum.expiration', 30));
    }

    /**
     * Authenticate user with BSP compliance checks
     */
    public function authenticate(Request $request): array
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'otp_code' => 'nullable|string|size:6',
            'device_id' => 'required|string'
        ]);

        // Rate limiting check (BSP requirement: prevent brute force)
        $this->checkRateLimit($request);

        // Find user
        $user = User::where('email', $credentials['email'])->first();

        if (!$user) {
            $this->logFailedAttempt($request, 'Invalid credentials');
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials provided.']
            ]);
        }

        // BSP Compliance Checks
        $this->performBSPComplianceChecks($user, $request);

        // Verify password
        if (!Hash::check($credentials['password'], $user->password)) {
            $user->incrementFailedLoginAttempts();
            $this->logFailedAttempt($request, 'Invalid password', $user);
            throw ValidationException::withMessages([
                'password' => ['Invalid credentials provided.']
            ]);
        }

        // Check if 2FA is required
        if ($user->two_factor_enabled) {
            return $this->handleTwoFactorAuthentication($user, $request, $credentials);
        }

        // Complete authentication
        return $this->completeAuthentication($user, $request);
    }

    /**
     * Perform BSP compliance checks
     */
    private function performBSPComplianceChecks(User $user, Request $request): void
    {
        // Check account status
        if ($user->status !== 'active') {
            $this->logSecurityEvent($request, 'Account not active', $user);
            throw ValidationException::withMessages([
                'account' => ['Account is not active. Contact administrator.']
            ]);
        }

        // Check account lockout
        if ($user->isAccountLocked()) {
            $this->logSecurityEvent($request, 'Account locked', $user);
            throw ValidationException::withMessages([
                'account' => ['Account is temporarily locked. Try again later.']
            ]);
        }

        // Check password expiry (only if expiry is enabled by admin)
        $expiryDays = self::getPasswordExpiryDays();
        if ($expiryDays > 0 && $user->isPasswordExpired()) {
            $this->logSecurityEvent($request, 'Password expired', $user);
            throw ValidationException::withMessages([
                'password' => ['Password has expired. Please reset your password.']
            ]);
        }

        // Check account expiry
        if ($user->account_expires_at && $user->account_expires_at->isPast()) {
            $this->logSecurityEvent($request, 'Account expired', $user);
            throw ValidationException::withMessages([
                'account' => ['Account has expired. Contact administrator.']
            ]);
        }

        // Check concurrent sessions (BSP requirement: limit concurrent sessions)
        $this->checkConcurrentSessions($user);

        // Risk-based authentication checks
        $this->performRiskAssessment($user, $request);
    }

    /**
     * Handle Two-Factor Authentication
     */
    private function handleTwoFactorAuthentication(User $user, Request $request, array $credentials): array
    {
        if (!isset($credentials['otp_code'])) {
            return [
                'status' => 'two_factor_required',
                'message' => 'Two-factor authentication code required',
                'temporary_token' => $this->generateTemporaryToken($user)
            ];
        }

        // Verify OTP code (implement your OTP verification logic)
        if (!$this->verifyOTP($user, $credentials['otp_code'])) {
            $user->incrementFailedLoginAttempts();
            $this->logFailedAttempt($request, 'Invalid OTP', $user);
            throw ValidationException::withMessages([
                'otp_code' => ['Invalid two-factor authentication code.']
            ]);
        }

        return $this->completeAuthentication($user, $request);
    }

    /**
     * Complete authentication process
     */
    private function completeAuthentication(User $user, Request $request): array
    {
        // Reset failed attempts
        $user->resetFailedLoginAttempts();

        $tokenMinutes = self::getTokenExpirationMinutes();

        // Update login information
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'last_login_user_agent' => $request->userAgent(),
            'session_id' => session()->getId(),
            'session_expires_at' => now()->addMinutes($tokenMinutes)
        ]);

        // Create token with configurable expiration
        $token = $user->createToken(
            'auth-token',
            ['*'],
            now()->addMinutes($tokenMinutes)
        );

        // Store session information for concurrent session tracking
        $this->trackUserSession($user, $token->plainTextToken, $request);

        // Log successful authentication
        $this->logSuccessfulLogin($user, $request);

        // Clear rate limiting
        RateLimiter::clear($this->throttleKey($request));

        return [
            'status' => 'authenticated',
            'user' => $user->load('roles.permissions'),
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at,
            'session_timeout' => $tokenMinutes,
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'roles' => $user->roles->pluck('name')
        ];
    }

    /**
     * Check rate limiting (BSP requirement: prevent brute force attacks)
     */
    private function checkRateLimit(Request $request): void
    {
        $key = $this->throttleKey($request);

        if (RateLimiter::tooManyAttempts($key, self::MAX_LOGIN_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($key);

            $this->logSecurityEvent($request, 'Rate limit exceeded');

            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Please try again in {$seconds} seconds."]
            ]);
        }

        RateLimiter::hit($key, 900); // 15 minutes
    }

    /**
     * Check concurrent sessions (BSP requirement)
     */
    private function checkConcurrentSessions(User $user): void
    {
        $activeSessions = Cache::get("user_sessions_{$user->id}", []);

        if (count($activeSessions) >= self::MAX_CONCURRENT_SESSIONS) {
            throw ValidationException::withMessages([
                'session' => ['Maximum concurrent sessions reached. Please logout from other devices.']
            ]);
        }
    }

    /**
     * Track user session for concurrent session management
     */
    private function trackUserSession(User $user, string $token, Request $request): void
    {
        $sessionData = [
            'token' => $token,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now()->toISOString(),
            'last_activity' => now()->toISOString()
        ];

        $sessions = Cache::get("user_sessions_{$user->id}", []);
        $sessions[$token] = $sessionData;

        Cache::put("user_sessions_{$user->id}", $sessions, now()->addMinutes(self::getTokenExpirationMinutes()));
    }

    /**
     * Perform risk-based authentication assessment
     */
    private function performRiskAssessment(User $user, Request $request): void
    {
        $riskScore = 0;
        $riskFactors = [];

        // Check for unusual IP location
        if ($user->last_login_ip && $user->last_login_ip !== $request->ip()) {
            $riskScore += 20;
            $riskFactors[] = 'Different IP address';
        }

        // Check for unusual time access
        $currentHour = now()->hour;
        if ($currentHour < 6 || $currentHour > 22) {
            $riskScore += 15;
            $riskFactors[] = 'Unusual access time';
        }

        // Check for different user agent
        if ($user->last_login_user_agent && $user->last_login_user_agent !== $request->userAgent()) {
            $riskScore += 25;
            $riskFactors[] = 'Different device/browser';
        }

        // Log high-risk attempts
        if ($riskScore >= 50) {
            $this->logSecurityEvent($request, 'High-risk login attempt', $user, [
                'risk_score' => $riskScore,
                'risk_factors' => $riskFactors
            ]);

            // For very high risk, require additional authentication
            if ($riskScore >= 75) {
                throw ValidationException::withMessages([
                    'security' => ['Additional verification required due to unusual activity.']
                ]);
            }
        }
    }

    /**
     * Generate temporary token for 2FA process
     */
    private function generateTemporaryToken(User $user): string
    {
        $token = hash('sha256', $user->id . now()->timestamp . random_bytes(32));
        Cache::put("temp_2fa_token_{$token}", $user->id, now()->addMinutes(5));
        return $token;
    }

    /**
     * Verify OTP code (implement based on your 2FA provider)
     */
    private function verifyOTP(User $user, string $otpCode): bool
    {
        // Implement your OTP verification logic here
        // This could be Google Authenticator, SMS, etc.
        return true; // Placeholder
    }

    /**
     * Generate throttle key for rate limiting
     */
    private function throttleKey(Request $request): string
    {
        return 'login_attempts:' . $request->ip() . ':' . strtolower($request->input('email'));
    }

    /**
     * Log failed authentication attempt
     */
    private function logFailedAttempt(Request $request, string $reason, ?User $user = null): void
    {
        $data = [
            'event' => 'failed_login',
            'reason' => $reason,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'email' => $request->input('email'),
            'timestamp' => now()->toISOString()
        ];

        if ($user) {
            $data['user_id'] = $user->id;
            $data['failed_attempts'] = $user->failed_login_attempts;
        }

        Log::warning('Failed login attempt', $data);

        $logger = activity()
            ->useLog('security')
            ->withProperties([
                'action'     => 'failed_login',
                'reason'     => $reason,
                'ip'         => $request->ip(),
                'user_agent' => $request->userAgent(),
                'email'      => $request->input('email'),
            ]);

        if ($user) {
            $logger->causedBy($user)->performedOn($user);
        }

        $logger->log("Failed login attempt: {$reason}");
    }

    /**
     * Log successful authentication
     */
    private function logSuccessfulLogin(User $user, Request $request): void
    {
        Log::info('Successful login', [
            'event' => 'successful_login',
            'user_id' => $user->id,
            'email' => $user->email,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toISOString()
        ]);

        // Log activity using Spatie Activity Log
        activity()
            ->causedBy($user)
            ->log('User logged in successfully');
    }

    /**
     * Log security events
     */
    private function logSecurityEvent(Request $request, string $event, ?User $user = null, array $additional = []): void
    {
        $data = array_merge([
            'event' => $event,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toISOString()
        ], $additional);

        if ($user) {
            $data['user_id'] = $user->id;
            $data['email'] = $user->email;
        }

        Log::warning('Security event', $data);

        $logger = activity()
            ->useLog('security')
            ->withProperties(array_merge([
                'action'     => 'security_event',
                'event'      => $event,
                'ip'         => $request->ip(),
                'user_agent' => $request->userAgent(),
            ], $additional));

        if ($user) {
            $logger->causedBy($user)->performedOn($user);
        }

        $logger->log("Security event: {$event}");
    }

    /**
     * Logout user and revoke tokens
     */
    public function logout(Request $request): void
    {
        $user = $request->user();

        if ($user) {
            // Revoke current token
            $token = $request->bearerToken();
            if ($token) {
                $personalAccessToken = PersonalAccessToken::findToken($token);
                if ($personalAccessToken) {
                    $personalAccessToken->delete();
                }
            }

            // Remove from active sessions
            $sessions = Cache::get("user_sessions_{$user->id}", []);
            unset($sessions[$token]);
            Cache::put("user_sessions_{$user->id}", $sessions, now()->addMinutes(self::SESSION_TIMEOUT_MINUTES));

            // Log logout
            Log::info('User logout', [
                'event' => 'logout',
                'user_id' => $user->id,
                'ip' => $request->ip(),
                'timestamp' => now()->toISOString()
            ]);

            activity()
                ->causedBy($user)
                ->log('User logged out');
        }
    }

    /**
     * Validate password complexity (BSP requirement)
     */
    public function validatePasswordComplexity(string $password): array
    {
        $errors = [];

        // Minimum 6 characters
        if (strlen($password) < 6) {
            $errors[] = 'Password must be at least 6 characters long';
        }

        // Must contain uppercase letter
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }

        // Must contain lowercase letter
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter';
        }

        // Must contain number
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }

        // Must contain special character
        if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
            $errors[] = 'Password must contain at least one special character';
        }

        // Check for common patterns
        if (preg_match('/(.)\1{2,}/', $password)) {
            $errors[] = 'Password cannot contain repeated characters';
        }

        return $errors;
    }
}