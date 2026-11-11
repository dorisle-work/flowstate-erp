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

        $allIds = $permissions->pluck('id');

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
        $warehouse = Role::query()->updateOrCreate(
            ['slug' => 'warehouse'],
            ['name' => 'Thủ kho'],
        );

        $superAdmin->permissions()->sync($allIds);
        $branchManager->permissions()->sync($allIds);
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
        $warehouse->permissions()->sync(
            $permissions
                ->whereIn('slug', [
                    PermissionEnum::OrdersView->value,
                    PermissionEnum::OrdersDispatch->value,
                    PermissionEnum::InventoryView->value,
                    PermissionEnum::InventoryManualAdjust->value,
                ])
                ->pluck('id'),
        );
    }
}
