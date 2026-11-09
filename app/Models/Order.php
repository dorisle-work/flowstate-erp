<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OrderStatus;
use App\Exceptions\InvalidStateTransitionException;
use App\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    /**
     * Set only by OrderStateMachine while a legal transition is being persisted.
     */
    public bool $allowStatusMutation = false;

    protected $fillable = [
        'code',
        'branch_id',
        'customer_id',
        'created_by',
        'status',
        'subtotal',
        'total_amount',
        'cost_price',
    ];

    protected function casts(): array
    {
        return [
            'branch_id' => 'integer',
            'customer_id' => 'integer',
            'created_by' => 'integer',
            'status' => OrderStatus::class,
            'subtotal' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'cost_price' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope);

        static::updating(function (Order $order): void {
            if (! $order->isDirty('status') || $order->allowStatusMutation) {
                return;
            }

            $original = $order->getOriginal('status');
            $from = $original instanceof OrderStatus
                ? $original
                : OrderStatus::from((string) $original);

            throw InvalidStateTransitionException::between($from, $order->status);
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function approvalLogs(): HasMany
    {
        return $this->hasMany(OrderApprovalLog::class);
    }
}
