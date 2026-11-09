<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\OrderStateChanged;
use App\Jobs\DispatchWebhookNotificationJob;
use App\Models\OrderApprovalLog;

final class RecordApprovalAuditLog
{
    public function handle(OrderStateChanged $event): void
    {
        OrderApprovalLog::query()->create([
            'order_id' => $event->order->id,
            'from_status' => $event->from,
            'to_status' => $event->to,
            'action_by' => $event->actionBy,
            'note' => $event->note,
            'payload_snapshot' => [
                'code' => $event->order->code,
                'branch_id' => $event->order->branch_id,
                'subtotal' => $event->order->subtotal,
                'total_amount' => $event->order->total_amount,
                'from' => $event->from->value,
                'to' => $event->to->value,
            ],
        ]);

        DispatchWebhookNotificationJob::dispatch(
            $event->order->id,
            $event->from->value,
            $event->to->value,
        )->afterCommit();
    }
}
