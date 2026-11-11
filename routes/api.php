<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BranchController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\InventoryMovementController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\OrderWorkflowController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\RolePermissionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'branch.scope'])->group(function (): void {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('branches', [BranchController::class, 'index']);
        Route::get('customers', [CustomerController::class, 'index']);
        Route::post('customers', [CustomerController::class, 'store'])->middleware('idempotency');
        Route::match(['put', 'patch'], 'customers/{customer}', [CustomerController::class, 'update']);
        Route::delete('customers/{customer}', [CustomerController::class, 'destroy']);

        Route::get('products', [ProductController::class, 'index']);
        Route::post('products', [ProductController::class, 'store'])->middleware('idempotency');
        Route::match(['put', 'patch'], 'products/{product}', [ProductController::class, 'update']);
        Route::delete('products/{product}', [ProductController::class, 'destroy']);

        Route::get('accounts', [AccountController::class, 'index']);
        Route::get('roles-matrix', [RolePermissionController::class, 'index']);
        Route::patch('roles-matrix', [RolePermissionController::class, 'update']);
        Route::get('notifications', [NotificationController::class, 'index']);

        Route::get('inventories', [InventoryController::class, 'index']);
        Route::post('inventories/adjust', [InventoryMovementController::class, 'adjust'])->middleware('idempotency');
        Route::post('inventories/receive', [InventoryMovementController::class, 'receive'])->middleware('idempotency');

        Route::get('orders', [OrderController::class, 'index']);
        Route::post('orders', [OrderController::class, 'store'])->middleware('idempotency');
        Route::get('orders/{order}', [OrderController::class, 'show']);
        Route::match(['put', 'patch'], 'orders/{order}', [OrderController::class, 'update'])->middleware('idempotency');
        Route::delete('orders/{order}', [OrderController::class, 'destroy']);

        Route::post('orders/{order}/submit', [OrderWorkflowController::class, 'submit'])->middleware('idempotency');
        Route::post('orders/{order}/approve', [OrderWorkflowController::class, 'approve'])->middleware('idempotency');
        Route::post('orders/{order}/reject', [OrderWorkflowController::class, 'reject'])->middleware('idempotency');
        Route::post('orders/{order}/dispatch', [OrderWorkflowController::class, 'dispatch'])->middleware('idempotency');
        Route::post('orders/{order}/complete', [OrderWorkflowController::class, 'complete'])->middleware('idempotency');
        Route::post('orders/{order}/cancel', [OrderWorkflowController::class, 'cancel'])->middleware('idempotency');
    });
});
