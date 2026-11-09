<?php

declare(strict_types=1);

namespace App\Services\Ledger;

use App\Contracts\StockLedgerInterface;
use App\DTOs\Inventory\StockMovementDTO;
use App\Models\InventoryTransaction;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class StockLedgerService implements StockLedgerInterface
{
    public function record(StockMovementDTO $movement): InventoryTransaction
    {
        if (DB::transactionLevel() < 1) {
            throw new RuntimeException('Stock ledger entries must be written inside a database transaction.');
        }

        return InventoryTransaction::query()->create([
            'reference_code' => $movement->referenceCode,
            'reference_type' => $movement->type,
            'branch_id' => $movement->branchId,
            'product_id' => $movement->productId,
            'quantity_delta' => $movement->quantityDelta,
            'balance_after' => $movement->balanceAfter,
            'created_by' => $movement->createdBy,
        ]);
    }
}
