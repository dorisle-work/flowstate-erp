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
use OpenApi\Attributes as OA;

final class OrderWorkflowController extends Controller
{
    #[OA\Post(
        path: '/api/v1/orders/{order}/submit',
        operationId: 'ordersSubmit',
        summary: 'Submit draft → pending_approval',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'note', type: 'string', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Transitioned', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 409, description: 'Invalid transition'),
        ],
    )]
    public function submit(TransitionStateRequest $request, Order $order, SubmitOrderAction $action): OrderResource
    {
        $this->authorize('submit', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::PendingApproval)));
    }

    #[OA\Post(
        path: '/api/v1/orders/{order}/approve',
        operationId: 'ordersApprove',
        summary: 'Approve pending order',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'note', type: 'string', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Transitioned', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 409, description: 'Invalid transition'),
        ],
    )]
    public function approve(TransitionStateRequest $request, Order $order, ApproveOrderAction $action): OrderResource
    {
        $this->authorize('approve', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::Approved)));
    }

    #[OA\Post(
        path: '/api/v1/orders/{order}/reject',
        operationId: 'ordersReject',
        summary: 'Reject pending order',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'note', type: 'string', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Transitioned', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 409, description: 'Invalid transition'),
        ],
    )]
    public function reject(TransitionStateRequest $request, Order $order, RejectOrderAction $action): OrderResource
    {
        $this->authorize('reject', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::Rejected)));
    }

    #[OA\Post(
        path: '/api/v1/orders/{order}/dispatch',
        operationId: 'ordersDispatch',
        summary: 'Dispatch approved order',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'note', type: 'string', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Transitioned', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 409, description: 'Invalid transition'),
        ],
    )]
    public function dispatch(TransitionStateRequest $request, Order $order, DispatchOrderAction $action): OrderResource
    {
        $this->authorize('dispatch', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::Dispatched)));
    }

    #[OA\Post(
        path: '/api/v1/orders/{order}/complete',
        operationId: 'ordersComplete',
        summary: 'Complete dispatched order',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'note', type: 'string', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Transitioned', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 409, description: 'Invalid transition'),
        ],
    )]
    public function complete(TransitionStateRequest $request, Order $order, CompleteOrderAction $action): OrderResource
    {
        $this->authorize('complete', $order);

        return new OrderResource($action->execute($order, $this->dto($request, OrderStatus::Completed)));
    }

    #[OA\Post(
        path: '/api/v1/orders/{order}/cancel',
        operationId: 'ordersCancel',
        summary: 'Cancel order when allowed by FSM',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'note', type: 'string', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Transitioned', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 409, description: 'Invalid transition'),
        ],
    )]
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
