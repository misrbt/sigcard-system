<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['employee_id']);
            $table->dropIndex(['department']);
            $table->dropColumn(['employee_id', 'department', 'employee_position', 'phone_number']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('employee_id')->unique()->nullable()->after('email');
            $table->string('department')->nullable()->after('employee_id');
            $table->string('employee_position')->nullable();
            $table->string('phone_number')->nullable();
            $table->index(['employee_id']);
            $table->index(['department']);
        });
    }
};
