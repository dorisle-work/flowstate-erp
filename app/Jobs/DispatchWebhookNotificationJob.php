<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Contracts\WebhookDispatcherInterface;
use App\Enums\OrderStatus;
use App\Models\OpsNotification;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

final class DispatchWebhookNotificationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $orderId,
        public readonly string $from,
        public readonly string $to,
        public readonly ?int $notificationId = null,
    ) {}

    public function handle(WebhookDispatcherInterface $dispatcher): void
    {
        $order = Order::query()->withoutGlobalScopes()->with('customer')->find($this->orderId);

        if ($order === null) {
            return;
        }

        $status = 'skipped';

        try {
            $status = $dispatcher->dispatch($order, OrderStatus::from($this->from), OrderStatus::from($this->to));
        } catch (Throwable) {
            $status = 'failed';
        }

        if ($this->notificationId !== null) {
            OpsNotification::query()
                ->whereKey($this->notificationId)
                ->update(['telegram_status' => $status]);
        }
    }
}
