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
        Schema::table('customer_documents', function (Blueprint $table) {
            $table->string('account_status', 50)->nullable()->after('person_index');
            $table->boolean('is_current')->default(true)->after('account_status');
            $table->index(['customer_id', 'is_current']);
        });
    }

    public function down(): void
    {
        Schema::table('customer_documents', function (Blueprint $table) {
            $table->dropIndex(['customer_id', 'is_current']);
            $table->dropColumn(['account_status', 'is_current']);
        });
    }
};
