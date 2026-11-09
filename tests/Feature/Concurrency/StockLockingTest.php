<?php

declare(strict_types=1);

namespace Tests\Feature\Concurrency;

use App\Actions\Order\DispatchOrderAction;
use App\DTOs\Order\TransitionStateDTO;
use App\Enums\OrderStatus;
use App\Exceptions\InsufficientStockException;
use App\Models\Branch;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Query\Grammars\MySqlGrammar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Tests\TestCase;

final class StockLockingTest extends TestCase
{
    use RefreshDatabase;

    public function test_dispatch_rejects_quantity_above_physical_stock_and_rolls_back(): void
    {
        [$order, $inventory] = $this->approvedOrder(
            physical: 5,
            reserved: 6,
            lines: [
                ['quantity' => 6],
            ],
        );

        try {
            $this->dispatch($order);
            $this->fail('Oversell was accepted.');
        } catch (InsufficientStockException $exception) {
            $this->assertSame(6, $exception->requested);
            $this->assertSame(5, $exception->available);
        }

        $inventory->refresh();
        $this->assertSame(5, $inventory->physical_quantity);
        $this->assertSame(6, $inventory->reserved_quantity);
        $this->assertSame(OrderStatus::Approved, $order->refresh()->status);
        $this->assertDatabaseCount('inventory_transactions', 0);
    }

    public function test_dispatch_deducts_on_hand_stock_and_writes_the_ledger(): void
    {
        [$order, $inventory, $user] = $this->approvedOrder(
            physical: 5,
            reserved: 3,
            lines: [
                ['quantity' => 3],
            ],
        );

        $dispatched = $this->dispatch($order, $user->id);

        $this->assertSame(OrderStatus::Dispatched, $dispatched->status);
        $inventory->refresh();
        $this->assertSame(2, $inventory->physical_quantity);
        $this->assertSame(0, $inventory->reserved_quantity);
        $this->assertDatabaseHas('inventory_transactions', [
            'reference_code' => $order->code,
            'quantity_delta' => -3,
            'balance_after' => 2,
        ]);
    }

    public function test_second_dispatch_cannot_consume_stock_already_deducted(): void
    {
        [$first, $inventory, $user, $product, $branch] = $this->approvedOrder(
            physical: 5,
            reserved: 4,
            lines: [
                ['quantity' => 4],
            ],
        );

        $this->dispatch($first, $user->id);
        $this->assertSame(1, $inventory->refresh()->physical_quantity);

        $second = $this->makeOrder($branch, $user, $product, OrderStatus::Approved, 2, 2);
        $inventory->reserved_quantity = 2;
        $inventory->save();

        try {
            $this->dispatch($second, $user->id);
            $this->fail('The second dispatch oversold remaining stock.');
        } catch (InsufficientStockException) {
            $this->assertSame(1, $inventory->refresh()->physical_quantity);
            $this->assertSame(OrderStatus::Approved, $second->refresh()->status);
            $this->assertDatabaseCount('inventory_transactions', 1);
        }
    }

    public function test_multi_line_dispatch_rolls_back_when_any_line_is_short(): void
    {
        $branch = Branch::query()->create(['name' => 'Hà Nội', 'code' => 'HN', 'address' => 'HN']);
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $firstProduct = $this->product('FS-A');
        $secondProduct = $this->product('FS-B');
        $firstInventory = $this->stock($branch, $firstProduct, 10, 4);
        $secondInventory = $this->stock($branch, $secondProduct, 1, 5);
        $order = $this->makeOrder($branch, $user, $firstProduct, OrderStatus::Approved, 4, 4);
        $order->items()->create([
            'product_id' => $secondProduct->id,
            'unit_price' => '10.00',
            'cost_price' => '4.00',
            'quantity' => 5,
            'reserved_quantity' => 5,
            'total_price' => '50.00',
        ]);

        try {
            $this->dispatch($order, $user->id);
            $this->fail('A short second line was deducted.');
        } catch (InsufficientStockException) {
            $this->assertSame(10, $firstInventory->refresh()->physical_quantity);
            $this->assertSame(4, $firstInventory->reserved_quantity);
            $this->assertSame(1, $secondInventory->refresh()->physical_quantity);
            $this->assertSame(5, $secondInventory->reserved_quantity);
            $this->assertDatabaseCount('inventory_transactions', 0);
            $this->assertSame(OrderStatus::Approved, $order->refresh()->status);
        }
    }

    public function test_ledger_rows_cannot_be_rewritten(): void
    {
        [$order] = $this->approvedOrder(physical: 4, reserved: 1, lines: [['quantity' => 1]]);
        $this->dispatch($order);

        $entry = InventoryTransaction::query()->firstOrFail();

        $this->expectException(LogicException::class);
        $entry->quantity_delta = 0;
        $entry->save();
    }

    public function test_inventory_lock_compiles_to_mysql_for_update(): void
    {
        $sql = (new MySqlGrammar)->compileSelect(
            Inventory::query()
                ->where('branch_id', 1)
                ->where('product_id', 1)
                ->lockForUpdate()
                ->toBase(),
        );

        $this->assertStringContainsString('for update', strtolower($sql));
        $this->assertStringNotContainsString('quantity = quantity', strtolower($sql));
    }

    /**
     * @param  list<array{quantity: int}>  $lines
     * @return array{0: Order, 1: Inventory, 2: User, 3: Product, 4: Branch}
     */
    private function approvedOrder(int $physical, int $reserved, array $lines): array
    {
        $branch = Branch::query()->create(['name' => 'Hà Nội', 'code' => 'HN-'.uniqid(), 'address' => 'HN']);
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $product = $this->product('FS-'.uniqid());
        $inventory = $this->stock($branch, $product, $physical, $reserved);
        $quantity = $lines[0]['quantity'];
        $order = $this->makeOrder($branch, $user, $product, OrderStatus::Approved, $quantity, $quantity);

        return [$order, $inventory, $user, $product, $branch];
    }

    private function dispatch(Order $order, ?int $actorId = null): Order
    {
        return app(DispatchOrderAction::class)->execute($order, new TransitionStateDTO(
            to: OrderStatus::Dispatched,
            actionBy: $actorId ?? (int) $order->created_by,
            note: 'Dispatch',
        ));
    }

    private function product(string $sku): Product
    {
        return Product::query()->create([
            'sku' => $sku,
            'name' => $sku,
            'unit' => 'pcs',
            'unit_price' => '100.00',
            'cost_price' => '40.00',
        ]);
    }

    private function stock(Branch $branch, Product $product, int $physical, int $reserved): Inventory
    {
        return Inventory::query()->create([
            'branch_id' => $branch->id,
            'product_id' => $product->id,
            'physical_quantity' => $physical,
            'reserved_quantity' => $reserved,
            'safety_stock' => 0,
        ]);
    }

    private function makeOrder(
        Branch $branch,
        User $user,
        Product $product,
        OrderStatus $status,
        int $quantity,
        int $reservedQuantity,
    ): Order {
        $order = Order::query()->create([
            'code' => 'ORD-'.strtoupper(substr(uniqid(), -8)),
            'branch_id' => $branch->id,
            'customer_id' => null,
            'created_by' => $user->id,
            'status' => $status,
            'subtotal' => '100.00',
            'total_amount' => '100.00',
            'cost_price' => '40.00',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'unit_price' => '100.00',
            'cost_price' => '40.00',
            'quantity' => $quantity,
            'reserved_quantity' => $reservedQuantity,
            'total_price' => '100.00',
        ]);

        return $order;
    }
}
