<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Inventory\AdjustStockAction;
use App\Actions\Inventory\ReceivePurchaseAction;
use App\Enums\PermissionEnum;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\InventoryResource;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

final class InventoryMovementController extends Controller
{
    #[OA\Post(
        path: '/api/v1/inventories/adjust',
        operationId: 'inventoriesAdjust',
        summary: 'Manual stock adjustment',
        security: [['sanctum' => []]],
        tags: ['Inventory'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['branch_id', 'product_id', 'quantity_delta'],
                properties: [
                    new OA\Property(property: 'branch_id', type: 'integer', example: 1),
                    new OA\Property(property: 'product_id', type: 'integer', example: 1),
                    new OA\Property(property: 'sku', type: 'string', nullable: true, description: 'Resolves product_id when set'),
                    new OA\Property(property: 'quantity_delta', type: 'integer', example: -2, description: 'Non-zero signed delta'),
                    new OA\Property(property: 'note', type: 'string', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Adjustment recorded', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function adjust(Request $request, AdjustStockAction $action): JsonResponse
    {
        Gate::authorize(PermissionEnum::InventoryManualAdjust->value);

        $payload = $this->validatedMovement($request, requirePositiveQuantity: false);
        $result = $action->execute(
            branchId: $payload['branch_id'],
            productId: $payload['product_id'],
            quantityDelta: $payload['quantity_delta'],
            actorId: (int) $request->user()->id,
            note: $payload['note'] ?? null,
        );

        return response()->json([
            'data' => (new InventoryResource($result['inventory']))->resolve($request),
            'reference_code' => $result['transaction']->reference_code,
            'message' => 'Stock adjustment recorded.',
        ]);
    }

    #[OA\Post(
        path: '/api/v1/inventories/receive',
        operationId: 'inventoriesReceive',
        summary: 'Receive purchase stock from supplier',
        security: [['sanctum' => []]],
        tags: ['Inventory'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['branch_id', 'product_id', 'quantity'],
                properties: [
                    new OA\Property(property: 'branch_id', type: 'integer', example: 1),
                    new OA\Property(property: 'product_id', type: 'integer', example: 1),
                    new OA\Property(property: 'sku', type: 'string', nullable: true),
                    new OA\Property(property: 'quantity', type: 'integer', minimum: 1, example: 10),
                    new OA\Property(property: 'supplier_ref', type: 'string', nullable: true, example: 'PO-2026-01'),
                    new OA\Property(property: 'note', type: 'string', nullable: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Receipt recorded', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function receive(Request $request, ReceivePurchaseAction $action): JsonResponse
    {
        Gate::authorize(PermissionEnum::InventoryManualAdjust->value);

        $payload = $this->validatedMovement($request, requirePositiveQuantity: true);
        $result = $action->execute(
            branchId: $payload['branch_id'],
            productId: $payload['product_id'],
            quantity: $payload['quantity'],
            actorId: (int) $request->user()->id,
            supplierRef: $payload['supplier_ref'] ?? null,
        );

        return response()->json([
            'data' => (new InventoryResource($result['inventory']))->resolve($request),
            'reference_code' => $result['transaction']->reference_code,
            'message' => 'Purchase receipt recorded.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedMovement(Request $request, bool $requirePositiveQuantity): array
    {
        /** @var User $user */
        $user = $request->user();

        if ($request->filled('sku') && ! $request->filled('product_id') && ! $request->filled('productId')) {
            $productId = Product::query()->where('sku', $request->string('sku')->toString())->value('id');
            if ($productId !== null) {
                $request->merge(['product_id' => $productId]);
            }
        }

        if ($request->filled('branchId') && ! $request->filled('branch_id')) {
            $request->merge(['branch_id' => $request->input('branchId')]);
        }
        if ($request->filled('productId') && ! $request->filled('product_id')) {
            $request->merge(['product_id' => $request->input('productId')]);
        }
        if ($request->filled('quantityDelta') && ! $request->filled('quantity_delta')) {
            $request->merge(['quantity_delta' => $request->input('quantityDelta')]);
        }
        if ($request->filled('supplierRef') && ! $request->filled('supplier_ref')) {
            $request->merge(['supplier_ref' => $request->input('supplierRef')]);
        }

        if (! $user->isSuperAdmin()) {
            $request->merge(['branch_id' => $user->branch_id]);
        }

        $rules = [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'note' => ['nullable', 'string', 'max:255'],
            'supplier_ref' => ['nullable', 'string', 'max:64'],
        ];

        if ($requirePositiveQuantity) {
            $rules['quantity'] = ['required', 'integer', 'min:1'];
        } else {
            $rules['quantity_delta'] = ['required', 'integer', Rule::notIn([0])];
        }

        return $request->validate($rules);
    }
}
