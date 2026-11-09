<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\OrderStateMachineInterface;
use App\Contracts\StockLedgerInterface;
use App\Contracts\WebhookDispatcherInterface;
use App\Enums\PermissionEnum;
use App\Events\OrderStateChanged;
use App\Listeners\RecordApprovalAuditLog;
use App\Models\Order;
use App\Models\User;
use App\Policies\OrderPolicy;
use App\Services\Ledger\StockLedgerService;
use App\Services\Webhook\TelegramWebhookDispatcher;
use App\Services\Workflow\OrderStateMachine;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(OrderStateMachineInterface::class, OrderStateMachine::class);
        $this->app->bind(StockLedgerInterface::class, StockLedgerService::class);
        $this->app->bind(WebhookDispatcherInterface::class, TelegramWebhookDispatcher::class);
    }

    public function boot(): void
    {
        Gate::before(function (User $user): ?bool {
            return $user->isSuperAdmin() ? true : null;
        });

        foreach (PermissionEnum::cases() as $permission) {
            Gate::define(
                $permission->value,
                fn (User $user): bool => $user->hasPermission($permission->value),
            );
        }

        Gate::policy(Order::class, OrderPolicy::class);

        Event::listen(OrderStateChanged::class, RecordApprovalAuditLog::class);
    }
}
