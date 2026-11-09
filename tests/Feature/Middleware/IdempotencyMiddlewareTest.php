<?php

declare(strict_types=1);

namespace Tests\Feature\Middleware;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Laravel\Sanctum\Sanctum;
use Predis\Response\Status;
use Tests\Concerns\CreatesErpWorld;
use Tests\TestCase;

final class IdempotencyMiddlewareTest extends TestCase
{
    use CreatesErpWorld;
    use RefreshDatabase;

    public function test_duplicate_idempotency_key_returns_conflict_and_keeps_the_first_result(): void
    {
        $world = $this->erpWorld();
        Sanctum::actingAs($world['sales']);

        $payload = [
            'items' => [
                ['product_id' => $world['product']->id, 'quantity' => 1],
            ],
        ];

        $this->postJson('/api/v1/orders', $payload)->assertStatus(400)->assertJsonPath('code', 'idempotency_key_required');

        $this->withHeader('X-Idempotency-Key', 'short')
            ->postJson('/api/v1/orders', $payload)
            ->assertStatus(422)
            ->assertJsonPath('code', 'idempotency_key_invalid');

        $first = $this->withHeader('X-Idempotency-Key', 'create-order-dup-1')
            ->postJson('/api/v1/orders', $payload);
        $first->assertCreated();

        $second = $this->withHeader('X-Idempotency-Key', 'create-order-dup-1')
            ->postJson('/api/v1/orders', $payload);
        $second->assertStatus(409)->assertJsonPath('code', 'idempotency_conflict');

        $this->assertDatabaseCount('orders', 1);

        $orderId = (int) $first->json('data.id');

        $this->withHeader('X-Idempotency-Key', 'submit-order-dup-1')
            ->postJson("/api/v1/orders/{$orderId}/submit")
            ->assertOk();

        $this->withHeader('X-Idempotency-Key', 'submit-order-dup-1')
            ->postJson("/api/v1/orders/{$orderId}/submit")
            ->assertStatus(409)
            ->assertJsonPath('code', 'idempotency_conflict');

        $this->assertSame(1, $world['inventory']->refresh()->reserved_quantity);
    }

    public function test_predis_status_response_acquires_the_redis_lock(): void
    {
        config(['idempotency.store' => 'redis']);

        $world = $this->erpWorld();
        Sanctum::actingAs($world['sales']);

        $connection = \Mockery::mock();
        $connection->shouldReceive('set')
            ->once()
            ->andReturn(new Status('OK'));
        Redis::shouldReceive('connection')->once()->andReturn($connection);

        $this->withHeader('X-Idempotency-Key', 'predis-status-ok-1')
            ->postJson('/api/v1/orders', [
                'items' => [
                    ['product_id' => $world['product']->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated();

        $this->assertDatabaseCount('orders', 1);
    }
}
