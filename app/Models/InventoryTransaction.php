<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\InventoryTxType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class InventoryTransaction extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'reference_code',
        'reference_type',
        'branch_id',
        'product_id',
        'quantity_delta',
        'balance_after',
        'created_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'reference_type' => InventoryTxType::class,
            'branch_id' => 'integer',
            'product_id' => 'integer',
            'quantity_delta' => 'integer',
            'balance_after' => 'integer',
            'created_by' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (InventoryTransaction $transaction): void {
            $transaction->created_at ??= now();
        });

        static::updating(function (): void {
            throw new LogicException('Inventory transactions are immutable and cannot be updated.');
        });

        static::deleting(function (): void {
            throw new LogicException('Inventory transactions are immutable and cannot be deleted.');
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
