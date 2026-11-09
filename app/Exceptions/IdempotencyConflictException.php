<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class IdempotencyConflictException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Duplicate request detected for this idempotency key.');
    }
}
