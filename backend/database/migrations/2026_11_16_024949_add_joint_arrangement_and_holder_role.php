<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * joint_arrangement: AND / OR for regular (Non-ITF) joint accounts,
     * Sole Trustee / Joint Trustee for ITF accounts. Null for older records
     * until staff set it.
     *
     * customer_holders.role: for ITF accounts, whether the person is a
     * "trustee" or the "beneficiary" (In-Trust-For). Null for non-ITF.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('joint_arrangement')->nullable()->after('joint_sub_type');
        });

        Schema::table('customer_holders', function (Blueprint $table) {
            $table->string('role')->nullable()->after('person_index');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('joint_arrangement');
        });

        Schema::table('customer_holders', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
