<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
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

    const LOCKOUT_DURATION = 30; // seconds

    const PASSWORD_EXPIRY_DAYS = 90;

    const SESSION_TIMEOUT_MINUTES = 30;

    const MAX_CONCURRENT_SESSIONS = 3;

    /**
     * Get the admin-configured password expiry days (0 = disabled).
     */
    public static function getPasswordExpiryDays(): int
    {
        $enabled = Cache::get('system_setting_password_expiry_enabled', false);
        if (! $enabled) {
            return 0; // disabled
        }

        return (int) Cache::get('system_setting_password_expiry_days', self::PASSWORD_EXPIRY_DAYS);
    }

    /**
     * Get the admin-configured lockout duration in seconds.
     */
    public static function getLockoutDurationSeconds(): int
    {
        // Duration is stored directly in seconds (no separate unit key).
        return (int) Cache::get('system_setting_account_lockout_duration', self::LOCKOUT_DURATION);
    }

    /**
     * Get the admin-configured concurrent sessions limit (0 = disabled).
     */
    public static function getConcurrentSessionsLimit(): int
    {
        return (int) Cache::get('system_setting_concurrent_sessions_limit', self::MAX_CONCURRENT_SESSIONS);
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
            'device_id' => 'required|string',
        ]);
        // recovery_code is intentionally not part of this initial validate() —
        // it is only ever submitted to the separate /auth/verify-recovery-code
        // endpoint, mirroring how otp_code is submitted to /auth/verify-2fa.

        // Rate limiting check (BSP requirement: prevent brute force)
        $this->checkRateLimit($request);

        // Find user
        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user) {
            $this->logFailedAttempt($request, 'Invalid credentials');
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials provided.'],
            ]);
        }

        // BSP Compliance Checks
        $this->performBSPComplianceChecks($user, $request);

        // Verify password
        if (! Hash::check($credentials['password'], $user->password)) {
            $user->incrementFailedLoginAttempts();
            $this->logFailedAttempt($request, 'Invalid password', $user);

            // If this wrong attempt just triggered a lockout, reset the rate-limiter
            // with a fresh window so both timers start from the same moment and the
            // countdown always shows the full lockout duration.
            if ($user->isAccountLocked()) {
                $lockoutSec = self::getLockoutDurationSeconds();
                $maxAttempts = (int) Cache::get('system_setting_max_login_attempts', self::MAX_LOGIN_ATTEMPTS);
                $key = $this->throttleKey($request);
                RateLimiter::clear($key);
                for ($i = 0; $i < $maxAttempts; $i++) {
                    RateLimiter::hit($key, $lockoutSec);
                }
                throw ValidationException::withMessages([
                    'account' => ["Account is temporarily locked. Please try again in {$lockoutSec} seconds."],
                ]);
            }

            throw ValidationException::withMessages([
                'password' => ['Invalid credentials provided.'],
            ]);
        }

        // A forced password change (first login on a temp/admin-reset password)
        // must happen before any 2FA step — scanning a QR code or entering a
        // recovery code while still on a password the user is about to replace
        // doesn't make sense, and ties the 2FA secret's issuance to a session
        // that's about to be superseded anyway.
        if ($user->force_password_change) {
            return $this->handleForcePasswordChangeRequired($user);
        }

        return $this->resolveNextAuthStep($user, $request, $credentials);
    }

    /**
     * Decide the next login step for a user who has passed credential and
     * forced-password-change checks: 2FA challenge, forced 2FA setup, or
     * recovery-code login for users exempted from 2FA.
     */
    private function resolveNextAuthStep(User $user, Request $request, array $credentials = []): array
    {
        $systemRequires2FA = (bool) Cache::get('system_setting_require_two_factor', false);
        $requires2FA = $systemRequires2FA || (bool) $user->require_two_factor;

        if ($requires2FA) {
            if ($user->two_factor_enabled) {
                return $this->handleTwoFactorAuthentication($user, $request, $credentials);
            }

            // 2FA required but user hasn't enrolled yet — force setup
            return $this->handleTwoFactorSetupRequired($user);
        }

        // Not required to use an authenticator app — the user was exempted by an
        // admin, so they authenticate with a static recovery code instead.
        return $this->handleRecoveryCodeLogin($user);
    }

    /**
     * Force a password change before allowing the user to proceed to 2FA or
     * a completed login. Mirrors the existing temporary-token pattern used by
     * the 2FA setup/verify and recovery-code flows.
     */
    private function handleForcePasswordChangeRequired(User $user): array
    {
        $token = hash('sha256', $user->id.now()->timestamp.random_bytes(32));
        Cache::put("force_pwd_token_{$token}", $user->id, now()->addMinutes(10));

        return [
            'status' => 'password_change_required',
            'message' => 'Your password must be changed before you can continue.',
            'temporary_token' => $token,
        ];
    }

    /**
     * Resolve the "force_pwd_token_*" cache key to a user (public so the
     * controller can validate current/new password before committing).
     */
    public function resolveForcePasswordChangeToken(string $temporaryToken): ?User
    {
        $userId = Cache::get("force_pwd_token_{$temporaryToken}");

        return $userId ? User::find($userId) : null;
    }

    /**
     * Complete a forced password change and resolve the next login step.
     */
    public function completeForcedPasswordChange(User $user, string $temporaryToken, string $newPassword, Request $request): array
    {
        Cache::forget("force_pwd_token_{$temporaryToken}");

        $expiryDays = self::getPasswordExpiryDays();
        $user->update([
            'password' => Hash::make($newPassword),
            'password_changed_at' => now(),
            'password_expires_at' => $expiryDays > 0 ? now()->addDays($expiryDays) : null,
            'force_password_change' => false,
        ]);

        return $this->resolveNextAuthStep($user, $request);
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
                'account' => ['Account is not active. Contact administrator.'],
            ]);
        }

        // Check account lockout
        if ($user->isAccountLocked()) {
            $this->logSecurityEvent($request, 'Account locked', $user);
            $seconds = (int) now()->diffInSeconds($user->account_locked_at);
            throw ValidationException::withMessages([
                'account' => ["Account is temporarily locked. Please try again in {$seconds} seconds."],
            ]);
        }

        // Check password expiry (only if expiry is enabled by admin)
        $expiryDays = self::getPasswordExpiryDays();
        if ($expiryDays > 0 && $user->isPasswordExpired()) {
            $this->logSecurityEvent($request, 'Password expired', $user);
            throw ValidationException::withMessages([
                'password' => ['Password has expired. Please reset your password.'],
            ]);
        }

        // Check account expiry
        if ($user->account_expires_at?->isPast()) {
            $this->logSecurityEvent($request, 'Account expired', $user);
            throw ValidationException::withMessages([
                'account' => ['Account has expired. Contact administrator.'],
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
        if (! isset($credentials['otp_code'])) {
            return [
                'status' => 'two_factor_required',
                'message' => 'Two-factor authentication code required',
                'temporary_token' => $this->generateTemporaryToken($user),
            ];
        }

        // Verify OTP code (implement your OTP verification logic)
        if (! $this->verifyOTP($user, $credentials['otp_code'])) {
            $user->incrementFailedLoginAttempts();
            $this->logFailedAttempt($request, 'Invalid OTP', $user);
            throw ValidationException::withMessages([
                'otp_code' => ['Invalid two-factor authentication code.'],
            ]);
        }

        return $this->completeAuthentication($user, $request);
    }

    /**
     * Complete authentication process
     */
    public function completeAuthentication(User $user, Request $request): array
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
            'session_expires_at' => now()->addMinutes($tokenMinutes),
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
            'direct_permissions' => $user->getDirectPermissions()->pluck('name'),
            'roles' => $user->roles->pluck('name'),
        ];
    }

    /**
     * Check rate limiting (BSP requirement: prevent brute force attacks)
     */
    private function checkRateLimit(Request $request): void
    {
        $maxAttempts = (int) Cache::get('system_setting_max_login_attempts', self::MAX_LOGIN_ATTEMPTS);

        if ($maxAttempts === 0) {
            return;
        }

        $key = $this->throttleKey($request);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);

            $this->logSecurityEvent($request, 'Rate limit exceeded');

            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Please try again in {$seconds} seconds."],
            ]);
        }

        RateLimiter::hit($key, self::getLockoutDurationSeconds());
    }

    /**
     * Check concurrent sessions (BSP requirement)
     */
    private function checkConcurrentSessions(User $user): void
    {
        $limit = self::getConcurrentSessionsLimit();

        if ($limit === 0) {
            return;
        }

        $activeSessions = Cache::get("user_sessions_{$user->id}", []);

        if (count($activeSessions) >= $limit) {
            throw ValidationException::withMessages([
                'session' => ['Maximum concurrent sessions reached. Please logout from other devices.'],
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
            'last_activity' => now()->toISOString(),
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
                'risk_factors' => $riskFactors,
            ]);

            // For very high risk, require additional authentication
            if ($riskScore >= 75) {
                throw ValidationException::withMessages([
                    'security' => ['Additional verification required due to unusual activity.'],
                ]);
            }
        }
    }

    /**
     * Force the user through a first-time 2FA enrollment during login.
     * Returns setup data (QR code + secret) along with a temporary token.
     */
    private function handleTwoFactorSetupRequired(User $user): array
    {
        $secret = $this->generateBase32Secret();
        $setupToken = $this->generateSetupToken($user, $secret);

        $issuer = 'DIGICUR';
        $account = urlencode($user->email);
        $otpauthUrl = "otpauth://totp/{$issuer}:{$account}?secret={$secret}&issuer={$issuer}&algorithm=SHA1&digits=6&period=30";
        $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='.urlencode($otpauthUrl);

        return [
            'status' => 'setup_two_factor_required',
            'message' => 'Two-factor authentication is required by your organization. Scan the QR code to enroll.',
            'temporary_token' => $setupToken,
            'secret' => $secret,
            'qr_code_url' => $qrCodeUrl,
        ];
    }

    /**
     * Store user ID + secret for the forced 2FA setup flow (10-minute TTL).
     */
    private function generateSetupToken(User $user, string $secret): string
    {
        $token = hash('sha256', $user->id.now()->timestamp.random_bytes(32));
        Cache::put("setup_2fa_token_{$token}", ['user_id' => $user->id, 'secret' => $secret], now()->addMinutes(10));

        return $token;
    }

    /**
     * Generate temporary token for 2FA process
     */
    private function generateTemporaryToken(User $user): string
    {
        $token = hash('sha256', $user->id.now()->timestamp.random_bytes(32));
        Cache::put("temp_2fa_token_{$token}", $user->id, now()->addMinutes(10));

        return $token;
    }

    /**
     * Log a user in via recovery code instead of an authenticator app
     * (used when an admin has exempted them from the 2FA requirement).
     */
    private function handleRecoveryCodeLogin(User $user): array
    {
        $pendingCode = Cache::get("pending_recovery_code_{$user->id}");

        // Defensive fallback: require_two_factor is false but no code was ever
        // issued (e.g. legacy/seeded data) — issue one now instead of dead-ending.
        if (! $pendingCode && ! $user->recovery_code_hash) {
            $pendingCode = self::issueRecoveryCode($user);
        }

        if ($pendingCode) {
            $token = hash('sha256', $user->id.now()->timestamp.random_bytes(32));
            Cache::put("confirm_recovery_token_{$token}", $user->id, now()->addMinutes(10));

            return [
                'status' => 'recovery_code_issued',
                'message' => 'Your account does not require an authenticator app. Save this recovery code somewhere safe — you will need it to log in from now on.',
                'recovery_code' => $pendingCode,
                'temporary_token' => $token,
            ];
        }

        $token = hash('sha256', $user->id.now()->timestamp.random_bytes(32));
        Cache::put("verify_recovery_token_{$token}", $user->id, now()->addMinutes(10));

        return [
            'status' => 'recovery_code_required',
            'message' => 'Recovery code required',
            'temporary_token' => $token,
        ];
    }

    /**
     * Generate a fresh recovery code for a user, hash it for storage, and
     * stage the plaintext for one-time display at their next login.
     */
    public static function issueRecoveryCode(User $user): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes ambiguous 0/O/1/I
        $raw = '';
        for ($i = 0; $i < 12; $i++) {
            $raw .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $code = implode('-', str_split($raw, 4));

        $user->update(['recovery_code_hash' => Hash::make($code)]);
        Cache::put("pending_recovery_code_{$user->id}", $code, now()->addDays(30));

        return $code;
    }

    /**
     * Generate a random 32-character Base32 secret for TOTP setup.
     */
    public function generateBase32Secret(): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($i = 0; $i < 32; $i++) {
            $secret .= $chars[random_int(0, 31)];
        }

        return $secret;
    }

    /**
     * Verify a TOTP code against a Base32 secret, allowing ±1 time-step tolerance.
     */
    public function verifyTOTP(string $base32Secret, string $code, int $window = 1): bool
    {
        $counter = (int) floor(time() / 30);
        $binarySecret = $this->base32Decode($base32Secret);

        for ($i = -$window; $i <= $window; $i++) {
            if ($this->computeTOTP($binarySecret, $counter + $i) === $code) {
                return true;
            }
        }

        return false;
    }

    /**
     * Verify OTP code using TOTP against the user's stored secret.
     */
    private function verifyOTP(User $user, string $otpCode): bool
    {
        if (! $user->two_factor_secret) {
            return false;
        }

        $secret = decrypt($user->two_factor_secret);

        return $this->verifyTOTP($secret, $otpCode);
    }

    /**
     * Decode a Base32-encoded string to its raw binary representation.
     */
    private function base32Decode(string $secret): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = strtoupper(rtrim($secret, '='));
        $buffer = 0;
        $bitsLeft = 0;
        $result = '';

        for ($i = 0; $i < strlen($secret); $i++) {
            $val = strpos($alphabet, $secret[$i]);
            if ($val === false) {
                continue;
            }
            $buffer = ($buffer << 5) | $val;
            $bitsLeft += 5;
            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $result .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }

        return $result;
    }

    /**
     * Compute a 6-digit TOTP code for a given binary secret and counter (RFC 4226 / 6238).
     */
    private function computeTOTP(string $binarySecret, int $counter, int $digits = 6): string
    {
        // 8-byte big-endian counter (counter fits in 32 bits for decades to come)
        $timeBytes = pack('NN', 0, $counter);
        $hash = hash_hmac('sha1', $timeBytes, $binarySecret, true);
        $offset = ord($hash[19]) & 0x0F;
        $binCode = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($binCode % (10 ** $digits)), $digits, '0', STR_PAD_LEFT);
    }

    /**
     * Generate throttle key for rate limiting
     */
    private function throttleKey(Request $request): string
    {
        return 'login_attempts:'.$request->ip().':'.strtolower($request->input('email'));
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
            'timestamp' => now()->toISOString(),
        ];

        if ($user) {
            $data['user_id'] = $user->id;
            $data['failed_attempts'] = $user->failed_login_attempts;
        }

        Log::warning('Failed login attempt', $data);

        $logger = activity()
            ->useLog('security')
            ->withProperties([
                'action' => 'failed_login',
                'reason' => $reason,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'email' => $request->input('email'),
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
            'timestamp' => now()->toISOString(),
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
            'timestamp' => now()->toISOString(),
        ], $additional);

        if ($user) {
            $data['user_id'] = $user->id;
            $data['email'] = $user->email;
        }

        Log::warning('Security event', $data);

        $logger = activity()
            ->useLog('security')
            ->withProperties(array_merge([
                'action' => 'security_event',
                'event' => $event,
                'ip' => $request->ip(),
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
                'timestamp' => now()->toISOString(),
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
        if (! preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }

        // Must contain lowercase letter
        if (! preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter';
        }

        // Must contain number
        if (! preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }

        // Must contain special character
        if (! preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
            $errors[] = 'Password must contain at least one special character';
        }

        // Check for common patterns
        if (preg_match('/(.)\1{2,}/', $password)) {
            $errors[] = 'Password cannot contain repeated characters';
        }

        return $errors;
    }
}
