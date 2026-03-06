<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('name', 'firstname');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('lastname')->after('firstname');
            $table->string('username')->unique()->after('lastname');
            $table->string('photo')->nullable()->after('password');
            $table->foreignId('branch_id')->nullable()->after('department')->constrained('branches')->nullOnDelete();

            $table->dropIndex(['branch_code']);
            $table->dropColumn('branch_code');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('branch_code')->nullable()->after('department');
            $table->index('branch_code');

            $table->dropForeign(['branch_id']);
            $table->dropColumn(['branch_id', 'lastname', 'username', 'photo']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('firstname', 'name');
        });
    }
};
