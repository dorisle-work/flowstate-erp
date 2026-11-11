<?php

declare(strict_types=1);

namespace App\Services\Webhook;

use App\Contracts\WebhookDispatcherInterface;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class TelegramWebhookDispatcher implements WebhookDispatcherInterface
{
    public function dispatch(Order $order, OrderStatus $from, OrderStatus $to): string
    {
        $token = config('services.telegram.bot_token');
        $chatId = config('services.telegram.chat_id');
        $customer = $order->relationLoaded('customer')
            ? $order->customer?->name
            : $order->customer()->value('name');

        $text = sprintf(
            "FlowState ERP\nĐơn %s\n%s → %s\nKhách: %s\nChi nhánh #%d\nThành tiền: %s",
            $order->code,
            $from->value,
            $to->value,
            $customer ?: '—',
            $order->branch_id,
            $order->total_amount,
        );

        if (! is_string($token) || $token === '' || ! is_string($chatId) || $chatId === '') {
            Log::info('webhook.telegram.skipped', [
                'order_id' => $order->id,
                'from' => $from->value,
                'to' => $to->value,
            ]);

            return 'skipped';
        }

        Http::timeout(5)
            ->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $text,
            ])
            ->throw();

        return 'sent';
    }
}
