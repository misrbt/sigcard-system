<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets the Sanctum PersonalAccessToken guard authenticate requests using the
 * httpOnly `digicur_token` cookie, so the frontend never needs to read or
 * store the bearer token in JavaScript-accessible storage.
 */
class TokenFromCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasHeader('Authorization') && $request->cookie('digicur_token')) {
            $request->headers->set('Authorization', 'Bearer '.$request->cookie('digicur_token'));
        }

        return $next($request);
    }
}
