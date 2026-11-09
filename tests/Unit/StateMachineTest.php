<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\DTOs\Order\TransitionStateDTO;
use App\Enums\OrderStatus;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\Branch;
use App\Models\Order;
use App\Models\User;
use App\Services\Workflow\OrderStateMachine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class StateMachineTest extends TestCase
{
    use RefreshDatabase;

    private OrderStateMachine $machine;

    protected function setUp(): void
    {
        parent::setUp();

        $this->machine = $this->app->make(OrderStateMachine::class);
    }

    #[DataProvider('legalTransitions')]
    public function test_legal_transitions_are_allowed(OrderStatus $from, OrderStatus $to): void
    {
        $this->assertTrue($this->machine->can($from, $to));
    }

    #[DataProvider('illegalTransitions')]
    public function test_illegal_transitions_are_rejected(OrderStatus $from, OrderStatus $to): void
    {
        $this->assertFalse($this->machine->can($from, $to));
    }

    public function test_transition_persists_status_and_writes_an_audit_log(): void
    {
        $order = $this->draftOrder();

        $updated = $this->machine->transition($order, new TransitionStateDTO(
            to: OrderStatus::PendingApproval,
            actionBy: $order->created_by,
            note: 'Submitted for approval',
        ));

        $this->assertSame(OrderStatus::PendingApproval, $updated->status);
        $this->assertDatabaseHas('order_approval_logs', [
            'order_id' => $order->id,
            'from_status' => OrderStatus::Draft->value,
            'to_status' => OrderStatus::PendingApproval->value,
            'note' => 'Submitted for approval',
        ]);
    }

    public function test_illegal_transition_throws_and_does_not_change_status(): void
    {
        $order = $this->draftOrder();

        try {
            $this->machine->transition($order, new TransitionStateDTO(
                to: OrderStatus::Dispatched,
                actionBy: $order->created_by,
            ));
            $this->fail('An illegal transition was accepted.');
        } catch (InvalidStateTransitionException $exception) {
            $this->assertSame(OrderStatus::Draft, $exception->from);
            $this->assertSame(OrderStatus::Dispatched, $exception->to);
        }

        $this->assertSame(OrderStatus::Draft, $order->refresh()->status);
        $this->assertDatabaseCount('order_approval_logs', 0);
    }

    public function test_direct_status_assignment_is_rejected(): void
    {
        $order = $this->draftOrder();

        $this->expectException(InvalidStateTransitionException::class);

        $order->status = OrderStatus::Approved;
        $order->save();
    }

    /**
     * @return list<array{0: OrderStatus, 1: OrderStatus}>
     */
    public static function legalTransitions(): array
    {
        return [
            [OrderStatus::Draft, OrderStatus::PendingApproval],
            [OrderStatus::Draft, OrderStatus::Cancelled],
            [OrderStatus::PendingApproval, OrderStatus::Approved],
            [OrderStatus::PendingApproval, OrderStatus::Rejected],
            [OrderStatus::PendingApproval, OrderStatus::Cancelled],
            [OrderStatus::Approved, OrderStatus::Dispatched],
            [OrderStatus::Approved, OrderStatus::Cancelled],
            [OrderStatus::Dispatched, OrderStatus::Completed],
        ];
    }

    /**
     * @return list<array{0: OrderStatus, 1: OrderStatus}>
     */
    public static function illegalTransitions(): array
    {
        return [
            [OrderStatus::Draft, OrderStatus::Approved],
            [OrderStatus::Draft, OrderStatus::Dispatched],
            [OrderStatus::PendingApproval, OrderStatus::Dispatched],
            [OrderStatus::Rejected, OrderStatus::Approved],
            [OrderStatus::Dispatched, OrderStatus::Cancelled],
            [OrderStatus::Completed, OrderStatus::Draft],
            [OrderStatus::Cancelled, OrderStatus::Draft],
        ];
    }

    private function draftOrder(): Order
    {
        $branch = Branch::query()->create([
            'name' => 'Hà Nội',
            'code' => 'HN',
            'address' => 'Hà Nội',
        ]);
        $user = User::factory()->create(['branch_id' => $branch->id]);

        return Order::query()->create([
            'code' => 'ORD-UNIT-0001',
            'branch_id' => $branch->id,
            'customer_id' => null,
            'created_by' => $user->id,
            'status' => OrderStatus::Draft,
            'subtotal' => '100.00',
            'total_amount' => '100.00',
            'cost_price' => '40.00',
        ]);
    }
}
