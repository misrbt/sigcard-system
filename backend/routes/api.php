<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CashierController;
use App\Http\Controllers\Api\ComplianceController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ManagerController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/test', function () {
    return response()->json([
        'message' => 'API is working!',
        'timestamp' => now(),
        'laravel_version' => app()->version(),
    ]);
});

// DIGICUR Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register'])->middleware(['auth:sanctum', 'role:admin']);
    Route::post('/verify-2fa', [AuthController::class, 'verifyTwoFactor']);

    Route::middleware(['auth:sanctum', 'track.activity'])->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/refresh-token', [AuthController::class, 'refreshToken']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/enable-2fa', [AuthController::class, 'enableTwoFactor']);
        Route::post('/disable-2fa', [AuthController::class, 'disableTwoFactor']);
        Route::get('/active-sessions', [AuthController::class, 'activeSessions']);
    });
});

// Protected Routes with Role-based Access Control
Route::middleware(['auth:sanctum', 'track.activity'])->group(function () {

    // Branches (all authenticated users)
    Route::get('/branches', [BranchController::class, 'index']);

    // Cashier Routes
    Route::middleware(['role:cashier,admin'])->prefix('cashier')->group(function () {
        Route::get('/dashboard', [CashierController::class, 'dashboard']);
        Route::get('/transactions', [CashierController::class, 'getTransactions']);
        Route::get('/customers', [CashierController::class, 'getCustomers']);
        Route::get('/accounts', [CashierController::class, 'getAccounts']);
    });

    // Admin Only Routes
    Route::middleware(['role:admin'])->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'getDashboardStats']);

        Route::get('/users', [AdminController::class, 'getAllUsers']);
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::put('/users/{user}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);
        Route::post('/users/{user}/activate', [AdminController::class, 'activateUser']);
        Route::post('/users/{user}/deactivate', [AdminController::class, 'deactivateUser']);
        Route::post('/users/{user}/unlock', [AdminController::class, 'unlockUser']);
        Route::post('/users/{user}/reset-password', [AdminController::class, 'resetUserPassword']);

        Route::get('/roles', [AdminController::class, 'getAllRoles']);
        Route::post('/roles', [AdminController::class, 'createRole']);
        Route::put('/roles/{role}', [AdminController::class, 'updateRole']);
        Route::delete('/roles/{role}', [AdminController::class, 'deleteRole']);
        Route::post('/users/{user}/roles', [AdminController::class, 'assignRole']);
        Route::delete('/users/{user}/roles/{role}', [AdminController::class, 'removeRole']);

        Route::get('/permissions', [AdminController::class, 'getAllPermissions']);
        Route::post('/permissions', [AdminController::class, 'createPermission']);
        Route::post('/roles/{role}/permissions', [AdminController::class, 'assignPermission']);

        Route::get('/system-settings', [AdminController::class, 'getSystemSettings']);
        Route::put('/system-settings', [AdminController::class, 'updateSystemSettings']);
        Route::get('/system-logs', [AdminController::class, 'getSystemLogs']);
        Route::post('/system/backup', [AdminController::class, 'backupSystem']);
        Route::post('/system/restore', [AdminController::class, 'restoreSystem']);

        Route::get('/audit-logs', [AdminController::class, 'getAuditLogs']);
        Route::get('/audit-logs/history/{subjectType}/{subjectId}', [AdminController::class, 'getSubjectHistory']);
        Route::get('/login-attempts', [AdminController::class, 'getLoginAttempts']);
        Route::get('/security-events', [AdminController::class, 'getSecurityEvents']);

        Route::get('/branch-hierarchy', [AdminController::class, 'getBranchHierarchy']);
        Route::post('/branches', [AdminController::class, 'storeBranch']);
        Route::put('/branches/{branch}', [AdminController::class, 'updateBranch']);
        Route::delete('/branches/{branch}', [AdminController::class, 'deleteBranch']);
        Route::put('/branches/{branch}/parent', [AdminController::class, 'updateBranchParent']);
    });

    // Manager Routes (includes some admin functions)
    Route::middleware(['role:manager,admin'])->prefix('manager')->group(function () {
        Route::get('/dashboard', [ManagerController::class, 'getDashboard']);
        Route::get('/users', [ManagerController::class, 'getUsers']);
        Route::put('/users/{user}', [ManagerController::class, 'updateUser']);
        Route::post('/users/{user}/activate', [ManagerController::class, 'activateUser']);
        Route::post('/users/{user}/deactivate', [ManagerController::class, 'deactivateUser']);
        Route::post('/users/{user}/reset-password', [ManagerController::class, 'resetUserPassword']);
        Route::post('/users/{user}/unlock', [ManagerController::class, 'unlockUser']);

        Route::get('/transactions', [ManagerController::class, 'getTransactions']);
        Route::post('/transactions/{transaction}/approve', [ManagerController::class, 'approveTransaction']);
        Route::post('/transactions/{transaction}/reject', [ManagerController::class, 'rejectTransaction']);
        Route::get('/transactions/pending-approval', [ManagerController::class, 'getPendingTransactions']);

        Route::get('/accounts', [ManagerController::class, 'getAccounts']);
        Route::get('/accounts/{account}/balance', [ManagerController::class, 'getAccountBalance']);
        Route::post('/transfers/approve', [ManagerController::class, 'approveTransfer']);
        Route::get('/statements/{account}', [ManagerController::class, 'generateStatement']);

        Route::get('/customers', [ManagerController::class, 'getCustomers']);
        Route::put('/customers/{customer}', [ManagerController::class, 'updateCustomer']);
        Route::post('/customers/{customer}/verify', [ManagerController::class, 'verifyCustomer']);
        Route::post('/customers/{customer}/approve-application', [ManagerController::class, 'approveCustomerApplication']);

        Route::get('/reports', [ManagerController::class, 'getReports']);
        Route::post('/reports/generate', [ManagerController::class, 'generateReport']);
        Route::get('/reports/financial', [ManagerController::class, 'getFinancialReports']);

        Route::get('/branch-operations', [ManagerController::class, 'getBranchOperations']);
        Route::get('/branch-reports', [ManagerController::class, 'getBranchReports']);
        Route::post('/branch-transactions/{transaction}/approve', [ManagerController::class, 'approveBranchTransaction']);

        Route::get('/audit-logs', [ManagerController::class, 'getAuditLogs']);
        Route::get('/compliance-reports', [ManagerController::class, 'getComplianceReports']);
        Route::get('/risk-assessments', [ManagerController::class, 'getRiskAssessments']);
        Route::post('/risk-assessments/{assessment}/approve', [ManagerController::class, 'approveRiskAssessment']);
    });

    // User Routes (basic banking operations)
    Route::middleware(['role:user,manager,admin'])->prefix('user')->group(function () {
        Route::get('/transactions', [UserController::class, 'getTransactions']);
        Route::post('/transactions', [UserController::class, 'createTransaction']);
        Route::get('/transactions/history', [UserController::class, 'getTransactionHistory']);

        Route::get('/accounts', [UserController::class, 'getAccounts']);
        Route::get('/accounts/{account}/balance', [UserController::class, 'getAccountBalance']);
        Route::get('/accounts/{account}/statement', [UserController::class, 'generateStatement']);

        Route::get('/customers', [UserController::class, 'getCustomers']);
        Route::put('/customers/{customer}', [UserController::class, 'updateCustomer']);
        Route::get('/customers/{customer}/documents', [UserController::class, 'getCustomerDocuments']);

        Route::get('/reports', [UserController::class, 'getReports']);
        Route::post('/reports/generate', [UserController::class, 'generateReport']);
    });

    // Customer read routes — compliance-audit sees all; others are branch-restricted in controller
    Route::middleware(['role:user,manager,admin,cashier,compliance-audit'])->prefix('customers')->group(function () {
        Route::get('/', [CustomerController::class, 'index']);
        Route::get('/{customer}', [CustomerController::class, 'show']);
        Route::get('/{customer}/documents', [CustomerController::class, 'getDocuments']);
        Route::get('/{customer}/history', [CustomerController::class, 'history']);
    });

    // Customer write routes — cashier cannot modify
    Route::middleware(['role:user,manager,admin'])->prefix('customers')->group(function () {
        Route::post('/', [CustomerController::class, 'store']);
        Route::put('/{customer}', [CustomerController::class, 'update']);
        Route::delete('/{customer}', [CustomerController::class, 'destroy']);
        Route::delete('/{customer}/documents/{document}', [CustomerController::class, 'deleteDocument']);
        Route::post('/{customer}/replace-document', [CustomerController::class, 'replaceDocument']);
        Route::post('/{customer}/add-account', [CustomerController::class, 'addAccount']);
        Route::put('/{customer}/accounts/{account}', [CustomerController::class, 'updateAccount']);
    });

    // Compliance Audit Routes
    Route::middleware(['role:compliance-audit,admin'])->prefix('compliance')->group(function () {
        Route::get('/dashboard', [ComplianceController::class, 'getDashboard']);
        Route::get('/audit-logs', [ComplianceController::class, 'getAuditLogs']);
        Route::get('/audit-logs/history/{subjectType}/{subjectId}', [ComplianceController::class, 'getSubjectHistory']);
        Route::post('/audit-logs/export', [ComplianceController::class, 'exportAuditLogs']);
        Route::get('/compliance-reports', [ComplianceController::class, 'getComplianceReports']);
        Route::post('/compliance-reports/generate', [ComplianceController::class, 'generateComplianceReport']);

        Route::get('/risk-assessments', [ComplianceController::class, 'getRiskAssessments']);
        Route::post('/risk-assessments', [ComplianceController::class, 'createRiskAssessment']);
        Route::put('/risk-assessments/{assessment}', [ComplianceController::class, 'updateRiskAssessment']);

        Route::get('/users', [ComplianceController::class, 'getUsers']);
        Route::get('/transactions', [ComplianceController::class, 'getTransactions']);
        Route::get('/accounts', [ComplianceController::class, 'getAccounts']);
        Route::get('/customers', [ComplianceController::class, 'getCustomers']);

        Route::get('/reports', [ComplianceController::class, 'getReports']);
        Route::post('/reports/generate', [ComplianceController::class, 'generateReport']);
        Route::post('/reports/export', [ComplianceController::class, 'exportReport']);
        Route::get('/reports/financial', [ComplianceController::class, 'getFinancialReports']);
        Route::get('/reports/regulatory', [ComplianceController::class, 'getRegulatoryReports']);

        Route::get('/security/login-attempts', [ComplianceController::class, 'getLoginAttempts']);
        Route::get('/security/system-logs', [ComplianceController::class, 'getSystemLogs']);
        Route::get('/security/events', [ComplianceController::class, 'getSecurityEvents']);

        Route::get('/branch-data', [ComplianceController::class, 'getBranchData']);
        Route::get('/branch-reports', [ComplianceController::class, 'getBranchReports']);
    });
});

// Public BSP Compliance Information
Route::get('/bsp/compliance-info', function () {
    return response()->json([
        'bsp_compliance' => [
            'circular_references' => ['BSP Circular 951', 'BSP Circular 982'],
            'implemented_features' => [
                'multi_factor_authentication' => true,
                'account_lockout_policy' => true,
                'password_complexity_requirements' => true,
                'session_management' => true,
                'audit_logging' => true,
                'risk_based_authentication' => true,
                'role_based_access_control' => true,
                'concurrent_session_limiting' => true,
                'password_expiry_policy' => true,
            ],
            'security_standards' => [
                'max_login_attempts' => 5,
                'lockout_duration_minutes' => 30,
                'password_expiry_days' => 90,
                'session_timeout_minutes' => 30,
                'max_concurrent_sessions' => 3,
                'minimum_password_length' => 12,
            ],
        ],
    ]);
});
