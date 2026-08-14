<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * require_two_factor defaults to true so every existing and future
     * user requires 2FA unless an admin explicitly exempts them via
     * User Management. Exempted users authenticate with a static
     * recovery code instead of an authenticator app.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('require_two_factor')->default(true)->after('two_factor_recovery_codes');
            $table->string('recovery_code_hash')->nullable()->after('require_two_factor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['require_two_factor', 'recovery_code_hash']);
        });
    }
};
