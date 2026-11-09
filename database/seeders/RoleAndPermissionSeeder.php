<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PermissionEnum;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = collect(PermissionEnum::cases())->map(function (PermissionEnum $permission): Permission {
            return Permission::query()->updateOrCreate(
                ['slug' => $permission->value],
                ['name' => $permission->description()],
            );
        });

        $superAdmin = Role::query()->updateOrCreate(
            ['slug' => 'super-admin'],
            ['name' => 'Super Admin'],
        );
        $branchManager = Role::query()->updateOrCreate(
            ['slug' => 'branch-manager'],
            ['name' => 'Branch Manager'],
        );
        $salesStaff = Role::query()->updateOrCreate(
            ['slug' => 'sales-staff'],
            ['name' => 'Sales Staff'],
        );

        $superAdmin->permissions()->sync($permissions->pluck('id'));
        $branchManager->permissions()->sync($permissions->pluck('id'));
        $salesStaff->permissions()->sync(
            $permissions
                ->whereIn('slug', [
                    PermissionEnum::OrdersCreate->value,
                    PermissionEnum::OrdersView->value,
                    PermissionEnum::OrdersUpdate->value,
                    PermissionEnum::OrdersCancel->value,
                    PermissionEnum::InventoryView->value,
                ])
                ->pluck('id'),
        );
    }
}
