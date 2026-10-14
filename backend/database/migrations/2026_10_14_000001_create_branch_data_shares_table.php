<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branch_data_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('target_branch_id')->constrained('branches')->cascadeOnDelete();
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->boolean('include_documents')->default(true);
            $table->boolean('is_active')->default(true);
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['target_branch_id', 'is_active']);
        });

        // Special case: Surigao BLU (brcode 11) customers opened Jun 1 – Sep 24, 2026
        // are shared with Main Office (brcode 01), including uploaded documents/images.
        $source = DB::table('branches')->where('brcode', '11')->value('id');
        $target = DB::table('branches')->where('brcode', '01')->value('id');

        if ($source && $target) {
            DB::table('branch_data_shares')->insert([
                'source_branch_id' => $source,
                'target_branch_id' => $target,
                'date_from' => '2026-06-01',
                'date_to' => '2026-09-24',
                'include_documents' => true,
                'is_active' => true,
                'notes' => 'Surigao BLU accounts opened Jun 1 - Sep 24, 2026 shared with Main Office',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_data_shares');
    }
};
