<?php

declare(strict_types=1);

namespace App\Enums;

enum InventoryTxType: string
{
    case OrderDispatch = 'order_dispatch';
    case StockAdjustment = 'stock_adjustment';
    case PurchaseReceipt = 'purchase_receipt';
}
