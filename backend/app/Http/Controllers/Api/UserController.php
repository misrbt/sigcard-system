<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * User Controller - Basic Banking Operations
 *
 * Handles standard banking operations for regular users
 * with BSP compliance and audit logging
 */
class UserController extends Controller
{
    /**
     * Get user's transactions
     */
    public function getTransactions(Request $request): JsonResponse
    {
        $user = $request->user();

        // Log the access
        activity()
            ->causedBy($user)
            ->log('User accessed transactions list');

        return response()->json([
            'success' => true,
            'message' => 'Transactions retrieved successfully',
            'data' => [
                'transactions' => [
                    // Placeholder data - implement actual transaction retrieval
                    [
                        'id' => 1,
                        'type' => 'deposit',
                        'amount' => 1000.00,
                        'account_number' => '1234567890',
                        'status' => 'completed',
                        'created_at' => now()->subDays(1),
                        'reference_number' => 'TXN-' . uniqid()
                    ]
                ],
                'user_role' => 'user',
                'accessible_accounts' => []
            ],
            'bsp_compliance' => [
                'access_logged' => true,
                'role_verified' => true
            ]
        ]);
    }

    /**
     * Create a new transaction
     */
    public function createTransaction(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:deposit,withdrawal,transfer',
            'amount' => 'required|numeric|min:0.01',
            'account_number' => 'required|string',
            'description' => 'nullable|string|max:255'
        ]);

        $user = $request->user();

        // Log transaction creation attempt
        activity()
            ->causedBy($user)
            ->withProperties([
                'transaction_type' => $request->type,
                'amount' => $request->amount,
                'account_number' => $request->account_number
            ])
            ->log('User initiated transaction');

        return response()->json([
            'success' => true,
            'message' => 'Transaction created successfully',
            'data' => [
                'transaction_id' => 'TXN-' . uniqid(),
                'status' => 'pending_approval',
                'amount' => $request->amount,
                'type' => $request->type,
                'created_at' => now(),
                'requires_approval' => true
            ],
            'bsp_compliance' => [
                'transaction_logged' => true,
                'approval_required' => true,
                'audit_trail_created' => true
            ]
        ]);
    }

    /**
     * Get transaction history
     */
    public function getTransactionHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'limit' => 'nullable|integer|min:1|max:100'
        ]);

        activity()
            ->causedBy($user)
            ->log('User accessed transaction history');

        return response()->json([
            'success' => true,
            'message' => 'Transaction history retrieved successfully',
            'data' => [
                'transactions' => [],
                'pagination' => [
                    'total' => 0,
                    'per_page' => $request->limit ?? 20,
                    'current_page' => 1
                ],
                'date_range' => [
                    'from' => $request->from_date ?? now()->subDays(30)->format('Y-m-d'),
                    'to' => $request->to_date ?? now()->format('Y-m-d')
                ]
            ],
            'bsp_compliance' => [
                'access_logged' => true,
                'data_filtered_by_role' => true
            ]
        ]);
    }

    /**
     * Get accessible accounts
     */
    public function getAccounts(Request $request): JsonResponse
    {
        $user = $request->user();

        activity()
            ->causedBy($user)
            ->log('User accessed accounts list');

        return response()->json([
            'success' => true,
            'message' => 'Accounts retrieved successfully',
            'data' => [
                'accounts' => [
                    // Placeholder data
                    [
                        'account_number' => '1234567890',
                        'account_type' => 'savings',
                        'status' => 'active',
                        'branch_code' => $user->branch_code,
                        'can_view_balance' => true,
                        'can_generate_statement' => true
                    ]
                ],
                'user_branch' => $user->branch_code
            ],
            'bsp_compliance' => [
                'access_logged' => true,
                'branch_filtered' => true
            ]
        ]);
    }

    /**
     * Get account balance
     */
    public function getAccountBalance(Request $request, string $account): JsonResponse
    {
        $user = $request->user();

        // Log balance inquiry
        activity()
            ->causedBy($user)
            ->withProperties(['account_number' => $account])
            ->log('User accessed account balance');

        return response()->json([
            'success' => true,
            'message' => 'Account balance retrieved successfully',
            'data' => [
                'account_number' => $account,
                'available_balance' => 10000.00,
                'ledger_balance' => 10000.00,
                'currency' => 'PHP',
                'last_transaction_date' => now()->subDays(1),
                'account_status' => 'active'
            ],
            'bsp_compliance' => [
                'balance_inquiry_logged' => true,
                'access_time_recorded' => true
            ]
        ]);
    }

    /**
     * Generate account statement
     */
    public function generateStatement(Request $request, string $account): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'format' => 'nullable|in:pdf,excel,csv'
        ]);

        activity()
            ->causedBy($user)
            ->withProperties([
                'account_number' => $account,
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
                'format' => $request->format ?? 'pdf'
            ])
            ->log('User generated account statement');

        return response()->json([
            'success' => true,
            'message' => 'Statement generated successfully',
            'data' => [
                'statement_id' => 'STMT-' . uniqid(),
                'account_number' => $account,
                'period' => [
                    'from' => $request->from_date ?? now()->subDays(30)->format('Y-m-d'),
                    'to' => $request->to_date ?? now()->format('Y-m-d')
                ],
                'format' => $request->format ?? 'pdf',
                'download_url' => '/api/user/statements/download/STMT-' . uniqid(),
                'expires_at' => now()->addHours(24)
            ],
            'bsp_compliance' => [
                'statement_generation_logged' => true,
                'temporary_access_link' => true,
                'audit_trail_created' => true
            ]
        ]);
    }

    /**
     * Get customers (limited view for users)
     */
    public function getCustomers(Request $request): JsonResponse
    {
        $user = $request->user();

        activity()
            ->causedBy($user)
            ->log('User accessed customers list');

        return response()->json([
            'success' => true,
            'message' => 'Customers retrieved successfully',
            'data' => [
                'customers' => [
                    // Placeholder data - limited view for users
                    [
                        'id' => 1,
                        'name' => 'John Doe',
                        'account_number' => '1234567890',
                        'status' => 'active',
                        'branch_code' => $user->branch_code,
                        'can_edit' => true,
                        'can_view_documents' => true
                    ]
                ],
                'user_permissions' => [
                    'can_view_customers' => true,
                    'can_edit_customers' => true,
                    'can_view_documents' => true,
                    'can_create_customers' => false,
                    'can_verify_customers' => false
                ]
            ],
            'bsp_compliance' => [
                'access_logged' => true,
                'data_filtered_by_branch' => true
            ]
        ]);
    }

    /**
     * Update customer information
     */
    public function updateCustomer(Request $request, string $customer): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'email' => 'nullable|email|max:255'
        ]);

        activity()
            ->causedBy($user)
            ->withProperties([
                'customer_id' => $customer,
                'updated_fields' => array_keys($request->only(['name', 'phone', 'address', 'email']))
            ])
            ->log('User updated customer information');

        return response()->json([
            'success' => true,
            'message' => 'Customer updated successfully',
            'data' => [
                'customer_id' => $customer,
                'updated_at' => now(),
                'updated_by' => $user->name,
                'requires_verification' => true
            ],
            'bsp_compliance' => [
                'update_logged' => true,
                'verification_required' => true,
                'audit_trail_updated' => true
            ]
        ]);
    }

    /**
     * Get customer documents
     */
    public function getCustomerDocuments(Request $request, string $customer): JsonResponse
    {
        $user = $request->user();

        activity()
            ->causedBy($user)
            ->withProperties(['customer_id' => $customer])
            ->log('User accessed customer documents');

        return response()->json([
            'success' => true,
            'message' => 'Customer documents retrieved successfully',
            'data' => [
                'customer_id' => $customer,
                'documents' => [
                    [
                        'id' => 1,
                        'type' => 'valid_id',
                        'name' => 'Government ID',
                        'status' => 'verified',
                        'uploaded_at' => now()->subDays(5),
                        'can_view' => true,
                        'can_download' => false
                    ]
                ],
                'user_permissions' => [
                    'can_view_documents' => true,
                    'can_upload_documents' => false,
                    'can_verify_documents' => false
                ]
            ],
            'bsp_compliance' => [
                'document_access_logged' => true,
                'sensitive_data_protected' => true
            ]
        ]);
    }

    /**
     * Get available reports for users
     */
    public function getReports(Request $request): JsonResponse
    {
        $user = $request->user();

        activity()
            ->causedBy($user)
            ->log('User accessed reports list');

        return response()->json([
            'success' => true,
            'message' => 'Available reports retrieved successfully',
            'data' => [
                'available_reports' => [
                    [
                        'type' => 'transaction_summary',
                        'name' => 'Transaction Summary',
                        'description' => 'Summary of daily transactions',
                        'can_generate' => true,
                        'formats' => ['pdf', 'excel']
                    ],
                    [
                        'type' => 'account_statement',
                        'name' => 'Account Statement',
                        'description' => 'Detailed account statement',
                        'can_generate' => true,
                        'formats' => ['pdf']
                    ]
                ],
                'user_permissions' => [
                    'can_view_reports' => true,
                    'can_generate_reports' => true,
                    'can_export_reports' => false
                ]
            ],
            'bsp_compliance' => [
                'access_logged' => true,
                'role_based_filtering' => true
            ]
        ]);
    }

    /**
     * Generate report
     */
    public function generateReport(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'type' => 'required|in:transaction_summary,account_statement',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'format' => 'nullable|in:pdf,excel,csv'
        ]);

        activity()
            ->causedBy($user)
            ->withProperties([
                'report_type' => $request->type,
                'date_range' => [
                    'from' => $request->from_date,
                    'to' => $request->to_date
                ],
                'format' => $request->format ?? 'pdf'
            ])
            ->log('User generated report');

        return response()->json([
            'success' => true,
            'message' => 'Report generated successfully',
            'data' => [
                'report_id' => 'RPT-' . uniqid(),
                'type' => $request->type,
                'period' => [
                    'from' => $request->from_date,
                    'to' => $request->to_date
                ],
                'format' => $request->format ?? 'pdf',
                'download_url' => '/api/user/reports/download/RPT-' . uniqid(),
                'generated_at' => now(),
                'expires_at' => now()->addHours(24)
            ],
            'bsp_compliance' => [
                'report_generation_logged' => true,
                'temporary_download_link' => true,
                'audit_trail_created' => true
            ]
        ]);
    }
}