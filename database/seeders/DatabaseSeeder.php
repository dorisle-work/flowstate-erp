<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Contracts\StockLedgerInterface;
use App\DTOs\Inventory\StockMovementDTO;
use App\Enums\InventoryTxType;
use App\Models\Branch;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    private const OPENING_QUANTITY = 120;

    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            BranchSeeder::class,
            CustomerSeeder::class,
        ]);

        $branches = Branch::query()->whereIn('code', ['HN', 'HCM', 'DN'])->get()->keyBy('code');
        $superAdmin = $this->seedUsers($branches['HN'], $branches['HCM'], $branches['DN']);
        $this->seedCatalog($branches->all(), $superAdmin);
        $this->seedShortageDemo($branches['HN']);
    }

    private function seedUsers(Branch $hanoi, Branch $hoChiMinh, Branch $daNang): User
    {
        $superAdmin = $this->user('Super Admin', 'superadmin@flowstate.test', null, 'super-admin');
        $this->user('Quản lý Hà Nội', 'manager.hn@flowstate.test', $hanoi->id, 'branch-manager');
        $this->user('Quản lý TP.HCM', 'manager.hcm@flowstate.test', $hoChiMinh->id, 'branch-manager');
        $this->user('Kinh doanh Hà Nội', 'sales.hn@flowstate.test', $hanoi->id, 'sales-staff');
        $this->user('Kinh doanh TP.HCM', 'sales.hcm@flowstate.test', $hoChiMinh->id, 'sales-staff');
        $this->user('Thủ kho Đà Nẵng', 'kho.dn@flowstate.test', $daNang->id, 'warehouse');

        return $superAdmin;
    }

    private function user(string $name, string $email, ?int $branchId, string $role): User
    {
        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => 'password',
                'branch_id' => $branchId,
                'email_verified_at' => now(),
            ],
        );

        $user->roles()->detach();
        $user->assignRole($role);

        return $user;
    }

    /**
     * @param  list<Branch>  $branches
     */
    private function seedCatalog(array $branches, User $actor): void
    {
        $ledger = app(StockLedgerInterface::class);

        foreach ($this->catalog() as $row) {
            $product = Product::query()->updateOrCreate(
                ['sku' => $row['sku']],
                [
                    'name' => $row['name'],
                    'unit' => 'pcs',
                    'unit_price' => $row['unit_price'],
                    'cost_price' => $row['cost_price'],
                ],
            );

            foreach ($branches as $branch) {
                DB::transaction(function () use ($ledger, $product, $branch, $actor): void {
                    $inventory = Inventory::query()->firstOrCreate(
                        [
                            'branch_id' => $branch->id,
                            'product_id' => $product->id,
                        ],
                        [
                            'physical_quantity' => self::OPENING_QUANTITY,
                            'reserved_quantity' => 0,
                            'safety_stock' => 20,
                        ],
                    );

                    $reference = sprintf('OPEN-%s-%s', $branch->code, $product->sku);
                    $alreadyPosted = $inventory->ledgerEntries()
                        ->where('reference_code', $reference)
                        ->exists();

                    if ($alreadyPosted) {
                        return;
                    }

                    if ((int) $inventory->physical_quantity !== self::OPENING_QUANTITY) {
                        $inventory->update([
                            'physical_quantity' => self::OPENING_QUANTITY,
                            'reserved_quantity' => 0,
                            'safety_stock' => 20,
                        ]);
                    }

                    $ledger->record(new StockMovementDTO(
                        branchId: $branch->id,
                        productId: $product->id,
                        quantityDelta: self::OPENING_QUANTITY,
                        balanceAfter: self::OPENING_QUANTITY,
                        type: InventoryTxType::PurchaseReceipt,
                        referenceCode: $reference,
                        createdBy: $actor->id,
                    ));
                });
            }
        }
    }

    private function seedShortageDemo(Branch $hanoi): void
    {
        $product = Product::query()->where('sku', 'FS-014')->first();
        if ($product === null) {
            return;
        }

        Inventory::query()
            ->where('branch_id', $hanoi->id)
            ->where('product_id', $product->id)
            ->update([
                'physical_quantity' => 12,
                'safety_stock' => 20,
            ]);
    }

    /**
     * @return list<array{sku: string, name: string, unit_price: string, cost_price: string}>
     */
    private function catalog(): array
    {
        return [
            ['sku' => 'FS-001', 'name' => 'Gạo ST25 túi 5kg', 'unit_price' => '185000.00', 'cost_price' => '142000.00'],
            ['sku' => 'FS-002', 'name' => 'Cà phê hạt Robusta 1kg', 'unit_price' => '96000.00', 'cost_price' => '71000.00'],
            ['sku' => 'FS-008', 'name' => 'Nước mắm nhĩ 500ml', 'unit_price' => '42000.00', 'cost_price' => '28000.00'],
            ['sku' => 'FS-014', 'name' => 'Thùng carton 5 lớp', 'unit_price' => '12500.00', 'cost_price' => '8000.00'],
            ['sku' => 'FS-017', 'name' => 'Màng co PE 50cm', 'unit_price' => '68000.00', 'cost_price' => '51000.00'],
            ['sku' => 'FS-020', 'name' => 'Khay nhựa 600×400', 'unit_price' => '74000.00', 'cost_price' => '56000.00'],
        ];
    }
}
