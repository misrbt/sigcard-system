<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class BSPRolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // User Management
            'view-users', 'create-users', 'edit-users', 'delete-users',
            'activate-users', 'deactivate-users', 'reset-user-passwords', 'unlock-user-accounts',

            // Role and Permission Management
            'view-roles', 'create-roles', 'edit-roles', 'delete-roles',
            'assign-roles', 'view-permissions', 'assign-permissions',

            // Transaction Management
            'view-transactions', 'create-transactions', 'edit-transactions',
            'approve-transactions', 'reject-transactions', 'cancel-transactions',
            'view-transaction-history',

            // Financial Operations
            'view-accounts', 'create-accounts', 'edit-accounts', 'close-accounts',
            'transfer-funds', 'approve-transfers', 'view-balances', 'generate-statements',

            // Compliance and Audit
            'view-audit-logs', 'export-audit-logs', 'view-compliance-reports',
            'generate-compliance-reports', 'view-risk-assessments',
            'create-risk-assessments', 'approve-risk-assessments',

            // System Administration
            'view-system-settings', 'edit-system-settings', 'view-system-logs',
            'backup-system', 'restore-system', 'manage-security-policies',

            // Customer Management
            'view-customers', 'create-customers', 'edit-customers',
            'verify-customers', 'suspend-customers', 'view-customer-documents',
            'approve-customer-applications',

            // Reporting
            'view-reports', 'generate-reports', 'export-reports',
            'schedule-reports', 'view-financial-reports', 'view-regulatory-reports',

            // Authentication Management
            'force-password-reset', 'unlock-accounts', 'view-login-attempts',
            'manage-sessions', 'enable-disable-2fa',

            // Branch Operations
            'view-branch-data', 'manage-branch-operations',
            'view-branch-reports', 'approve-branch-transactions',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $this->createBSPRoles();
        $this->createInitialUsers();
    }

    private function createBSPRoles(): void
    {
        // 1. Admin Role - Full system access
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->syncPermissions(Permission::all());

        // 2. Manager Role
        $managerRole = Role::firstOrCreate(['name' => 'manager']);
        $managerRole->syncPermissions([
            'view-users', 'edit-users', 'activate-users', 'deactivate-users',
            'reset-user-passwords', 'unlock-user-accounts',
            'view-transactions', 'approve-transactions', 'reject-transactions',
            'view-transaction-history',
            'view-accounts', 'view-balances', 'approve-transfers', 'generate-statements',
            'view-customers', 'edit-customers', 'verify-customers', 'approve-customer-applications',
            'view-reports', 'generate-reports', 'export-reports', 'view-financial-reports',
            'view-audit-logs', 'view-compliance-reports', 'view-risk-assessments',
            'approve-risk-assessments',
            'view-branch-data', 'manage-branch-operations', 'view-branch-reports',
            'approve-branch-transactions',
        ]);

        // 3. User Role
        $userRole = Role::firstOrCreate(['name' => 'user']);
        $userRole->syncPermissions([
            'view-transactions', 'create-transactions', 'view-transaction-history',
            'view-accounts', 'view-balances', 'generate-statements',
            'view-customers', 'edit-customers', 'view-customer-documents',
            'view-reports', 'generate-reports',
        ]);

        // 4. Compliance Audit Role
        $complianceAuditRole = Role::firstOrCreate(['name' => 'compliance-audit']);
        $complianceAuditRole->syncPermissions([
            'view-audit-logs', 'export-audit-logs', 'view-compliance-reports',
            'generate-compliance-reports', 'view-risk-assessments', 'create-risk-assessments',
            'view-users', 'view-transactions', 'view-transaction-history',
            'view-accounts', 'view-customers',
            'view-reports', 'generate-reports', 'export-reports',
            'view-financial-reports', 'view-regulatory-reports',
            'view-login-attempts', 'view-system-logs',
            'view-branch-data', 'view-branch-reports',
        ]);

        // 5. Cashier Role - Branch-scoped read-only
        $cashierRole = Role::firstOrCreate(['name' => 'cashier']);
        $cashierRole->syncPermissions([
            'view-transactions', 'view-transaction-history',
            'view-accounts', 'view-balances',
            'view-customers', 'view-customer-documents',
            'view-branch-data',
        ]);
    }

    private function createInitialUsers(): void
    {
        $headOffice = Branch::where('brak', 'HO')->first();
        $mainOffice = Branch::where('brak', 'MO')->first();

        // All seed accounts use a consistent test password and have 2FA disabled
        // so they can be used immediately for development/testing.
        $defaultPassword = Hash::make('Admin@Sigcard2025!');

        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@sigcard.com'],
            [
                'firstname' => 'System',
                'lastname' => 'Administrator',
                'username' => 'sysadmin',
                'password' => $defaultPassword,
                'employee_id' => 'ADMIN001',
                'department' => 'IT Administration',
                'branch_id' => $headOffice?->id,
                'employee_position' => 'System Administrator',
                'status' => 'active',
                'password_expires_at' => null,
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
                'failed_login_attempts' => 0,
                'account_locked_at' => null,
            ]
        );
        $superAdmin->syncRoles('admin');

        $complianceAuditor = User::updateOrCreate(
            ['email' => 'compliance@sigcard.com'],
            [
                'firstname' => 'Maria',
                'lastname' => 'Santos',
                'username' => 'msantos',
                'password' => $defaultPassword,
                'employee_id' => 'COMP001',
                'department' => 'Compliance & Audit',
                'branch_id' => $headOffice?->id,
                'employee_position' => 'Compliance Auditor',
                'status' => 'active',
                'password_expires_at' => null,
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
                'failed_login_attempts' => 0,
                'account_locked_at' => null,
            ]
        );
        $complianceAuditor->syncRoles('compliance-audit');

        $branchManager = User::updateOrCreate(
            ['email' => 'manager@sigcard.com'],
            [
                'firstname' => 'Juan',
                'lastname' => 'Dela Cruz',
                'username' => 'jdelacruz',
                'password' => $defaultPassword,
                'employee_id' => 'MGR001',
                'department' => 'Operations',
                'branch_id' => $mainOffice?->id,
                'employee_position' => 'Branch Manager',
                'status' => 'active',
                'password_expires_at' => null,
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
                'failed_login_attempts' => 0,
                'account_locked_at' => null,
            ]
        );
        $branchManager->syncRoles('manager');

        $regularUser = User::updateOrCreate(
            ['email' => 'user@sigcard.com'],
            [
                'firstname' => 'Ana',
                'lastname' => 'Reyes',
                'username' => 'areyes',
                'password' => $defaultPassword,
                'employee_id' => 'USR001',
                'department' => 'Customer Service',
                'branch_id' => $mainOffice?->id,
                'employee_position' => 'Banking Officer',
                'status' => 'active',
                'password_expires_at' => null,
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
                'failed_login_attempts' => 0,
                'account_locked_at' => null,
            ]
        );
        $regularUser->syncRoles('user');

        $cashier = User::updateOrCreate(
            ['email' => 'cashier@sigcard.com'],
            [
                'firstname' => 'Carlos',
                'lastname' => 'Mendoza',
                'username' => 'cmendoza',
                'password' => $defaultPassword,
                'employee_id' => 'CSH001',
                'department' => 'Operations',
                'branch_id' => $mainOffice?->id,
                'employee_position' => 'Cashier',
                'status' => 'active',
                'password_expires_at' => null,
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
                'failed_login_attempts' => 0,
                'account_locked_at' => null,
            ]
        );
        $cashier->syncRoles('cashier');

        echo "DIGICUR Roles, Permissions, and Users seeded successfully.\n";
    }
}
