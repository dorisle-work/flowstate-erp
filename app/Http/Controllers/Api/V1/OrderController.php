<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Order\CreateOrderAction;
use App\Actions\Order\UpdateOrderAction;
use App\DTOs\Order\CreateOrderDTO;
use App\DTOs\Order\OrderLineDTO;
use App\Enums\OrderStatus;
use App\Exceptions\InvalidStateTransitionException;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Order\StoreOrderRequest;
use App\Http\Requests\V1\Order\UpdateOrderRequest;
use App\Http\Resources\V1\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use OpenApi\Attributes as OA;

final class OrderController extends Controller
{
    #[OA\Get(
        path: '/api/v1/orders',
        operationId: 'ordersIndex',
        summary: 'List orders',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        responses: [
            new OA\Response(response: 200, description: 'Order collection', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ],
    )]
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Order::class);

        $orders = Order::query()
            ->with([
                'branch',
                'customer',
                'items.product',
                'approvalLogs.actor.roles',
            ])
            ->latest('id')
            ->get();

        return OrderResource::collection($orders);
    }

    #[OA\Post(
        path: '/api/v1/orders',
        operationId: 'ordersStore',
        summary: 'Create draft order',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['branch_id', 'items'],
                properties: [
                    new OA\Property(property: 'branch_id', type: 'integer', example: 1),
                    new OA\Property(property: 'customer_id', type: 'integer', nullable: true, example: 101),
                    new OA\Property(property: 'branchId', type: 'integer', nullable: true, description: 'CamelCase alias'),
                    new OA\Property(property: 'customerId', type: 'integer', nullable: true, description: 'CamelCase alias'),
                    new OA\Property(
                        property: 'items',
                        type: 'array',
                        items: new OA\Items(
                            required: ['product_id', 'quantity'],
                            properties: [
                                new OA\Property(property: 'product_id', type: 'integer'),
                                new OA\Property(property: 'quantity', type: 'integer', minimum: 1),
                                new OA\Property(property: 'unit_price', type: 'number', nullable: true),
                            ],
                            type: 'object',
                        ),
                    ),
                    new OA\Property(
                        property: 'lines',
                        type: 'array',
                        nullable: true,
                        description: 'UI alias for items; may use sku',
                        items: new OA\Items(type: 'object'),
                    ),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function store(StoreOrderRequest $request, CreateOrderAction $action): JsonResponse
    {
        $order = $action->execute($this->toDto($request));

        return (new OrderResource($order))
            ->response()
            ->setStatusCode(201);
    }

    #[OA\Get(
        path: '/api/v1/orders/{order}',
        operationId: 'ordersShow',
        summary: 'Show order',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Order', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Not found'),
        ],
    )]
    public function show(Order $order): OrderResource
    {
        $this->authorize('view', $order);

        $order->load([
            'branch',
            'customer',
            'items.product',
            'approvalLogs.actor.roles',
        ]);

        return new OrderResource($order);
    }

    #[OA\Put(
        path: '/api/v1/orders/{order}',
        operationId: 'ordersUpdate',
        summary: 'Update draft order',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['items'],
                properties: [
                    new OA\Property(property: 'customer_id', type: 'integer', nullable: true),
                    new OA\Property(
                        property: 'items',
                        type: 'array',
                        items: new OA\Items(
                            required: ['product_id', 'quantity'],
                            properties: [
                                new OA\Property(property: 'product_id', type: 'integer'),
                                new OA\Property(property: 'quantity', type: 'integer', minimum: 1),
                                new OA\Property(property: 'unit_price', type: 'number', nullable: true),
                            ],
                            type: 'object',
                        ),
                    ),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 422, description: 'Validation / not draft', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    #[OA\Patch(
        path: '/api/v1/orders/{order}',
        operationId: 'ordersPatch',
        summary: 'Update draft order (PATCH)',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['items'],
                properties: [
                    new OA\Property(property: 'customer_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'items', type: 'array', items: new OA\Items(type: 'object')),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(type: 'object')),
        ],
    )]
    public function update(UpdateOrderRequest $request, Order $order, UpdateOrderAction $action): OrderResource
    {
        $order = $action->execute($order, $this->toDto($request, $order->branch_id));

        return new OrderResource($order);
    }

    #[OA\Delete(
        path: '/api/v1/orders/{order}',
        operationId: 'ordersDestroy',
        summary: 'Delete draft order',
        security: [['sanctum' => []]],
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/OrderId'),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 409, description: 'Not draft'),
        ],
    )]
    public function destroy(Order $order): Response
    {
        $this->authorize('delete', $order);

        if ($order->status !== OrderStatus::Draft) {
            throw InvalidStateTransitionException::between($order->status, OrderStatus::Cancelled);
        }

        $order->items()->delete();
        $order->delete();

        return response()->noContent();
    }

    private function toDto(StoreOrderRequest|UpdateOrderRequest $request, ?int $branchId = null): CreateOrderDTO
    {
        /** @var array<string, mixed> $payload */
        $payload = $request->validated();

        $items = array_map(static function (array $item): OrderLineDTO {
            $unitPrice = $item['unit_price'] ?? null;

            return new OrderLineDTO(
                productId: (int) $item['product_id'],
                quantity: (int) $item['quantity'],
                unitPrice: $unitPrice === null ? null : number_format((float) $unitPrice, 2, '.', ''),
            );
        }, $payload['items']);

        return new CreateOrderDTO(
            branchId: $branchId ?? (int) $payload['branch_id'],
            customerId: isset($payload['customer_id']) ? (int) $payload['customer_id'] : null,
            createdBy: (int) $request->user()->id,
            items: $items,
        );
    }
}
