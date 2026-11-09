<?php

declare(strict_types=1);

namespace App\Actions\Inventory;

use App\Contracts\StockLedgerInterface;
use App\DTOs\Inventory\StockMovementDTO;
use App\Enums\InventoryTxType;
use App\Exceptions\InsufficientStockException;
use App\Models\Inventory;
use App\Models\Order;
use App\Scopes\BranchScope;

final class DeductStockAction
{
    public function __construct(private readonly StockLedgerInterface $ledger) {}

    public function execute(Order $order, int $actorId): void
    {
        foreach ($order->items as $item) {
            $inventory = Inventory::query()
                ->withoutGlobalScope(BranchScope::class)
                ->where('branch_id', $order->branch_id)
                ->where('product_id', $item->product_id)
                ->lockForUpdate()
                ->first();

            $onHand = $inventory?->physical_quantity ?? 0;
            $reservedForLine = $item->reserved_quantity;

            if (
                $inventory === null
                || $onHand < $item->quantity
                || $reservedForLine < $item->quantity
            ) {
                throw new InsufficientStockException(
                    $item->product_id,
                    $item->quantity,
                    $onHand,
                    $order->branch_id,
                );
            }

            $inventory->physical_quantity -= $item->quantity;
            $inventory->reserved_quantity = max(0, $inventory->reserved_quantity - $item->quantity);
            $inventory->save();

            $item->reserved_quantity = 0;
            $item->save();

            $this->ledger->record(new StockMovementDTO(
                branchId: $order->branch_id,
                productId: $item->product_id,
                quantityDelta: -$item->quantity,
                balanceAfter: $inventory->physical_quantity,
                type: InventoryTxType::OrderDispatch,
                referenceCode: $order->code,
                createdBy: $actorId,
            ));
        }
    }
}
