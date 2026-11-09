<?php

declare(strict_types=1);

namespace App\Models;

use App\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    protected $fillable = [
        'branch_id',
        'product_id',
        'physical_quantity',
        'reserved_quantity',
        'safety_stock',
    ];

    protected function casts(): array
    {
        return [
            'branch_id' => 'integer',
            'product_id' => 'integer',
            'physical_quantity' => 'integer',
            'reserved_quantity' => 'integer',
            'safety_stock' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function ledgerEntries(): Builder
    {
        return InventoryTransaction::query()
            ->where('branch_id', $this->branch_id)
            ->where('product_id', $this->product_id);
    }

    public function availableQuantity(): int
    {
        return $this->physical_quantity - $this->reserved_quantity;
    }
}
