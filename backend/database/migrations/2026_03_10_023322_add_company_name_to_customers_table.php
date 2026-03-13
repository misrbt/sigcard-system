<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('company_name')->nullable()->after('suffix');
            $table->string('firstname')->nullable()->change();
            $table->string('lastname')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('company_name');
            $table->string('firstname')->nullable(false)->change();
            $table->string('lastname')->nullable(false)->change();
        });
    }
};
