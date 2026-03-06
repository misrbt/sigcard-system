<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\BranchDashboardTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class CashierController extends Controller
{
    use BranchDashboardTrait;

    public function dashboard(): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data'    => $this->getBranchDashboardData(auth()->user()->branch_id),
            ]);
        } catch (\Exception $e) {
            Log::error('Cashier dashboard error: ' . $e->getMessage());

            return response()->json(['success' => false, 'message' => 'Failed to load dashboard'], 500);
        }
    }
}
