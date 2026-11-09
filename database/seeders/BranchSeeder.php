<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        Branch::query()->updateOrCreate(
            ['code' => 'HN'],
            ['name' => 'Hà Nội', 'address' => '36 Lý Nam Đế, Ba Đình, Hà Nội'],
        );

        Branch::query()->updateOrCreate(
            ['code' => 'HCM'],
            ['name' => 'TP.HCM', 'address' => '45 Lê Duẩn, Quận 1, TP.HCM'],
        );
    }
}
