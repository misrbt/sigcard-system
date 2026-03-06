<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackLastActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = $request->user();

        if ($user) {
            $user->timestamps = false;
            $user->update([
                'session_expires_at' => now()->addMinutes(
                    config('sanctum.expiration', 30)
                ),
            ]);
            $user->timestamps = true;
        }

        return $response;
    }
}
