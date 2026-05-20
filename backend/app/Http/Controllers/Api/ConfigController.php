<?php

namespace App\Http\Controllers\Api;

use App\Enums\AccountType;
use App\Enums\CorporateSubType;
use App\Enums\CustomerStatus;
use App\Enums\DocumentType;
use App\Enums\JointSubType;
use App\Enums\RiskLevel;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class ConfigController extends Controller
{
    /**
     * Return all application enum values so the frontend never needs to hardcode them.
     * This endpoint is public — no authentication required.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'customer_statuses' => CustomerStatus::values(),
            'account_types' => AccountType::values(),
            'joint_sub_types' => JointSubType::values(),
            'corporate_sub_types' => CorporateSubType::values(),
            'risk_levels' => RiskLevel::values(),
            'document_types' => DocumentType::values(),
            'user_statuses' => UserStatus::values(),
        ]);
    }
}
