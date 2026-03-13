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
            $user   = auth()->user();
            $branch = $user->branch()->with('children')->first();

            $branchIds = collect([$user->branch_id]);

            if ($branch) {
                $branchIds = $branchIds->merge($branch->children->pluck('id'));
            }

            return response()->json([
                'success' => true,
                'data'    => $this->getBranchDashboardData($branchIds->unique()->values()->all()),
            ]);
        } catch (\Exception $e) {
            Log::error('Cashier dashboard error: ' . $e->getMessage());

            return response()->json(['success' => false, 'message' => 'Failed to load dashboard'], 500);
        }
    }
}
