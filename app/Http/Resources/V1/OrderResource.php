<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Enums\PermissionEnum;
use App\Models\Order;
use App\Models\OrderItem;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $canViewCost = (bool) $request->user()?->can(PermissionEnum::OrdersViewCostPrice->value);

        return [
            'id' => $this->id,
            'code' => $this->code,
            'branch_id' => $this->branch_id,
            'customer_id' => $this->customer_id,
            'created_by' => $this->created_by,
            'status' => $this->status->value,
            'subtotal' => $this->subtotal,
            'total_amount' => $this->total_amount,
            'cost_price' => $this->when($canViewCost, $this->cost_price),
            'margin_rate' => $this->when(
                $canViewCost,
                Money::marginRate((string) $this->total_amount, (string) $this->cost_price),
            ),
            'items' => $this->whenLoaded('items', function () use ($canViewCost): array {
                return $this->items->map(function (OrderItem $item) use ($canViewCost): array {
                    $payload = [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'total_price' => $item->total_price,
                    ];

                    if ($canViewCost) {
                        $payload['cost_price'] = $item->cost_price;
                    }

                    return $payload;
                })->all();
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
