<?php

declare(strict_types=1);

namespace App\DTOs\Inventory;

use App\Enums\InventoryTxType;

final readonly class StockMovementDTO
{
    public function __construct(
        public int $branchId,
        public int $productId,
        public int $quantityDelta,
        public int $balanceAfter,
        public InventoryTxType $type,
        public string $referenceCode,
        public ?int $createdBy = null,
    ) {}
}
