<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

Route::get('/{any?}', function () {
    $spa = public_path('client/index.html');

    if (! File::exists($spa)) {
        return response(
            'Frontend build missing. Run: cd frontend && npm run build:hostinger',
            503,
            ['Content-Type' => 'text/plain; charset=UTF-8'],
        );
    }

    return response(File::get($spa), 200, [
        'Content-Type' => 'text/html; charset=UTF-8',
    ]);
})->where('any', '^(?!api|docs|sanctum|up|storage|client|vendor).*$');
