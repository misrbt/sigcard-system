<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance as Middleware;

class PreventRequestsDuringMaintenance extends Middleware
{
    /**
     * URIs that should be reachable even in maintenance mode.
     * Auth routes: allow login/logout so admins can always authenticate.
     * Admin routes: already protected by auth+role, so exempting them lets admins operate normally.
     *
     * @var array<int, string>
     */
    protected $except = [
        'api/auth/*',
        'api/admin/*',
    ];
}
