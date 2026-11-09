<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Contracts\WebhookDispatcherInterface;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class DispatchWebhookNotificationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $orderId,
        public readonly string $from,
        public readonly string $to,
    ) {}

    public function handle(WebhookDispatcherInterface $dispatcher): void
    {
        $order = Order::query()->withoutGlobalScopes()->find($this->orderId);

        if ($order === null) {
            return;
        }

        $dispatcher->dispatch($order, OrderStatus::from($this->from), OrderStatus::from($this->to));
    }
}
