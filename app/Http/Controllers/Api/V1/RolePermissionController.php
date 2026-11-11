<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\PermissionEnum;
use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

final class RolePermissionController extends Controller
{
    #[OA\Get(
        path: '/api/v1/roles-matrix',
        operationId: 'rolesMatrixIndex',
        summary: 'Role permission matrix',
        security: [['sanctum' => []]],
        tags: ['Roles'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Permissions and grants',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'grants', type: 'object'),
                    ],
                ),
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ],
    )]
    public function index(): JsonResponse
    {
        $permissions = collect(PermissionEnum::cases())->map(fn (PermissionEnum $permission): array => [
            'slug' => $permission->value,
            'name' => $permission->description(),
            'group' => $permission->group(),
            'special' => $permission->isSpecial(),
        ])->values();

        $roles = Role::query()
            ->with('permissions:id,slug')
            ->orderBy('id')
            ->get()
            ->mapWithKeys(fn (Role $role): array => [
                $role->slug => $role->permissions->pluck('slug')->values()->all(),
            ]);

        return response()->json([
            'permissions' => $permissions,
            'grants' => $roles,
        ]);
    }

    #[OA\Patch(
        path: '/api/v1/roles-matrix',
        operationId: 'rolesMatrixUpdate',
        summary: 'Toggle a permission on a role (settings.manage)',
        security: [['sanctum' => []]],
        tags: ['Roles'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['role', 'slug', 'enabled'],
                properties: [
                    new OA\Property(property: 'role', type: 'string', example: 'warehouse'),
                    new OA\Property(property: 'slug', type: 'string', example: 'inventory.manual_adjust'),
                    new OA\Property(property: 'enabled', type: 'boolean', example: true),
                ],
            ),
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated matrix', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 422, description: 'Validation error', content: new OA\JsonContent(ref: '#/components/schemas/ValidationError')),
        ],
    )]
    public function update(Request $request): JsonResponse
    {
        Gate::authorize(PermissionEnum::SettingsManage->value);

        $payload = $request->validate([
            'role' => ['required', 'string', Rule::exists('roles', 'slug')],
            'slug' => ['required', 'string', Rule::exists('permissions', 'slug')],
            'enabled' => ['required', 'boolean'],
        ]);

        $role = Role::query()->where('slug', $payload['role'])->firstOrFail();
        $permission = Permission::query()->where('slug', $payload['slug'])->firstOrFail();

        if ($payload['enabled']) {
            $role->permissions()->syncWithoutDetaching([$permission->id]);
        } else {
            $role->permissions()->detach($permission->id);
        }

        return $this->index();
    }
}
