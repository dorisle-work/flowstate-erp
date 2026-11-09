<?php

declare(strict_types=1);

namespace App\DTOs\Order;

final readonly class OrderLineDTO
{
    public function __construct(
        public int $productId,
        public int $quantity,
        public ?string $unitPrice = null,
    ) {}
}
