<?php

declare(strict_types=1);

namespace App\Actions\Order;

use App\Actions\Inventory\DeductStockAction;
use App\Actions\Order\Concerns\LocksOrder;
use App\Contracts\OrderStateMachineInterface;
use App\DTOs\Order\TransitionStateDTO;
use App\Enums\OrderStatus;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

final class DispatchOrderAction
{
    use LocksOrder;

    public function __construct(
        private readonly DeductStockAction $deductStock,
        private readonly OrderStateMachineInterface $stateMachine,
    ) {}

    public function execute(Order $order, TransitionStateDTO $dto): Order
    {
        return DB::transaction(function () use ($order, $dto): Order {
            $locked = $this->lockOrder($order);

            if ($locked->status !== OrderStatus::Approved) {
                throw InvalidStateTransitionException::between($locked->status, OrderStatus::Dispatched);
            }

            $this->deductStock->execute($locked, $dto->actionBy);

            return $this->stateMachine->transition($locked, new TransitionStateDTO(
                to: OrderStatus::Dispatched,
                actionBy: $dto->actionBy,
                note: $dto->note,
            ));
        }, 3);
    }
}
