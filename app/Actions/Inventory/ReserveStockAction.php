<?php

declare(strict_types=1);

namespace App\Actions\Inventory;

use App\Exceptions\InsufficientStockException;
use App\Models\Inventory;
use App\Models\Order;
use App\Scopes\BranchScope;

final class ReserveStockAction
{
    public function reserve(Order $order): void
    {
        foreach ($order->items as $item) {
            $inventory = $this->lockInventory($order->branch_id, $item->product_id, $item->quantity);
            $available = $inventory->physical_quantity - $inventory->reserved_quantity;

            if ($available < $item->quantity) {
                throw new InsufficientStockException(
                    $item->product_id,
                    $item->quantity,
                    max(0, $available),
                    $order->branch_id,
                );
            }

            $inventory->reserved_quantity += $item->quantity;
            $inventory->save();

            $item->reserved_quantity = $item->quantity;
            $item->save();
        }
    }

    public function release(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->reserved_quantity <= 0) {
                continue;
            }

            $inventory = $this->lockInventory($order->branch_id, $item->product_id, $item->reserved_quantity);
            $inventory->reserved_quantity = max(0, $inventory->reserved_quantity - $item->reserved_quantity);
            $inventory->save();

            $item->reserved_quantity = 0;
            $item->save();
        }
    }

    private function lockInventory(int $branchId, int $productId, int $requested): Inventory
    {
        $inventory = Inventory::query()
            ->withoutGlobalScope(BranchScope::class)
            ->where('branch_id', $branchId)
            ->where('product_id', $productId)
            ->lockForUpdate()
            ->first();

        if ($inventory === null) {
            throw new InsufficientStockException($productId, $requested, 0, $branchId);
        }

        return $inventory;
    }
}
