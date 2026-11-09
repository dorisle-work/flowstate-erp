<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\OrderStatus;
use App\Models\Inventory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesErpWorld;
use Tests\TestCase;

final class OrderWorkflowTest extends TestCase
{
    use CreatesErpWorld;
    use RefreshDatabase;

    public function test_order_moves_from_draft_to_dispatched_and_masks_cost_fields(): void
    {
        $world = $this->erpWorld(physicalQuantity: 10);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $world['sales']->email,
            'password' => 'password',
        ]);
        $login->assertOk()->assertJsonStructure(['token', 'token_type']);

        Sanctum::actingAs($world['sales']);

        $created = $this->withHeader('X-Idempotency-Key', 'create-order-0001')
            ->postJson('/api/v1/orders', [
                'items' => [
                    ['product_id' => $world['product']->id, 'quantity' => 2],
                ],
            ]);

        $created->assertCreated()
            ->assertJsonPath('data.status', OrderStatus::Draft->value)
            ->assertJsonPath('data.branch_id', $world['hn']->id)
            ->assertJsonPath('data.total_amount', '200.00')
            ->assertJsonMissingPath('data.cost_price')
            ->assertJsonMissingPath('data.margin_rate')
            ->assertJsonMissingPath('data.items.0.cost_price');

        $orderId = (int) $created->json('data.id');

        $this->withHeader('X-Idempotency-Key', 'dispatch-too-early-01')
            ->postJson("/api/v1/orders/{$orderId}/dispatch")
            ->assertForbidden();

        $this->withHeader('X-Idempotency-Key', 'submit-order-0001')
            ->postJson("/api/v1/orders/{$orderId}/submit", ['note' => 'Please approve'])
            ->assertOk()
            ->assertJsonPath('data.status', OrderStatus::PendingApproval->value);

        $this->assertSame(2, $world['inventory']->refresh()->reserved_quantity);
        $this->assertSame(10, $world['inventory']->physical_quantity);

        $this->withHeader('X-Idempotency-Key', 'approve-denied-0001')
            ->postJson("/api/v1/orders/{$orderId}/approve")
            ->assertForbidden();

        Sanctum::actingAs($world['salesHcm']);
        $this->getJson("/api/v1/orders/{$orderId}")->assertNotFound();
        $this->getJson('/api/v1/orders')->assertOk()->assertJsonCount(0, 'data');

        Sanctum::actingAs($world['manager']);

        $this->getJson("/api/v1/orders/{$orderId}")
            ->assertOk()
            ->assertJsonPath('data.cost_price', '80.00')
            ->assertJsonPath('data.margin_rate', '0.6000')
            ->assertJsonPath('data.items.0.cost_price', '40.00');

        $this->withHeader('X-Idempotency-Key', 'approve-order-0001')
            ->postJson("/api/v1/orders/{$orderId}/approve", ['note' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('data.status', OrderStatus::Approved->value);

        $this->withHeader('X-Idempotency-Key', 'dispatch-order-0001')
            ->postJson("/api/v1/orders/{$orderId}/dispatch", ['note' => 'Shipped'])
            ->assertOk()
            ->assertJsonPath('data.status', OrderStatus::Dispatched->value);

        $inventory = Inventory::query()->findOrFail($world['inventory']->id);
        $this->assertSame(8, $inventory->physical_quantity);
        $this->assertSame(0, $inventory->reserved_quantity);
        $this->assertDatabaseHas('inventory_transactions', [
            'reference_code' => $created->json('data.code'),
            'reference_type' => 'order_dispatch',
            'quantity_delta' => -2,
            'balance_after' => 8,
            'branch_id' => $world['hn']->id,
            'product_id' => $world['product']->id,
        ]);
        $this->assertDatabaseHas('order_approval_logs', [
            'order_id' => $orderId,
            'to_status' => OrderStatus::Dispatched->value,
        ]);

        $this->withHeader('X-Idempotency-Key', 'dispatch-again-0001')
            ->postJson("/api/v1/orders/{$orderId}/dispatch")
            ->assertStatus(422)
            ->assertJsonPath('code', 'invalid_state_transition');

        $this->assertSame(8, $inventory->refresh()->physical_quantity);
    }
}
