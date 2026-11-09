<?php

declare(strict_types=1);

if (PHP_VERSION_ID < 80500) {
    return;
}

set_error_handler(static function (int $severity, string $message): bool {
    if ($severity === E_DEPRECATED && str_contains($message, 'PDO::MYSQL_ATTR_SSL_CA')) {
        return true;
    }

    return false;
});
