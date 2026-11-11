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

final class AdjustStockAction
{
    public function __construct(private readonly StockLedgerInterface $ledger) {}

    /**
     * @return array{inventory: Inventory, transaction: InventoryTransaction}
     */
    public function execute(int $branchId, int $productId, int $quantityDelta, int $actorId, ?string $note = null): array
    {
        if ($quantityDelta === 0) {
            throw ValidationException::withMessages([
                'quantity_delta' => ['Quantity delta must not be zero.'],
            ]);
        }

        return DB::transaction(function () use ($branchId, $productId, $quantityDelta, $actorId, $note): array {
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

            $next = $inventory->physical_quantity + $quantityDelta;
            if ($next < 0) {
                throw ValidationException::withMessages([
                    'quantity_delta' => ['Adjustment would make on-hand stock negative.'],
                ]);
            }
            if ($next < $inventory->reserved_quantity) {
                throw ValidationException::withMessages([
                    'quantity_delta' => ['On-hand stock cannot fall below reserved quantity.'],
                ]);
            }

            $inventory->physical_quantity = $next;
            $inventory->save();

            $reference = sprintf('ADJ-%s-%s', now()->format('Ymd'), strtoupper(Str::random(5)));
            if ($note) {
                $reference = substr($reference.'-'.Str::slug(Str::limit($note, 24, '')), 0, 64);
            }

            $transaction = $this->ledger->record(new StockMovementDTO(
                branchId: $branchId,
                productId: $productId,
                quantityDelta: $quantityDelta,
                balanceAfter: $inventory->physical_quantity,
                type: InventoryTxType::StockAdjustment,
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
