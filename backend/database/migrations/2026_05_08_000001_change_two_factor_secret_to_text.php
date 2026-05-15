<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Laravel's encrypt() produces Base64-encoded cipher text that can
     * easily exceed 255 characters. The original string() definition
     * (VARCHAR 255) causes a SQLSTATE[22001] truncation error when the
     * encrypted secret is saved. Changing to text() removes the limit.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('two_factor_secret')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('two_factor_secret')->nullable()->change();
        });
    }
};
