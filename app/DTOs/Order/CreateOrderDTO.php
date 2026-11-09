<?php

declare(strict_types=1);

namespace App\DTOs\Order;

final readonly class CreateOrderDTO
{
    /**
     * @param  list<OrderLineDTO>  $items
     */
    public function __construct(
        public int $branchId,
        public ?int $customerId,
        public int $createdBy,
        public array $items,
    ) {}
}
