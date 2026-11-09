<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\OrderStatus;
use App\Enums\PermissionEnum;
use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission(PermissionEnum::OrdersView->value);
    }

    public function view(User $user, Order $order): bool
    {
        return $user->hasPermission(PermissionEnum::OrdersView->value)
            && $this->sameBranch($user, $order);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission(PermissionEnum::OrdersCreate->value);
    }

    public function update(User $user, Order $order): bool
    {
        return $user->hasPermission(PermissionEnum::OrdersUpdate->value)
            && $this->sameBranch($user, $order)
            && $order->status === OrderStatus::Draft;
    }

    public function delete(User $user, Order $order): bool
    {
        return $this->update($user, $order);
    }

    public function submit(User $user, Order $order): bool
    {
        return $user->hasPermission(PermissionEnum::OrdersCreate->value)
            && $this->sameBranch($user, $order);
    }

    public function approve(User $user, Order $order): bool
    {
        return $user->hasPermission(PermissionEnum::OrdersApprove->value)
            && $this->sameBranch($user, $order);
    }

    public function reject(User $user, Order $order): bool
    {
        return $this->approve($user, $order);
    }

    public function dispatch(User $user, Order $order): bool
    {
        return $user->hasPermission(PermissionEnum::OrdersDispatch->value)
            && $this->sameBranch($user, $order);
    }

    public function complete(User $user, Order $order): bool
    {
        return $this->dispatch($user, $order);
    }

    public function cancel(User $user, Order $order): bool
    {
        return $user->hasPermission(PermissionEnum::OrdersCancel->value)
            && $this->sameBranch($user, $order);
    }

    private function sameBranch(User $user, Order $order): bool
    {
        return $user->isSuperAdmin() || (int) $user->branch_id === (int) $order->branch_id;
    }
}
