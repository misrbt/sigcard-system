<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class ApiMaintenanceMode
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Cache::get('system_setting_maintenance_mode', false)) {
            return $next($request);
        }

        // Auth and admin routes are always reachable:
        // - auth/*: so admins can log in / refresh tokens
        // - admin/*: role:admin middleware at the route level still enforces access
        if ($request->is('api/auth/*') || $request->is('api/admin/*')) {
            return $next($request);
        }

        // Any other route: allow if the bearer token belongs to an admin.
        if ($this->tokenBelongsToAdmin($request)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'The system is currently under maintenance. Please try again later.',
            'maintenance' => true,
        ], 503);
    }

    private function tokenBelongsToAdmin(Request $request): bool
    {
        $bearer = $request->bearerToken();

        if (! $bearer || ! str_contains($bearer, '|')) {
            return false;
        }

        [$id, $plaintext] = explode('|', $bearer, 2);

        $token = PersonalAccessToken::find((int) $id);

        if (! $token || ! hash_equals($token->token, hash('sha256', $plaintext))) {
            return false;
        }

        if ($token->expires_at && $token->expires_at->isPast()) {
            return false;
        }

        $isAdmin = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $token->tokenable_id)
            ->where('model_has_roles.model_type', $token->tokenable_type)
            ->where('roles.name', 'admin')
            ->exists();

        if (! $isAdmin) {
            Log::debug('[Maintenance] Non-admin token blocked', [
                'path' => $request->path(),
                'tokenable_id' => $token->tokenable_id,
            ]);
        }

        return $isAdmin;
    }
}
