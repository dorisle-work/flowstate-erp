<?php

declare(strict_types=1);

namespace App\Actions\Order;

use App\DTOs\Order\CreateOrderDTO;
use App\DTOs\Order\OrderLineDTO;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

final class CreateOrderAction
{
    public function execute(CreateOrderDTO $dto): Order
    {
        return DB::transaction(function () use ($dto): Order {
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

            $order = Order::query()->create([
                'code' => $this->nextCode(),
                'branch_id' => $dto->branchId,
                'customer_id' => $dto->customerId,
                'created_by' => $dto->createdBy,
                'status' => OrderStatus::Draft,
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
                'cost_price' => $cost,
            ]);

            $order->items()->createMany($lines);

            return $order->load('items');
        });
    }

    private function nextCode(): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $code = sprintf('ORD-%s-%s', now()->format('Ymd'), strtoupper(Str::random(6)));

            $exists = Order::query()->withoutGlobalScopes()->where('code', $code)->exists();

            if (! $exists) {
                return $code;
            }
        }

        throw new RuntimeException('Unable to generate a unique order code.');
    }
}
