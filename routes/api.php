<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\OrderWorkflowController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'branch.scope'])->group(function (): void {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('inventories', [InventoryController::class, 'index']);

        Route::get('orders', [OrderController::class, 'index']);
        Route::post('orders', [OrderController::class, 'store'])->middleware('idempotency');
        Route::get('orders/{order}', [OrderController::class, 'show']);
        Route::match(['put', 'patch'], 'orders/{order}', [OrderController::class, 'update']);
        Route::delete('orders/{order}', [OrderController::class, 'destroy']);

        Route::post('orders/{order}/submit', [OrderWorkflowController::class, 'submit'])->middleware('idempotency');
        Route::post('orders/{order}/approve', [OrderWorkflowController::class, 'approve'])->middleware('idempotency');
        Route::post('orders/{order}/reject', [OrderWorkflowController::class, 'reject'])->middleware('idempotency');
        Route::post('orders/{order}/dispatch', [OrderWorkflowController::class, 'dispatch'])->middleware('idempotency');
        Route::post('orders/{order}/complete', [OrderWorkflowController::class, 'complete'])->middleware('idempotency');
        Route::post('orders/{order}/cancel', [OrderWorkflowController::class, 'cancel'])->middleware('idempotency');
    });
});
