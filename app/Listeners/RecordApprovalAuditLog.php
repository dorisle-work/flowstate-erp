<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\OrderStatus;
use App\Events\OrderStateChanged;
use App\Jobs\DispatchWebhookNotificationJob;
use App\Models\OpsNotification;
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

        $notification = OpsNotification::query()->create([
            'order_id' => $event->order->id,
            'title' => sprintf('%s · %s', $event->order->code, $this->label($event->to)),
            'body' => sprintf(
                'Từ %s sang %s%s',
                $this->label($event->from),
                $this->label($event->to),
                $event->note ? ' · '.$event->note : '',
            ),
            'href' => '/orders/'.$event->order->code,
            'telegram_status' => 'pending',
            'meta' => [
                'from' => $event->from->value,
                'to' => $event->to->value,
            ],
        ]);

        DispatchWebhookNotificationJob::dispatch(
            $event->order->id,
            $event->from->value,
            $event->to->value,
            $notification->id,
        )->afterCommit();
    }

    private function label(OrderStatus $status): string
    {
        return match ($status) {
            OrderStatus::Draft => 'Nháp',
            OrderStatus::PendingApproval => 'Chờ duyệt',
            OrderStatus::Approved => 'Đã duyệt',
            OrderStatus::Rejected => 'Từ chối',
            OrderStatus::Dispatched => 'Xuất kho',
            OrderStatus::Completed => 'Hoàn tất',
            OrderStatus::Cancelled => 'Đã hủy',
        };
    }
}
