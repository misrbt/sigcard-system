<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        $branches = [
            ['branch_name' => 'Head Office', 'brak' => 'HO', 'brcode' => '00'],
            ['branch_name' => 'Main Office', 'brak' => 'MO', 'brcode' => '01'],
            ['branch_name' => 'Jasaan', 'brak' => 'JB', 'brcode' => '02'],
            ['branch_name' => 'Salay', 'brak' => 'SB', 'brcode' => '03'],
            ['branch_name' => 'CDO', 'brak' => 'CDOB', 'brcode' => '04'],
            ['branch_name' => 'Maramag', 'brak' => 'MB', 'brcode' => '05'],
            ['branch_name' => 'Gingoog BLU', 'brak' => 'GNG-BLU', 'brcode' => '06'],
            ['branch_name' => 'Camiguin BLU', 'brak' => 'CMG-BLU', 'brcode' => '07'],
            ['branch_name' => 'Butuan BLU', 'brak' => 'BXU-BLU', 'brcode' => '08'],
            ['branch_name' => 'Kibawe BLU', 'brak' => 'KIBAWE-BLU', 'brcode' => '09'],
            ['branch_name' => 'Claveria BLU', 'brak' => 'Claveria-BLU', 'brcode' => '10'],
        ];

        foreach ($branches as $branch) {
            Branch::firstOrCreate(['brcode' => $branch['brcode']], $branch);
        }

        echo "Branches seeded successfully! (" . count($branches) . " branches)\n";
    }
}
