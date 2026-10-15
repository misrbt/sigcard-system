<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * password_only_login lets an admin grant a single user a special
     * exemption: email and password alone log them in, with no
     * authenticator app and no recovery code. Defaults to off for everyone.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('password_only_login')->default(false)->after('recovery_code_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('password_only_login');
        });
    }
};
