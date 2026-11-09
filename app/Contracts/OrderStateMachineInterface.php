<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\Order\TransitionStateDTO;
use App\Enums\OrderStatus;
use App\Models\Order;

interface OrderStateMachineInterface
{
    public function can(OrderStatus $from, OrderStatus $to): bool;

    /**
     * @return list<OrderStatus>
     */
    public function allowedTransitions(OrderStatus $from): array;

    public function transition(Order $order, TransitionStateDTO $dto): Order;
}
