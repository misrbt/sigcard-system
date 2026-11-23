<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per dormancy reminder that staff have seen. A reminder is identified by the
     * account (main account = null customer_account_id) and the date the 2 years count from,
     * so it comes back only after a new 2-year period.
     */
    public function up(): void
    {
        Schema::create('dormancy_reminder_acknowledgments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_account_id')->nullable()->constrained('customer_accounts')->cascadeOnDelete();
            $table->date('basis_date');
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['customer_id', 'customer_account_id', 'basis_date'], 'dormancy_ack_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dormancy_reminder_acknowledgments');
    }
};
