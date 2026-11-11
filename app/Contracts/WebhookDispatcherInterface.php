<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Enums\OrderStatus;
use App\Models\Order;

interface WebhookDispatcherInterface
{
    /**
     * @return 'sent'|'skipped'
     */
    public function dispatch(Order $order, OrderStatus $from, OrderStatus $to): string;
}
