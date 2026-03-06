<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // BSP Compliance Fields
            $table->string('employee_id')->unique()->nullable()->after('email');
            $table->string('department')->nullable()->after('employee_id');
            $table->string('branch_code')->nullable()->after('department');
            $table->enum('status', ['active', 'inactive', 'suspended', 'locked'])->default('active')->after('branch_code');
            $table->string('employee_position')->nullable()->after('status');
            $table->string('phone_number')->nullable()->after('employee_position');

            // Security & Authentication Fields
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('password_expires_at')->nullable();
            $table->integer('failed_login_attempts')->default(0);
            $table->timestamp('account_locked_at')->nullable();
            $table->boolean('two_factor_enabled')->default(false);
            $table->string('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();

            // Audit & Compliance
            $table->timestamp('password_changed_at')->nullable();
            $table->ipAddress('last_login_ip')->nullable();
            $table->string('last_login_user_agent')->nullable();
            $table->boolean('force_password_change')->default(false);
            $table->timestamp('account_expires_at')->nullable();

            // Session Management
            $table->string('session_id')->nullable();
            $table->timestamp('session_expires_at')->nullable();

            // Indexes for performance
            $table->index(['employee_id']);
            $table->index(['department']);
            $table->index(['branch_code']);
            $table->index(['status']);
            $table->index(['last_login_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'employee_id',
                'department',
                'branch_code',
                'status',
                'employee_position',
                'phone_number',
                'last_login_at',
                'password_expires_at',
                'failed_login_attempts',
                'account_locked_at',
                'two_factor_enabled',
                'two_factor_secret',
                'two_factor_recovery_codes',
                'password_changed_at',
                'last_login_ip',
                'last_login_user_agent',
                'force_password_change',
                'account_expires_at',
                'session_id',
                'session_expires_at'
            ]);
        });
    }
};
