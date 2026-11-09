<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Order\ApproveOrderAction;
use App\Actions\Order\CancelOrderAction;
use App\Actions\Order\CompleteOrderAction;
use App\Actions\Order\DispatchOrderAction;
use App\Actions\Order\RejectOrderAction;
use App\Actions\Order\SubmitOrderAction;
use App\DTOs\Order\TransitionStateDTO;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Order\TransitionStateRequest;
use App\Http\Resources\V1\OrderResource;
use App\Models\Order;

final class OrderWorkflowController extends Controller
{
    public function submit(TransitionStateRequest $request, Order $order, SubmitOrderAction $action): OrderResource
    {
        $this->authorize('submit', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::PendingApproval)));
    }

    public function approve(TransitionStateRequest $request, Order $order, ApproveOrderAction $action): OrderResource
    {
        $this->authorize('approve', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::Approved)));
    }

    public function reject(TransitionStateRequest $request, Order $order, RejectOrderAction $action): OrderResource
    {
        $this->authorize('reject', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::Rejected)));
    }

    public function dispatch(TransitionStateRequest $request, Order $order, DispatchOrderAction $action): OrderResource
    {
        $this->authorize('dispatch', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::Dispatched)));
    }

    public function complete(TransitionStateRequest $request, Order $order, CompleteOrderAction $action): OrderResource
    {
        $this->authorize('complete', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::Completed)));
    }

    public function cancel(TransitionStateRequest $request, Order $order, CancelOrderAction $action): OrderResource
    {
        $this->authorize('cancel', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::Cancelled)));
    }

    private function dto(TransitionStateRequest $request, OrderStatus $to): TransitionStateDTO
    {
        return new TransitionStateDTO(
            to: $to,
            actionBy: (int) $request->user()->id,
            note: $request->validated('note'),
        );
    }
}
