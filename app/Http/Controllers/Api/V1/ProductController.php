<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\PermissionEnum;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProductResource;
use App\Models\Branch;
use App\Models\Inventory;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

final class ProductController extends Controller
{
    #[OA\Get(
        path: '/api/v1/products',
        operationId: 'productsIndex',
        summary: 'List products',
        security: [['sanctum' => []]],
        tags: ['Products'],
        responses: [
            new OA\Response(response: 200, description: 'Product collection', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ],
    )]
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize(PermissionEnum::OrdersView->value);

        $products = Product::query()->orderBy('sku')->get();

        return ProductResource::collection($products);
    }

    #[OA\Post(
        path: '/api/v1/products',
        operationId: 'productsStore',
        summary: 'Create product (settings.manage)',
        security: [['sanctum' => []]],
        tags: ['Products'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/IdempotencyKey'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['sku', 'name', 'unit_price', 'cost_price'],
                properties: [
                    new OA\Property(property: 'sku', type: 'string', example: 'FS-100'),
                    new OA\Property(property: 'name', type: 'string', example: 'Ink cartridge'),
                    new OA\Property(property: 'unit', type: 'string', nullable: true, example: 'pcs'),
                    new OA\Property(property: 'unit_price', type: 'number', format: 'float', example: 120000),
                    new OA\Property(property: 'cost_price', type: 'number', format: 'float', example: 80000),
                    new OA\Property(property: 'unitPrice', type: 'number', nullable: true, description: 'CamelCase alias'),
                    new OA\Property(property: 'costPrice', type: 'number', nullable: true, description: 'CamelCase alias'),
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
        Gate::authorize(PermissionEnum::SettingsManage->value);

        $product = DB::transaction(function () use ($request): Product {
            $product = Product::query()->create($this->validated($request));

            foreach (Branch::query()->pluck('id') as $branchId) {
                Inventory::query()->firstOrCreate(
                    [
                        'branch_id' => (int) $branchId,
                        'product_id' => $product->id,
                    ],
                    [
                        'physical_quantity' => 0,
                        'reserved_quantity' => 0,
                        'safety_stock' => 20,
                    ],
                );
            }

            return $product;
        });

        return (new ProductResource($product))
            ->response()
            ->setStatusCode(201);
    }

    #[OA\Put(
        path: '/api/v1/products/{product}',
        operationId: 'productsUpdate',
        summary: 'Update product',
        security: [['sanctum' => []]],
        tags: ['Products'],
        parameters: [
            new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['sku', 'name', 'unit_price', 'cost_price'],
                properties: [
                    new OA\Property(property: 'sku', type: 'string'),
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'unit', type: 'string', nullable: true),
                    new OA\Property(property: 'unit_price', type: 'number'),
                    new OA\Property(property: 'cost_price', type: 'number'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ],
    )]
    #[OA\Patch(
        path: '/api/v1/products/{product}',
        operationId: 'productsPatch',
        summary: 'Update product (PATCH)',
        security: [['sanctum' => []]],
        tags: ['Products'],
        parameters: [
            new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['sku', 'name', 'unit_price', 'cost_price'],
                properties: [
                    new OA\Property(property: 'sku', type: 'string'),
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'unit', type: 'string', nullable: true),
                    new OA\Property(property: 'unit_price', type: 'number'),
                    new OA\Property(property: 'cost_price', type: 'number'),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated', content: new OA\JsonContent(type: 'object')),
        ],
    )]
    public function update(Request $request, Product $product): ProductResource
    {
        Gate::authorize(PermissionEnum::SettingsManage->value);

        $product->update($this->validated($request, $product));

        return new ProductResource($product->fresh());
    }

    #[OA\Delete(
        path: '/api/v1/products/{product}',
        operationId: 'productsDestroy',
        summary: 'Delete product (settings.manage)',
        security: [['sanctum' => []]],
        tags: ['Products'],
        parameters: [
            new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 422, description: 'Used on orders', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function destroy(Product $product): Response
    {
        Gate::authorize(PermissionEnum::SettingsManage->value);

        if (OrderItem::query()->where('product_id', $product->id)->exists()) {
            throw ValidationException::withMessages([
                'product' => ['Cannot delete a product that appears on orders.'],
            ]);
        }

        DB::transaction(function () use ($product): void {
            Inventory::query()->withoutGlobalScopes()->where('product_id', $product->id)->delete();
            $product->delete();
        });

        return response()->noContent();
    }

    /**
     * @return array{sku: string, name: string, unit: string, unit_price: string, cost_price: string}
     */
    private function validated(Request $request, ?Product $product = null): array
    {
        if ($request->filled('unitPrice') && ! $request->filled('unit_price')) {
            $request->merge(['unit_price' => $request->input('unitPrice')]);
        }
        if ($request->filled('costPrice') && ! $request->filled('cost_price')) {
            $request->merge(['cost_price' => $request->input('costPrice')]);
        }
        if ($request->filled('cost') && ! $request->filled('cost_price')) {
            $request->merge(['cost_price' => $request->input('cost')]);
        }

        $payload = $request->validate([
            'sku' => [
                'required',
                'string',
                'max:64',
                Rule::unique('products', 'sku')->ignore($product?->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'unit' => ['nullable', 'string', 'max:32'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['required', 'numeric', 'min:0'],
        ]);

        return [
            'sku' => strtoupper(trim($payload['sku'])),
            'name' => trim($payload['name']),
            'unit' => isset($payload['unit']) && $payload['unit'] !== '' ? trim((string) $payload['unit']) : 'pcs',
            'unit_price' => number_format((float) $payload['unit_price'], 2, '.', ''),
            'cost_price' => number_format((float) $payload['cost_price'], 2, '.', ''),
        ];
    }
}
