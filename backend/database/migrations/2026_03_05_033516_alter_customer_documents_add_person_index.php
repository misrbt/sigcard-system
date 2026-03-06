<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_documents', function (Blueprint $table) {
            // Identifies which account holder this document belongs to.
            // Regular/Corporate: always 1.
            // Joint: 1 = primary account holder, 2 = secondary account holder.
            $table->tinyInteger('person_index')
                ->unsigned()
                ->default(1)
                ->after('document_type');
        });
    }

    public function down(): void
    {
        Schema::table('customer_documents', function (Blueprint $table) {
            $table->dropColumn('person_index');
        });
    }
};
