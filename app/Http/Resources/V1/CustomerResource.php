<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Customer */
class CustomerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'phone' => $this->phone,
            'branchId' => $this->branch_id,
            'branch_id' => $this->branch_id,
            'branchName' => $this->whenLoaded('branch', fn (): string => $this->branch->name),
            'ordersCount' => $this->when(isset($this->orders_count), $this->orders_count),
            'revenue' => $this->when(isset($this->revenue), (string) $this->revenue),
        ];
    }
}
