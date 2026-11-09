<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\BranchContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ScopeByBranch
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        if ($user->isSuperAdmin()) {
            $header = $request->header('X-Branch-Id');
            $branchId = is_numeric($header) ? (int) $header : null;

            app()->instance(BranchContext::class, new BranchContext($branchId, $branchId === null));

            return $next($request);
        }

        if ($user->branch_id === null) {
            abort(403, 'This account is not assigned to a branch.');
        }

        app()->instance(BranchContext::class, new BranchContext((int) $user->branch_id, false));

        return $next($request);
    }
}
