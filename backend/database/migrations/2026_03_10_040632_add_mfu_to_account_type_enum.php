<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE customers MODIFY account_type ENUM('Regular', 'Joint', 'Corporate', 'MFU') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE customers MODIFY account_type ENUM('Regular', 'Joint', 'Corporate') NOT NULL");
    }
};
