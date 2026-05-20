<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        $branches = [
            ['branch_name' => 'Head Office', 'brak' => 'HO', 'brcode' => '00', 'is_head_office' => true],
            ['branch_name' => 'Main Office', 'brak' => 'MO', 'brcode' => '01', 'is_head_office' => false],
            ['branch_name' => 'Jasaan', 'brak' => 'JB', 'brcode' => '02', 'is_head_office' => false],
            ['branch_name' => 'Salay', 'brak' => 'SB', 'brcode' => '03', 'is_head_office' => false],
            ['branch_name' => 'CDO', 'brak' => 'CDOB', 'brcode' => '04', 'is_head_office' => false],
            ['branch_name' => 'Maramag', 'brak' => 'MB', 'brcode' => '05', 'is_head_office' => false],
            ['branch_name' => 'Gingoog BLU', 'brak' => 'GNG-BLU', 'brcode' => '06', 'is_head_office' => false],
            ['branch_name' => 'Camiguin BLU', 'brak' => 'CMG-BLU', 'brcode' => '07', 'is_head_office' => false],
            ['branch_name' => 'Butuan BLU', 'brak' => 'BXU-BLU', 'brcode' => '08', 'is_head_office' => false],
            ['branch_name' => 'Kibawe BLU', 'brak' => 'KIBAWE-BLU', 'brcode' => '09', 'is_head_office' => false],
            ['branch_name' => 'Claveria BLU', 'brak' => 'Claveria-BLU', 'brcode' => '10', 'is_head_office' => false],
        ];

        foreach ($branches as $branch) {
            Branch::firstOrCreate(['brcode' => $branch['brcode']], $branch);
        }

        echo 'Branches seeded successfully! ('.count($branches)." branches)\n";
    }
}
