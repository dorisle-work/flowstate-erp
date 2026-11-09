<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\OrderStatus;
use RuntimeException;

final class InvalidStateTransitionException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?OrderStatus $from = null,
        public readonly ?OrderStatus $to = null,
    ) {
        parent::__construct($message);
    }

    public static function between(OrderStatus $from, OrderStatus $to): self
    {
        return new self(
            sprintf('Cannot transition order from [%s] to [%s].', $from->value, $to->value),
            $from,
            $to,
        );
    }
}
