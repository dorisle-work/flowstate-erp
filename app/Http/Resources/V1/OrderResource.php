<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Enums\PermissionEnum;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderApprovalLog;
use App\Models\OrderItem;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/** @mixin Order */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $canViewCost = (bool) $request->user()?->can(PermissionEnum::OrdersViewCostPrice->value);
        $availability = $this->availabilityByProduct();

        return [
            'id' => $this->id,
            'code' => $this->code,
            'branchId' => $this->branch_id,
            'branch_id' => $this->branch_id,
            'branchName' => $this->whenLoaded('branch', fn (): string => $this->branch->name, ''),
            'branchCode' => $this->whenLoaded('branch', fn (): string => $this->branch->code, ''),
            'customerId' => $this->customer_id,
            'customer_id' => $this->customer_id,
            'customerName' => $this->whenLoaded('customer', fn (): string => $this->customer?->name ?? '', ''),
            'createdBy' => $this->created_by,
            'created_by' => $this->created_by,
            'status' => $this->status->value,
            'subtotal' => $this->subtotal,
            'totalAmount' => $this->total_amount,
            'total_amount' => $this->total_amount,
            'costPrice' => $this->when($canViewCost, $this->cost_price),
            'cost_price' => $this->when($canViewCost, $this->cost_price),
            'marginRate' => $this->when(
                $canViewCost,
                Money::marginRate((string) $this->total_amount, (string) $this->cost_price),
            ),
            'margin_rate' => $this->when(
                $canViewCost,
                Money::marginRate((string) $this->total_amount, (string) $this->cost_price),
            ),
            'items' => $this->whenLoaded('items', function () use ($canViewCost, $availability): array {
                return $this->items->map(function (OrderItem $item) use ($canViewCost, $availability): array {
                    $product = $item->relationLoaded('product') ? $item->product : null;
                    $available = (int) ($availability[$item->product_id] ?? 0);
                    if (in_array($this->status->value, ['pending_approval', 'approved'], true)) {
                        $available += $item->reserved_quantity;
                    }

                    $payload = [
                        'id' => $item->id,
                        'productId' => $item->product_id,
                        'product_id' => $item->product_id,
                        'sku' => $product?->sku ?? '',
                        'name' => $product?->name ?? '',
                        'unitPrice' => $item->unit_price,
                        'unit_price' => $item->unit_price,
                        'quantity' => $item->quantity,
                        'totalPrice' => $item->total_price,
                        'total_price' => $item->total_price,
                        'availableQuantity' => $available,
                    ];

                    if ($canViewCost) {
                        $payload['costPrice'] = $item->cost_price;
                        $payload['cost_price'] = $item->cost_price;
                    }

                    return $payload;
                })->all();
            }),
            'auditLogs' => $this->whenLoaded('approvalLogs', function (): array {
                return $this->approvalLogs->map(function (OrderApprovalLog $log): array {
                    $actor = $log->relationLoaded('actor') ? $log->actor : null;
                    $role = $actor?->roles->first();

                    return [
                        'id' => $log->id,
                        'orderId' => $log->order_id,
                        'fromStatus' => $log->from_status?->value,
                        'toStatus' => $log->to_status->value,
                        'actionBy' => $log->action_by,
                        'actorName' => $actor?->name ?? 'Hệ thống',
                        'actorRole' => $role?->name ?? '',
                        'note' => $log->note,
                        'createdAt' => $log->created_at?->toIso8601String(),
                    ];
                })->all();
            }),
            'createdAt' => $this->created_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<int, int>
     */
    private function availabilityByProduct(): array
    {
        if (! $this->relationLoaded('items') || $this->items->isEmpty()) {
            return [];
        }

        /** @var Collection<int, OrderItem> $items */
        $items = $this->items;
        $productIds = $items->pluck('product_id')->unique()->all();

        return Inventory::withoutGlobalScopes()
            ->where('branch_id', $this->branch_id)
            ->whereIn('product_id', $productIds)
            ->get()
            ->mapWithKeys(fn (Inventory $row): array => [
                $row->product_id => $row->availableQuantity(),
            ])
            ->all();
    }
}
