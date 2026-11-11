<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Inventory */
class InventoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branchId' => $this->branch_id,
            'branch_id' => $this->branch_id,
            'branchName' => $this->whenLoaded('branch', fn (): string => $this->branch->name, ''),
            'product_id' => $this->product_id,
            'sku' => $this->whenLoaded('product', fn (): string => $this->product->sku, ''),
            'productName' => $this->whenLoaded('product', fn (): string => $this->product->name, ''),
            'product' => $this->whenLoaded('product', fn (): array => [
                'id' => $this->product->id,
                'sku' => $this->product->sku,
                'name' => $this->product->name,
                'unit' => $this->product->unit,
            ]),
            'onHand' => $this->physical_quantity,
            'reserved' => $this->reserved_quantity,
            'physical_quantity' => $this->physical_quantity,
            'reserved_quantity' => $this->reserved_quantity,
            'available_quantity' => $this->availableQuantity(),
            'safety_stock' => $this->safety_stock,
        ];
    }
}
