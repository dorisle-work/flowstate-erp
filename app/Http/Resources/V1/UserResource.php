<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $role = $this->roles->first();
        $slug = $role?->slug ?? 'sales-staff';

        $permissions = $this->isSuperAdmin()
            ? $this->allPermissionSlugs()
            : $this->roles
                ->flatMap(fn ($item) => $item->permissions->pluck('slug'))
                ->unique()
                ->values()
                ->all();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $slug,
            'roleLabel' => $this->roleLabel($slug),
            'branchId' => $this->branch_id,
            'branch_id' => $this->branch_id,
            'permissions' => $permissions,
        ];
    }

    /**
     * @return list<string>
     */
    private function allPermissionSlugs(): array
    {
        return \App\Models\Permission::query()->orderBy('id')->pluck('slug')->all();
    }

    private function roleLabel(string $slug): string
    {
        return match ($slug) {
            'super-admin' => 'Super Admin',
            'branch-manager' => 'Branch Manager',
            'warehouse' => 'Thủ kho',
            default => 'Sales Staff',
        };
    }
}
