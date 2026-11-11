<?php

$frontend = env('FRONTEND_URL');

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter([
        'http://127.0.0.1:5173',
        'http://localhost:5173',
        $frontend,
    ])),

    'allowed_origins_patterns' => [
        '#^https://.*\\.vercel\\.app$#',
        '#^https://flowstate\\.dorisle\\.tech$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
