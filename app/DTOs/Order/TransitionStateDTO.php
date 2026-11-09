<?php

declare(strict_types=1);

namespace App\DTOs\Order;

use App\Enums\OrderStatus;

final readonly class TransitionStateDTO
{
    public function __construct(
        public OrderStatus $to,
        public int $actionBy,
        public ?string $note = null,
    ) {}
}
