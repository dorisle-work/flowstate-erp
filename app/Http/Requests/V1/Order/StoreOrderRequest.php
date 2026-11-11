<?php

declare(strict_types=1);

namespace App\Http\Requests\V1\Order;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('create', Order::class);
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->filled('customerId') && ! $this->filled('customer_id')) {
            $merge['customer_id'] = $this->input('customerId');
        }

        if ($this->filled('branchId') && ! $this->filled('branch_id')) {
            $merge['branch_id'] = $this->input('branchId');
        }

        if ($this->filled('lines') && ! $this->filled('items')) {
            $merge['items'] = collect($this->input('lines', []))
                ->map(function (mixed $line): array {
                    $row = is_array($line) ? $line : [];
                    $item = [
                        'quantity' => $row['quantity'] ?? null,
                    ];

                    if (isset($row['product_id'])) {
                        $item['product_id'] = $row['product_id'];
                    } elseif (isset($row['productId'])) {
                        $item['product_id'] = $row['productId'];
                    } elseif (isset($row['sku']) && is_string($row['sku'])) {
                        $productId = Product::query()->where('sku', $row['sku'])->value('id');
                        if ($productId !== null) {
                            $item['product_id'] = $productId;
                        }
                    }

                    if (isset($row['unit_price'])) {
                        $item['unit_price'] = $row['unit_price'];
                    }

                    return $item;
                })
                ->all();
        }

        $user = $this->user();

        if ($user instanceof User && ! $user->isSuperAdmin()) {
            $merge['branch_id'] = $user->branch_id;
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $customerId = $this->integer('customer_id');
            $branchId = $this->integer('branch_id');

            if ($customerId < 1 || $branchId < 1) {
                return;
            }

            $customer = Customer::withoutGlobalScopes()->find($customerId);
            if ($customer === null) {
                return;
            }

            if ($customer->branch_id !== $branchId) {
                $validator->errors()->add('customer_id', 'Customer does not belong to the selected branch.');
            }
        });
    }
}
