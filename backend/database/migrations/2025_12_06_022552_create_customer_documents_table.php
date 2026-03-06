<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('customer_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');

            // Document type: each image is stored separately
            // SIGCARD has 2 images: sigcard_front, sigcard_back
            // NAIS has 2 images: nais_front, nais_back
            // Data Privacy has 2 images: privacy_front, privacy_back
            // Other documents can have multiple images
            $table->enum('document_type', [
                'sigcard_front',
                'sigcard_back',
                'nais_front',
                'nais_back',
                'privacy_front',
                'privacy_back',
                'other'
            ]);

            $table->string('file_path'); // Path where the image is stored
            $table->string('file_name'); // Original filename
            $table->string('file_size')->nullable(); // File size in bytes
            $table->string('mime_type')->nullable(); // image/jpeg, image/png, etc.
            $table->timestamps();

            // Index for faster queries
            $table->index(['customer_id', 'document_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_documents');
    }
};
