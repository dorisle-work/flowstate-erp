<?php

declare(strict_types=1);

namespace App\Support;

final class Money
{
    public static function mul(string $amount, int $quantity): string
    {
        return bcmul(self::normalize($amount), (string) $quantity, 2);
    }

    public static function add(string $left, string $right): string
    {
        return bcadd(self::normalize($left), self::normalize($right), 2);
    }

    public static function marginRate(string $total, string $cost): ?string
    {
        $total = self::normalize($total);

        if (bccomp($total, '0', 2) !== 1) {
            return null;
        }

        return bcdiv(bcsub($total, self::normalize($cost), 2), $total, 4);
    }

    private static function normalize(string $amount): string
    {
        return number_format((float) $amount, 2, '.', '');
    }
}
