<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\PermissionEnum;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\InventoryResource;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

final class InventoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(PermissionEnum::InventoryView->value);

        $inventories = Inventory::query()
            ->with('product')
            ->orderBy('product_id')
            ->paginate($request->integer('per_page', 20));

        return InventoryResource::collection($inventories);
    }
}
