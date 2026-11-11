<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\PermissionEnum;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CustomerResource;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

final class CustomerController extends Controller
{
    #[OA\Get(
        path: '/api/v1/customers',
        operationId: 'customersIndex',
        summary: 'List customers',
        security: [['sanctum' => []]],
        tags: ['Customers'],
        responses: [
            new OA\Response(response: 200, description: 'Customer collection', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ],
    )]
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize(PermissionEnum::OrdersView->value);

        $customers = Customer::query()
            ->with('branch')
            ->withCount('orders')
            ->addSelect([
                'revenue' => DB::table('orders')
                    ->selectRaw('coalesce(sum(total_amount), 0)')
                    ->whereColumn('orders.customer_id', 'customers.id')
                    ->whereNotIn('orders.status', ['cancelled', 'rejected']),
            ])
            ->orderBy('code')
            ->get();

        return CustomerResource::collection($customers);
    }

    #[OA\Post(
        path: '/api/v1/customers',
        operationId: 'customersStore',
        summary: 'Create customer',
        security: [['sanctum' => []]],
        tags: ['Customers'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['code', 'name', 'branch_id'],
                properties: [
                    new OA\Property(property: 'code', type: 'string', example: 'KH-100'),
                    new OA\Property(property: 'name', type: 'string', example: 'Acme Co'),
                    new OA\Property(property: 'phone', type: 'string', nullable: true, example: '0901234567'),
                    new OA\Property(property: 'branch_id', type: 'integer', example: 1),
                    new OA\Property(property: 'branchId', type: 'integer', nullable: true, description: 'CamelCase alias for branch_id'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function store(Request $request): JsonResponse
    {
        Gate::authorize(PermissionEnum::OrdersCreate->value);

        $customer = Customer::query()->create($this->validated($request));

        return (new CustomerResource($customer->load('branch')))
            ->response()
            ->setStatusCode(201);
    }

    #[OA\Put(
        path: '/api/v1/customers/{customer}',
        operationId: 'customersUpdate',
        summary: 'Update customer',
        security: [['sanctum' => []]],
        tags: ['Customers'],
        parameters: [
            new OA\Parameter(name: 'customer', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['code', 'name', 'branch_id'],
                properties: [
                    new OA\Property(property: 'code', type: 'string'),
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'phone', type: 'string', nullable: true),
                    new OA\Property(property: 'branch_id', type: 'integer'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    #[OA\Patch(
        path: '/api/v1/customers/{customer}',
        operationId: 'customersPatch',
        summary: 'Update customer (PATCH)',
        security: [['sanctum' => []]],
        tags: ['Customers'],
        parameters: [
            new OA\Parameter(name: 'customer', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['code', 'name', 'branch_id'],
                properties: [
                    new OA\Property(property: 'code', type: 'string'),
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'phone', type: 'string', nullable: true),
                    new OA\Property(property: 'branch_id', type: 'integer'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(type: 'object')),
        ],
    )]
    public function update(Request $request, Customer $customer): CustomerResource
    {
        Gate::authorize(PermissionEnum::OrdersCreate->value);

        $customer->update($this->validated($request, $customer));

        return new CustomerResource($customer->fresh()->load('branch'));
    }

    #[OA\Delete(
        path: '/api/v1/customers/{customer}',
        operationId: 'customersDestroy',
        summary: 'Delete customer (settings.manage)',
        security: [['sanctum' => []]],
        tags: ['Customers'],
        parameters: [
            new OA\Parameter(name: 'customer', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 422, description: 'Has orders', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function destroy(Customer $customer): Response
    {
        Gate::authorize(PermissionEnum::SettingsManage->value);

        if ($customer->orders()->exists()) {
            throw ValidationException::withMessages([
                'customer' => ['Cannot delete a customer that already has orders.'],
            ]);
        }

        $customer->delete();

        return response()->noContent();
    }

    /**
     * @return array{code: string, name: string, phone: ?string, branch_id: int}
     */
    private function validated(Request $request, ?Customer $customer = null): array
    {
        /** @var User $user */
        $user = $request->user();

        if ($request->filled('branchId') && ! $request->filled('branch_id')) {
            $request->merge(['branch_id' => $request->input('branchId')]);
        }

        if (! $user->isSuperAdmin()) {
            $request->merge(['branch_id' => $user->branch_id]);
        }

        $payload = $request->validate([
            'code' => [
                'required',
                'string',
                'max:32',
                Rule::unique('customers', 'code')->ignore($customer?->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
        ]);

        return [
            'code' => strtoupper(trim($payload['code'])),
            'name' => trim($payload['name']),
            'phone' => isset($payload['phone']) ? trim((string) $payload['phone']) : null,
            'branch_id' => (int) $payload['branch_id'],
        ];
    }
}
