<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpsNotification extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'title',
        'body',
        'href',
        'telegram_status',
        'meta',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'order_id' => 'integer',
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (OpsNotification $notification): void {
            $notification->created_at ??= now();
        });
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
