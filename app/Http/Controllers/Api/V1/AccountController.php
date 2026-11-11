<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

final class AccountController extends Controller
{
    #[OA\Get(
        path: '/api/v1/accounts',
        operationId: 'accountsIndex',
        summary: 'List user accounts',
        security: [['sanctum' => []]],
        tags: ['Accounts'],
        responses: [
            new OA\Response(response: 200, description: 'Account collection', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ],
    )]
    public function index(): AnonymousResourceCollection
    {
        $users = User::query()
            ->with(['roles.permissions'])
            ->orderBy('id')
            ->get();

        return UserResource::collection($users);
    }
}
