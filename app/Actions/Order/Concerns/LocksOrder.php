<?php

declare(strict_types=1);

namespace App\Actions\Order\Concerns;

use App\Models\Order;

trait LocksOrder
{
    protected function lockOrder(Order $order): Order
    {
        $locked = Order::query()
            ->withoutGlobalScopes()
            ->whereKey($order->id)
            ->lockForUpdate()
            ->firstOrFail();

        $locked->load('items');

        return $locked;
    }
}
