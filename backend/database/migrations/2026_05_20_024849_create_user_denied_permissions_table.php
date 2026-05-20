<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_denied_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('permission_name');
            $table->timestamps();
            $table->unique(['user_id', 'permission_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_denied_permissions');
    }
};
