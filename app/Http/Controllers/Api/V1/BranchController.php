<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\BranchResource;
use App\Models\Branch;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

final class BranchController extends Controller
{
    #[OA\Get(
        path: '/api/v1/branches',
        operationId: 'branchesIndex',
        summary: 'List branches',
        security: [['sanctum' => []]],
        tags: ['Branches'],
        responses: [
            new OA\Response(response: 200, description: 'Branch collection', content: new OA\JsonContent(type: 'object')),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ],
    )]
    public function index(): AnonymousResourceCollection
    {
        $branches = Branch::query()->orderBy('id')->get();

        return BranchResource::collection($branches);
    }
}
