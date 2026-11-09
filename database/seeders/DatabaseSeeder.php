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
    private const OPENING_QUANTITY = 100;

    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            BranchSeeder::class,
        ]);

        $branches = Branch::query()->whereIn('code', ['HN', 'HCM'])->get()->keyBy('code');
        $superAdmin = $this->seedUsers($branches['HN'], $branches['HCM']);
        $this->seedCatalog($branches->all(), $superAdmin);
    }

    private function seedUsers(Branch $hanoi, Branch $hoChiMinh): User
    {
        $superAdmin = $this->user('Super Admin', 'superadmin@flowstate.test', null, 'super-admin');
        $this->user('Quản lý Hà Nội', 'manager.hn@flowstate.test', $hanoi->id, 'branch-manager');
        $this->user('Quản lý TP.HCM', 'manager.hcm@flowstate.test', $hoChiMinh->id, 'branch-manager');
        $this->user('Kinh doanh Hà Nội', 'sales.hn@flowstate.test', $hanoi->id, 'sales-staff');
        $this->user('Kinh doanh TP.HCM', 'sales.hcm@flowstate.test', $hoChiMinh->id, 'sales-staff');

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
                            'safety_stock' => 10,
                        ],
                    );

                    $reference = sprintf('OPEN-%s-%s', $branch->code, $product->sku);
                    $alreadyPosted = $inventory->ledgerEntries()
                        ->where('reference_code', $reference)
                        ->exists();

                    if ($alreadyPosted) {
                        return;
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

    /**
     * @return list<array{sku: string, name: string, unit_price: string, cost_price: string}>
     */
    private function catalog(): array
    {
        return [
            ['sku' => 'FS-001', 'name' => 'A4 Paper Ream', 'unit_price' => '85.00', 'cost_price' => '62.00'],
            ['sku' => 'FS-002', 'name' => 'Ballpoint Pen Blue', 'unit_price' => '8.00', 'cost_price' => '3.50'],
            ['sku' => 'FS-003', 'name' => 'Gel Pen Black', 'unit_price' => '12.00', 'cost_price' => '6.00'],
            ['sku' => 'FS-004', 'name' => 'Sticky Notes Pad', 'unit_price' => '18.00', 'cost_price' => '9.50'],
            ['sku' => 'FS-005', 'name' => 'Stapler No.10', 'unit_price' => '45.00', 'cost_price' => '28.00'],
            ['sku' => 'FS-006', 'name' => 'Staples Box', 'unit_price' => '15.00', 'cost_price' => '7.00'],
            ['sku' => 'FS-007', 'name' => 'Binder Clip 32mm', 'unit_price' => '22.00', 'cost_price' => '11.00'],
            ['sku' => 'FS-008', 'name' => 'File Folder A4', 'unit_price' => '9.00', 'cost_price' => '4.20'],
            ['sku' => 'FS-009', 'name' => 'Archive Box', 'unit_price' => '55.00', 'cost_price' => '34.00'],
            ['sku' => 'FS-010', 'name' => 'Whiteboard Marker', 'unit_price' => '16.00', 'cost_price' => '8.00'],
            ['sku' => 'FS-011', 'name' => 'Desk Organizer', 'unit_price' => '120.00', 'cost_price' => '74.00'],
            ['sku' => 'FS-012', 'name' => 'Notebook A5', 'unit_price' => '35.00', 'cost_price' => '19.00'],
            ['sku' => 'FS-013', 'name' => 'Envelope C5', 'unit_price' => '4.00', 'cost_price' => '1.50'],
            ['sku' => 'FS-014', 'name' => 'Packing Tape', 'unit_price' => '18.00', 'cost_price' => '9.00'],
            ['sku' => 'FS-015', 'name' => 'Scissors 8 inch', 'unit_price' => '42.00', 'cost_price' => '24.00'],
            ['sku' => 'FS-016', 'name' => 'Highlighter Yellow', 'unit_price' => '11.00', 'cost_price' => '5.00'],
            ['sku' => 'FS-017', 'name' => 'USB Cable 1m', 'unit_price' => '65.00', 'cost_price' => '38.00'],
            ['sku' => 'FS-018', 'name' => 'Mouse Pad', 'unit_price' => '49.00', 'cost_price' => '27.00'],
            ['sku' => 'FS-019', 'name' => 'Toner Cartridge', 'unit_price' => '890.00', 'cost_price' => '640.00'],
            ['sku' => 'FS-020', 'name' => 'Shipping Label Roll', 'unit_price' => '75.00', 'cost_price' => '46.00'],
        ];
    }
}
