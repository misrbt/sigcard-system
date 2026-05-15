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

        // Permissions that were previously seeded but have no implemented API route.
        // Remove them so the role matrix only reflects features that actually exist.
        $removedPermissions = [
            'view-transactions', 'create-transactions', 'edit-transactions',
            'approve-transactions', 'reject-transactions', 'cancel-transactions',
            'view-transaction-history',
            'view-accounts', 'create-accounts', 'edit-accounts', 'close-accounts',
            'transfer-funds', 'approve-transfers', 'view-balances', 'generate-statements',
            'view-reports', 'generate-reports', 'schedule-reports', 'view-financial-reports',
            'verify-customers', 'suspend-customers', 'approve-customer-applications',
            'approve-branch-transactions',
            'manage-security-policies',
        ];
        Permission::whereIn('name', $removedPermissions)->delete();

        $permissions = [
            // User Management
            'view-users', 'create-users', 'edit-users', 'delete-users',
            'activate-users', 'deactivate-users', 'reset-user-passwords', 'unlock-user-accounts',

            // Role and Permission Management
            'view-roles', 'create-roles', 'edit-roles', 'delete-roles',
            'assign-roles', 'view-permissions', 'assign-permissions',

            // Customer Management
            'view-customers', 'create-customers', 'edit-customers', 'view-customer-documents',

            // Compliance and Audit
            'view-audit-logs', 'export-audit-logs',
            'view-compliance-reports', 'generate-compliance-reports',
            'view-risk-assessments', 'create-risk-assessments', 'approve-risk-assessments',

            // Reporting (BSP regulatory — ComplianceController)
            'export-reports', 'view-regulatory-reports',

            // System Administration
            'view-system-settings', 'edit-system-settings', 'view-system-logs',
            'backup-system', 'restore-system',

            // Authentication Management
            'force-password-reset', 'unlock-accounts', 'view-login-attempts',
            'manage-sessions', 'enable-disable-2fa',

            // Branch Operations
            'view-branch-data', 'manage-branch-operations', 'view-branch-reports',
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
            'view-customers', 'create-customers', 'edit-customers', 'view-customer-documents',
            'view-audit-logs', 'view-compliance-reports',
            'view-risk-assessments', 'approve-risk-assessments',
            'view-branch-data', 'manage-branch-operations', 'view-branch-reports',
        ]);

        // 3. User Role
        $userRole = Role::firstOrCreate(['name' => 'user']);
        $userRole->syncPermissions([
            'view-customers', 'create-customers', 'edit-customers', 'view-customer-documents',
        ]);

        $compliancePermissions = [
            'view-audit-logs', 'export-audit-logs',
            'view-compliance-reports', 'generate-compliance-reports',
            'view-risk-assessments', 'create-risk-assessments',
            'export-reports', 'view-regulatory-reports',
            'view-users', 'view-customers', 'view-customer-documents',
            'view-login-attempts', 'view-system-logs',
            'view-branch-data', 'view-branch-reports',
        ];

        // 4. Compliance Role
        $complianceRole = Role::firstOrCreate(['name' => 'compliance']);
        $complianceRole->syncPermissions($compliancePermissions);

        // 5. Audit Role
        $auditRole = Role::firstOrCreate(['name' => 'audit']);
        $auditRole->syncPermissions($compliancePermissions);

        // 6. Cashier Role - Branch-scoped read-only
        $cashierRole = Role::firstOrCreate(['name' => 'cashier']);
        $cashierRole->syncPermissions([
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

        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@sigcard.com'],
            [
                'firstname' => 'System',
                'lastname' => 'Administrator',
                'username' => 'sysadmin',
                'password' => $defaultPassword,
                'branch_id' => $headOffice?->id,
                'status' => 'active',
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
            ]
        );
        $superAdmin->syncRoles('admin');

        $complianceAuditor = User::firstOrCreate(
            ['username' => 'msantos'],
            [
                'email' => 'msantos@sigcard.com',
                'firstname' => 'Maria',
                'lastname' => 'Santos',
                'password' => $defaultPassword,
                'branch_id' => $headOffice?->id,
                'status' => 'active',
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
            ]
        );
        $complianceAuditor->syncRoles('compliance');

        $branchManager = User::firstOrCreate(
            ['username' => 'jdelacruz'],
            [
                'email' => 'jdelacruz@sigcard.com',
                'firstname' => 'Juan',
                'lastname' => 'Dela Cruz',
                'password' => $defaultPassword,
                'branch_id' => $mainOffice?->id,
                'status' => 'active',
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
            ]
        );
        $branchManager->syncRoles('manager');

        $regularUser = User::firstOrCreate(
            ['username' => 'areyes'],
            [
                'email' => 'areyes@sigcard.com',
                'firstname' => 'Ana',
                'lastname' => 'Reyes',
                'password' => $defaultPassword,
                'branch_id' => $mainOffice?->id,
                'status' => 'active',
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
            ]
        );
        $regularUser->syncRoles('user');

        $cashier = User::firstOrCreate(
            ['username' => 'cmendoza'],
            [
                'email' => 'cmendoza@sigcard.com',
                'firstname' => 'Carlos',
                'lastname' => 'Mendoza',
                'password' => $defaultPassword,
                'branch_id' => $mainOffice?->id,
                'status' => 'active',
                'password_changed_at' => now(),
                'force_password_change' => false,
                'two_factor_enabled' => false,
            ]
        );
        $cashier->syncRoles('cashier');

        echo "DIGICUR Roles, Permissions, and Users seeded successfully.\n";
    }
}
