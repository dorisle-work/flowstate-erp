<?php

declare(strict_types=1);

return [
    'store' => env('IDEMPOTENCY_STORE', 'redis'),
    'ttl' => (int) env('IDEMPOTENCY_TTL', 60),
];
