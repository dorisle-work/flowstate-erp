<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\IdempotencyConflictException;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\Response;

final class EnforceIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('X-Idempotency-Key');

        if (! is_string($header) || $header === '') {
            return response()->json([
                'message' => 'The X-Idempotency-Key header is required.',
                'code' => 'idempotency_key_required',
            ], 400);
        }

        if (! preg_match('/^[A-Za-z0-9:_\-\.]{8,128}$/', $header)) {
            return response()->json([
                'message' => 'The X-Idempotency-Key header must be 8-128 characters of letters, numbers, colon, underscore, dot, or dash.',
                'code' => 'idempotency_key_invalid',
            ], 422);
        }

        $lockKey = sprintf(
            'flowstate:idempotency:%s:%s:%s:%s',
            $request->user()?->getAuthIdentifier() ?? 'guest',
            $request->method(),
            sha1($request->path()),
            $header,
        );

        if (! $this->acquire($lockKey)) {
            throw new IdempotencyConflictException;
        }

        try {
            $response = $next($request);
        } catch (\Throwable $exception) {
            $this->release($lockKey);

            throw $exception;
        }

        if ($response->getStatusCode() >= 400) {
            $this->release($lockKey);
        }

        return $response;
    }

    /**
     * Redis store uses SET key value EX ttl NX. Other stores fall back to an atomic add.
     */
    private function acquire(string $key): bool
    {
        $ttl = max(1, (int) config('idempotency.ttl', 60));
        $store = (string) config('idempotency.store', 'redis');

        if ($store !== 'redis') {
            return Cache::store($store)->add($key, 'processing', $ttl);
        }

        $result = Redis::connection()->set($key, 'processing', 'EX', $ttl, 'NX');

        if (is_object($result) && method_exists($result, 'getPayload')) {
            $result = $result->getPayload();
        }

        return $result === true || $result === 'OK';
    }

    private function release(string $key): void
    {
        $store = (string) config('idempotency.store', 'redis');

        if ($store !== 'redis') {
            Cache::store($store)->forget($key);

            return;
        }

        Redis::connection()->del($key);
    }
}
