<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class InsufficientStockException extends RuntimeException
{
    public function __construct(
        public readonly int $productId,
        public readonly int $requested,
        public readonly int $available,
        public readonly int $branchId,
    ) {
        parent::__construct(sprintf(
            'Insufficient stock for product [%d] at branch [%d]. Requested %d, available %d.',
            $productId,
            $branchId,
            $requested,
            $available,
        ));
    }
}
