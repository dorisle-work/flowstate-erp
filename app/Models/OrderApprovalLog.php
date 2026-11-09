<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderApprovalLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'from_status',
        'to_status',
        'action_by',
        'note',
        'payload_snapshot',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'order_id' => 'integer',
            'from_status' => OrderStatus::class,
            'to_status' => OrderStatus::class,
            'action_by' => 'integer',
            'payload_snapshot' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (OrderApprovalLog $log): void {
            $log->created_at ??= now();
        });
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'action_by');
    }
}
