<?php

declare(strict_types=1);

namespace App\Support;

final class BranchContext
{
    public function __construct(
        public readonly ?int $branchId,
        public readonly bool $unrestricted,
    ) {}
}
