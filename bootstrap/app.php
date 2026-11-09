<?php

use App\Exceptions\IdempotencyConflictException;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\InvalidStateTransitionException;
use App\Http\Middleware\EnforceIdempotency;
use App\Http\Middleware\ScopeByBranch;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'idempotency' => EnforceIdempotency::class,
            'branch.scope' => ScopeByBranch::class,
        ]);

        $middleware->prependToPriorityList(
            SubstituteBindings::class,
            ScopeByBranch::class,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (InvalidStateTransitionException $exception, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'message' => $exception->getMessage(),
                'code' => 'invalid_state_transition',
                'from' => $exception->from?->value,
                'to' => $exception->to?->value,
            ], 422);
        });

        $exceptions->render(function (InsufficientStockException $exception, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'message' => $exception->getMessage(),
                'code' => 'insufficient_stock',
                'product_id' => $exception->productId,
                'requested' => $exception->requested,
                'available' => $exception->available,
            ], 409);
        });

        $exceptions->render(function (IdempotencyConflictException $exception, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'message' => $exception->getMessage(),
                'code' => 'idempotency_conflict',
            ], 409);
        });
    })->create();
