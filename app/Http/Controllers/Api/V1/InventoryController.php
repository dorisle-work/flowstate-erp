<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\PermissionEnum;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\InventoryResource;
use App\Models\Inventory;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use OpenApi\Attributes as OA;

final class InventoryController extends Controller
{
    #[OA\Get(
        path: '/api/v1/inventories',
        operationId: 'inventoriesIndex',
        summary: 'List inventory balances',
        security: [['sanctum' => []]],
        tags: ['Inventory'],
        responses: [
            new OA\Response(response: 200, description: 'Inventory collection', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ],
    )]
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize(PermissionEnum::InventoryView->value);

        $inventories = Inventory::query()
            ->with(['product', 'branch'])
            ->orderBy('product_id')
            ->get();

        return InventoryResource::collection($inventories);
    }
}
