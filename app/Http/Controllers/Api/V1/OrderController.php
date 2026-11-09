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
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Order::class);

        $orders = Order::query()
            ->with('items')
            ->latest('id')
            ->paginate($request->integer('per_page', 15));

        return OrderResource::collection($orders);
    }

    public function store(StoreOrderRequest $request, CreateOrderAction $action): JsonResponse
    {
        $order = $action->execute($this->toDto($request));

        return (new OrderResource($order))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Order $order): OrderResource
    {
        $this->authorize('view', $order);

        $order->load(['items', 'approvalLogs']);

        return new OrderResource($order);
    }

    public function update(UpdateOrderRequest $request, Order $order, UpdateOrderAction $action): OrderResource
    {
        $order = $action->execute($order, $this->toDto($request, $order->branch_id));

        return new OrderResource($order);
    }

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
