<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OpsNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

final class NotificationController extends Controller
{
    #[OA\Get(
        path: '/api/v1/notifications',
        operationId: 'notificationsIndex',
        summary: 'List ops notifications and Telegram webhook status',
        security: [['sanctum' => []]],
        tags: ['Notifications'],
        parameters: [
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 20, minimum: 1)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Notifications payload',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(
                            property: 'webhook',
                            properties: [
                                new OA\Property(property: 'configured', type: 'boolean'),
                            ],
                            type: 'object',
                        ),
                    ],
                ),
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ],
    )]
    public function index(Request $request): JsonResponse
    {
        $notifications = OpsNotification::query()
            ->with('order:id,code,branch_id')
            ->latest('id')
            ->limit($request->integer('limit', 20))
            ->get()
            ->map(fn (OpsNotification $item): array => [
                'id' => $item->id,
                'title' => $item->title,
                'body' => $item->body,
                'href' => $item->href,
                'orderId' => $item->order_id,
                'telegramStatus' => $item->telegram_status,
                'unread' => true,
                'createdAt' => $item->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => $notifications,
            'webhook' => [
                'configured' => filled(config('services.telegram.bot_token'))
                    && filled(config('services.telegram.chat_id')),
            ],
        ]);
    }
}
