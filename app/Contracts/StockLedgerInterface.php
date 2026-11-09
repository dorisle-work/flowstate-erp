<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\Inventory\StockMovementDTO;
use App\Models\InventoryTransaction;

interface StockLedgerInterface
{
    /**
     * Append an immutable ledger row. Callers must already hold the inventory
     * row lock inside the same database transaction.
     */
    public function record(StockMovementDTO $movement): InventoryTransaction;
}
