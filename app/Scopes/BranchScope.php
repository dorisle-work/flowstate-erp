<?php

declare(strict_types=1);

namespace App\Scopes;

use App\Models\User;
use App\Support\BranchContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

final class BranchScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $branchId = $this->resolveBranchId();

        if ($branchId === null) {
            return;
        }

        $builder->where($model->qualifyColumn('branch_id'), $branchId);
    }

    private function resolveBranchId(): ?int
    {
        if (app()->bound(BranchContext::class)) {
            /** @var BranchContext $context */
            $context = app(BranchContext::class);

            return $context->unrestricted ? null : $context->branchId;
        }

        $user = Auth::user();

        if (! $user instanceof User || $user->isSuperAdmin()) {
            return null;
        }

        return $user->branch_id !== null ? (int) $user->branch_id : -1;
    }
}
