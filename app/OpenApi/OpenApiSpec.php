<?php

declare(strict_types=1);

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'FlowState ERP API',
    description: 'Sanctum bearer API for FlowState ERP (`/api/v1`). Mutating POST/PUT/PATCH routes under idempotency middleware require header `X-Idempotency-Key` (8–128 characters).',
)]
#[OA\Server(url: L5_SWAGGER_CONST_HOST, description: 'API host')]
#[OA\SecurityScheme(
    securityScheme: 'sanctum',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Sanctum',
    description: 'Personal access token from POST /api/v1/auth/login',
)]
#[OA\Tag(name: 'Auth', description: 'Login and session')]
#[OA\Tag(name: 'Branches', description: 'Branch directory')]
#[OA\Tag(name: 'Customers', description: 'Customer CRUD')]
#[OA\Tag(name: 'Products', description: 'Product catalog CRUD')]
#[OA\Tag(name: 'Orders', description: 'Orders and FSM transitions')]
#[OA\Tag(name: 'Inventory', description: 'Stock balances and ledger writes')]
#[OA\Tag(name: 'Accounts', description: 'User accounts')]
#[OA\Tag(name: 'Roles', description: 'Role permission matrix')]
#[OA\Tag(name: 'Notifications', description: 'Ops notices and Telegram webhook status')]
#[OA\Parameter(
    parameter: 'IdempotencyKey',
    name: 'X-Idempotency-Key',
    description: 'Client-generated idempotency key (8–128 characters). Required on idempotent mutations.',
    in: 'header',
    required: true,
    schema: new OA\Schema(type: 'string', minLength: 8, maxLength: 128, example: 'demo-key-0001'),
)]
#[OA\Parameter(
    parameter: 'OrderId',
    name: 'order',
    description: 'Order id',
    in: 'path',
    required: true,
    schema: new OA\Schema(type: 'integer', example: 1),
)]
final class OpenApiSpec
{
}
