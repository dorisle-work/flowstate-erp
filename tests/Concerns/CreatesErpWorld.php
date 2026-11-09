<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;

trait CreatesErpWorld
{
    /**
     * @return array{
     *     hn: Branch,
     *     hcm: Branch,
     *     product: Product,
     *     inventory: Inventory,
     *     sales: User,
     *     manager: User,
     *     salesHcm: User,
     *     superAdmin: User
     * }
     */
    protected function erpWorld(int $physicalQuantity = 10): array
    {
        $this->seed(RoleAndPermissionSeeder::class);

        $hn = Branch::query()->create([
            'name' => 'Hà Nội',
            'code' => 'HN',
            'address' => 'Hà Nội',
        ]);
        $hcm = Branch::query()->create([
            'name' => 'TP.HCM',
            'code' => 'HCM',
            'address' => 'TP.HCM',
        ]);
        $product = Product::query()->create([
            'sku' => 'FS-TEST',
            'name' => 'Test SKU',
            'unit' => 'pcs',
            'unit_price' => '100.00',
            'cost_price' => '40.00',
        ]);
        $inventory = Inventory::query()->create([
            'branch_id' => $hn->id,
            'product_id' => $product->id,
            'physical_quantity' => $physicalQuantity,
            'reserved_quantity' => 0,
            'safety_stock' => 0,
        ]);

        $sales = User::factory()->create(['branch_id' => $hn->id]);
        $sales->assignRole('sales-staff');
        $manager = User::factory()->create(['branch_id' => $hn->id]);
        $manager->assignRole('branch-manager');
        $salesHcm = User::factory()->create(['branch_id' => $hcm->id]);
        $salesHcm->assignRole('sales-staff');
        $superAdmin = User::factory()->create(['branch_id' => null]);
        $superAdmin->assignRole('super-admin');

        return compact('hn', 'hcm', 'product', 'inventory', 'sales', 'manager', 'salesHcm', 'superAdmin');
    }
}
