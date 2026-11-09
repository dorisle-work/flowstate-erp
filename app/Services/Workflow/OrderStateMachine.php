<?php

declare(strict_types=1);

namespace App\Services\Workflow;

use App\Contracts\OrderStateMachineInterface;
use App\DTOs\Order\TransitionStateDTO;
use App\Enums\OrderStatus;
use App\Events\OrderStateChanged;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\Order;

final class OrderStateMachine implements OrderStateMachineInterface
{
    /**
     * Legal edges of the order lifecycle. Anything outside this map is rejected.
     *
     * @var array<string, list<OrderStatus>>
     */
    private const TRANSITIONS = [
        'draft' => [OrderStatus::PendingApproval, OrderStatus::Cancelled],
        'pending_approval' => [OrderStatus::Approved, OrderStatus::Rejected, OrderStatus::Cancelled],
        'approved' => [OrderStatus::Dispatched, OrderStatus::Cancelled],
        'rejected' => [],
        'dispatched' => [OrderStatus::Completed],
        'completed' => [],
        'cancelled' => [],
    ];

    public function can(OrderStatus $from, OrderStatus $to): bool
    {
        return in_array($to, $this->allowedTransitions($from), true);
    }

    public function allowedTransitions(OrderStatus $from): array
    {
        return self::TRANSITIONS[$from->value];
    }

    public function transition(Order $order, TransitionStateDTO $dto): Order
    {
        $from = $order->status;

        if (! $this->can($from, $dto->to)) {
            throw InvalidStateTransitionException::between($from, $dto->to);
        }

        $order->allowStatusMutation = true;
        $order->status = $dto->to;
        $order->save();
        $order->allowStatusMutation = false;

        OrderStateChanged::dispatch($order, $from, $dto->to, $dto->actionBy, $dto->note);

        return $order->refresh();
    }
}
