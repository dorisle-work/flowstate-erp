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
    case OrdersApproveHighDiscount = 'orders.approve_high_discount';
    case InventoryView = 'inventory.view';
    case InventoryManualAdjust = 'inventory.manual_adjust';
    case ReportsExport = 'reports.export';
    case SettingsManage = 'settings.manage';

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
            self::OrdersApproveHighDiscount => 'Approve high-discount orders',
            self::InventoryView => 'View on-hand and reserved stock',
            self::InventoryManualAdjust => 'Post stock adjustments through the ledger',
            self::ReportsExport => 'Export ledger and operational reports',
            self::SettingsManage => 'Manage roles and permission matrix',
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::OrdersCreate,
            self::OrdersView,
            self::OrdersUpdate,
            self::OrdersApprove,
            self::OrdersDispatch,
            self::OrdersCancel,
            self::OrdersViewCostPrice,
            self::OrdersApproveHighDiscount => 'orders',
            self::InventoryView,
            self::InventoryManualAdjust => 'inventory',
            self::ReportsExport => 'reports',
            self::SettingsManage => 'settings',
        };
    }

    public function isSpecial(): bool
    {
        return match ($this) {
            self::OrdersViewCostPrice,
            self::OrdersApproveHighDiscount,
            self::InventoryManualAdjust => true,
            default => false,
        };
    }
}
