<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->boolean('is_head_office')->default(false)->after('parent_id');
        });

        // Mark the existing Head Office row using brcode '00' (the only stable numeric identifier)
        DB::table('branches')->where('brcode', '00')->update(['is_head_office' => true]);
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('is_head_office');
        });
    }
};
