<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE customers MODIFY COLUMN status ENUM('active','dormant','escheat','closed') NOT NULL DEFAULT 'active'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE customers MODIFY COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active'");
    }
};
