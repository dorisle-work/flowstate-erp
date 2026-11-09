<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        // Laravel 11 still evaluates PDO::MYSQL_ATTR_SSL_CA while building its base config.
        // PHP 8.5 deprecates that constant; ignore only this framework warning.
        $previous = set_error_handler(function (int $severity, string $message, string $file, int $line) use (&$previous): bool {
            if ($severity === E_DEPRECATED && str_contains($message, 'PDO::MYSQL_ATTR_SSL_CA')) {
                return true;
            }

            if (is_callable($previous)) {
                return (bool) $previous($severity, $message, $file, $line);
            }

            return false;
        });

        return parent::createApplication();
    }
}
