<?php

declare(strict_types=1);

namespace App\Actions\Order;

use App\Actions\Inventory\ReserveStockAction;
use App\Actions\Order\Concerns\LocksOrder;
use App\Contracts\OrderStateMachineInterface;
use App\DTOs\Order\TransitionStateDTO;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

final class CancelOrderAction
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

            if ($locked->status->holdsReservation()) {
                $this->reserveStock->release($locked);
            }

            return $this->stateMachine->transition($locked, new TransitionStateDTO(
                to: OrderStatus::Cancelled,
                actionBy: $dto->actionBy,
                note: $dto->note,
            ));
        }, 3);
    }
}
