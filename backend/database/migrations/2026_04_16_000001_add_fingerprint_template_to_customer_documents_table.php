<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_documents', function (Blueprint $table) {
            // Stores the base64-encoded SourceAFIS fingerprint template
            // extracted from sigcard_front images. NULL = not yet enrolled.
            $table->longText('fingerprint_template')->nullable()->after('mime_type');
        });
    }

    public function down(): void
    {
        Schema::table('customer_documents', function (Blueprint $table) {
            $table->dropColumn('fingerprint_template');
        });
    }
};
