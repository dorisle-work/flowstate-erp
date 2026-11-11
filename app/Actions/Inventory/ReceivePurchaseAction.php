<?php

declare(strict_types=1);

namespace App\Actions\Inventory;

use App\Contracts\StockLedgerInterface;
use App\DTOs\Inventory\StockMovementDTO;
use App\Enums\InventoryTxType;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Product;
use App\Scopes\BranchScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class ReceivePurchaseAction
{
    public function __construct(private readonly StockLedgerInterface $ledger) {}

    /**
     * @return array{inventory: Inventory, transaction: InventoryTransaction}
     */
    public function execute(int $branchId, int $productId, int $quantity, int $actorId, ?string $supplierRef = null): array
    {
        if ($quantity < 1) {
            throw ValidationException::withMessages([
                'quantity' => ['Purchase quantity must be at least 1.'],
            ]);
        }

        return DB::transaction(function () use ($branchId, $productId, $quantity, $actorId, $supplierRef): array {
            Product::query()->findOrFail($productId);

            $inventory = Inventory::query()
                ->withoutGlobalScope(BranchScope::class)
                ->where('branch_id', $branchId)
                ->where('product_id', $productId)
                ->lockForUpdate()
                ->first();

            if ($inventory === null) {
                $inventory = Inventory::query()->create([
                    'branch_id' => $branchId,
                    'product_id' => $productId,
                    'physical_quantity' => 0,
                    'reserved_quantity' => 0,
                    'safety_stock' => 20,
                ]);
                $inventory = Inventory::query()
                    ->withoutGlobalScope(BranchScope::class)
                    ->whereKey($inventory->id)
                    ->lockForUpdate()
                    ->firstOrFail();
            }

            $inventory->physical_quantity += $quantity;
            $inventory->save();

            $reference = $supplierRef && trim($supplierRef) !== ''
                ? substr(trim($supplierRef), 0, 64)
                : sprintf('PN-%s-%s', now()->format('Ymd'), strtoupper(Str::random(5)));

            $transaction = $this->ledger->record(new StockMovementDTO(
                branchId: $branchId,
                productId: $productId,
                quantityDelta: $quantity,
                balanceAfter: $inventory->physical_quantity,
                type: InventoryTxType::PurchaseReceipt,
                referenceCode: $reference,
                createdBy: $actorId,
            ));

            return [
                'inventory' => $inventory->load(['product', 'branch']),
                'transaction' => $transaction,
            ];
        });
    }
}
