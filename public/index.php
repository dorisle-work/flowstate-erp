<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
|--------------------------------------------------------------------------
| Resolve application base path
|--------------------------------------------------------------------------
|
| Normal:   project/public/index.php → project/
| Hostinger (docroot = public_html only):
|           public_html/index.php → public_html/laravel/
|
*/

$basePath = is_file(__DIR__.'/../bootstrap/app.php')
    ? dirname(__DIR__)
    : __DIR__.'/laravel';

if (! is_file($basePath.'/bootstrap/app.php')) {
    http_response_code(500);
    echo 'Laravel base path not found. Expected ../bootstrap or ./laravel/bootstrap.';
    exit(1);
}

require $basePath.'/bootstrap/silence-php85-deprecations.php';

if (file_exists($maintenance = $basePath.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $basePath.'/vendor/autoload.php';

(require_once $basePath.'/bootstrap/app.php')
    ->handleRequest(Request::capture());
