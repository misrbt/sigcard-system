<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class CentralAuth
{
    /**
     * Public paths that don't require auth.
     */
    protected array $except = [
        'api/auth/login',
        'api/auth/verify-2fa',
        'api/test',
        'up',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Skip auth for public routes
        foreach ($this->except as $path) {
            if ($request->is($path)) {
                return $next($request);
            }
        }

        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        try {
            $authUrl = config('services.central_auth.url', 'http://127.0.0.1:8001/api');

            $response = Http::timeout(10)
                ->withToken($token)
                ->get("{$authUrl}/auth/validate-token", [
                    'system_slug' => 'sigcard',
                ]);

            if (!$response->ok() || !$response->json('valid')) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            $data = $response->json();

            // Set user data on request for controllers
            $request->merge([
                'auth_user' => $data['user'],
                'auth_access' => $data['access'] ?? null,
            ]);

            // Find or sync local user record
            $user = \App\Models\User::where('email', $data['user']['email'])->first();
            if (!$user) {
                $nameParts = explode(' ', $data['user']['name'], 2);
                $user = \App\Models\User::create([
                    'firstname' => $nameParts[0] ?? '',
                    'lastname' => $nameParts[1] ?? '',
                    'username' => $data['user']['username'],
                    'email' => $data['user']['email'],
                    'password' => bcrypt(str()->random(32)),
                    'status' => 'active',
                    'branch_id' => $data['user']['branch_id'] ?? null,
                ]);
            }

            // Set authenticated user
            auth()->setUser($user);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Authentication service unavailable.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 503);
        }

        return $next($request);
    }
}
