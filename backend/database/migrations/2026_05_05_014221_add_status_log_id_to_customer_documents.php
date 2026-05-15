<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_documents', function (Blueprint $table) {
            $table->foreignId('status_log_id')
                ->nullable()
                ->after('account_status')
                ->constrained('customer_status_logs')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('customer_documents', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\CustomerStatusLog::class);
            $table->dropColumn('status_log_id');
        });
    }
};
