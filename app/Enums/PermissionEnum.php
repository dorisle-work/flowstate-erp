<?php

declare(strict_types=1);

namespace App\Enums;

enum PermissionEnum: string
{
    case OrdersCreate = 'orders.create';
    case OrdersView = 'orders.view';
    case OrdersUpdate = 'orders.update';
    case OrdersApprove = 'orders.approve';
    case OrdersDispatch = 'orders.dispatch';
    case OrdersCancel = 'orders.cancel';
    case OrdersViewCostPrice = 'orders.view_cost_price';
    case InventoryView = 'inventory.view';
    case InventoryAdjust = 'inventory.adjust';

    public function description(): string
    {
        return match ($this) {
            self::OrdersCreate => 'Create and submit orders',
            self::OrdersView => 'View orders in scope',
            self::OrdersUpdate => 'Update draft orders',
            self::OrdersApprove => 'Approve or reject submitted orders',
            self::OrdersDispatch => 'Dispatch approved orders and complete them',
            self::OrdersCancel => 'Cancel an order before it is dispatched',
            self::OrdersViewCostPrice => 'View cost price and margin rate',
            self::InventoryView => 'View on-hand and reserved stock',
            self::InventoryAdjust => 'Post stock adjustments through the ledger',
        };
    }
}
