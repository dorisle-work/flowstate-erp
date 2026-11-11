<?php

declare(strict_types=1);

namespace App\Actions\Order;

use App\DTOs\Order\CreateOrderDTO;
use App\DTOs\Order\OrderLineDTO;
use App\Enums\OrderStatus;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\Order;
use App\Models\Product;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class UpdateOrderAction
{
    public function execute(Order $order, CreateOrderDTO $dto): Order
    {
        return DB::transaction(function () use ($order, $dto): Order {
            $locked = Order::query()
                ->withoutGlobalScopes()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== OrderStatus::Draft) {
                throw InvalidStateTransitionException::between($locked->status, OrderStatus::Draft);
            }

            $productIds = array_map(static fn (OrderLineDTO $line): int => $line->productId, $dto->items);
            $products = Product::query()->whereIn('id', array_unique($productIds))->get()->keyBy('id');

            if ($products->count() !== count(array_unique($productIds))) {
                throw ValidationException::withMessages([
                    'items' => ['One or more products do not exist.'],
                ]);
            }

            $subtotal = '0.00';
            $cost = '0.00';
            $lines = [];

            foreach ($dto->items as $line) {
                /** @var Product $product */
                $product = $products->get($line->productId);
                $unitPrice = $line->unitPrice ?? (string) $product->unit_price;
                $costPrice = (string) $product->cost_price;
                $lineTotal = Money::mul($unitPrice, $line->quantity);
                $lineCost = Money::mul($costPrice, $line->quantity);
                $subtotal = Money::add($subtotal, $lineTotal);
                $cost = Money::add($cost, $lineCost);

                $lines[] = [
                    'product_id' => $product->id,
                    'unit_price' => $unitPrice,
                    'cost_price' => $costPrice,
                    'quantity' => $line->quantity,
                    'reserved_quantity' => 0,
                    'total_price' => $lineTotal,
                ];
            }

            $locked->fill([
                'customer_id' => $dto->customerId,
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
                'cost_price' => $cost,
            ]);
            $locked->save();
            $locked->items()->delete();
            $locked->items()->createMany($lines);

            return $locked->load([
                'branch',
                'customer',
                'items.product',
                'approvalLogs.actor.roles',
            ]);
        });
    }
}
