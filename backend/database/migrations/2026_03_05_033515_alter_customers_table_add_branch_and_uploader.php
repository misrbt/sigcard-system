<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Replace loose branch_code string with a proper FK to branches
            $table->dropColumn('branch_code');

            $table->foreignId('branch_id')
                ->nullable()
                ->after('suffix')
                ->constrained('branches')
                ->nullOnDelete();

            // Track which user uploaded this customer record
            $table->foreignId('uploaded_by')
                ->nullable()
                ->after('branch_id')
                ->constrained('users')
                ->nullOnDelete();

            // Rename to snake_case per Laravel convention
            $table->renameColumn('accountType', 'account_type');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('uploaded_by');
            $table->dropConstrainedForeignId('branch_id');
            $table->renameColumn('account_type', 'accountType');
            $table->string('branch_code')->nullable();
        });
    }
};
