<?php

declare(strict_types=1);

namespace App\Actions\Order;

use App\Actions\Inventory\ReserveStockAction;
use App\Actions\Order\Concerns\LocksOrder;
use App\Contracts\OrderStateMachineInterface;
use App\DTOs\Order\TransitionStateDTO;
use App\Enums\OrderStatus;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

final class SubmitOrderAction
{
    use LocksOrder;

    public function __construct(
        private readonly ReserveStockAction $reserveStock,
        private readonly OrderStateMachineInterface $stateMachine,
    ) {}

    public function execute(Order $order, TransitionStateDTO $dto): Order
    {
        return DB::transaction(function () use ($order, $dto): Order {
            $locked = $this->lockOrder($order);

            if (! $this->stateMachine->can($locked->status, OrderStatus::PendingApproval)) {
                throw InvalidStateTransitionException::between($locked->status, OrderStatus::PendingApproval);
            }

            $this->reserveStock->reserve($locked);

            return $this->stateMachine->transition($locked, new TransitionStateDTO(
                to: OrderStatus::PendingApproval,
                actionBy: $dto->actionBy,
                note: $dto->note,
            ));
        }, 3);
    }
}
