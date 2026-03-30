<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class SyncBranches extends Command
{
    protected $signature = 'sync:branches';
    protected $description = 'Sync branches from the centralized auth API';

    public function handle(): int
    {
        $authUrl = config('services.central_auth.url', 'http://127.0.0.1:8001/api');

        $this->info("Fetching branches from {$authUrl}/branches/sync...");

        try {
            $response = Http::timeout(10)->get("{$authUrl}/branches/sync");

            if (!$response->ok() || !$response->json('success')) {
                $this->error('Failed to fetch branches from central API.');
                return 1;
            }

            $branches = $response->json('data');
            $synced = 0;

            foreach ($branches as $branch) {
                DB::table('branches')->updateOrInsert(
                    ['brcode' => $branch['brcode']],
                    [
                        'branch_name' => $branch['branch_name'],
                        'brak' => $branch['brak'],
                        'brcode' => $branch['brcode'],
                        'updated_at' => now(),
                    ]
                );
                $synced++;
            }

            $this->info("Synced {$synced} branches from central auth API.");
            return 0;

        } catch (\Exception $e) {
            $this->error("Error: {$e->getMessage()}");
            return 1;
        }
    }
}
