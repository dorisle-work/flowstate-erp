<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Enums\PermissionEnum;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $canViewCost = (bool) $request->user()?->can(PermissionEnum::OrdersViewCostPrice->value);

        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'unit' => $this->unit,
            'unitPrice' => $this->unit_price,
            'unit_price' => $this->unit_price,
            'cost' => $this->when($canViewCost, $this->cost_price),
            'cost_price' => $this->when($canViewCost, $this->cost_price),
        ];
    }
}
