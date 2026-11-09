<?php

declare(strict_types=1);

namespace App\Http\Requests\V1\Order;

use Illuminate\Foundation\Http\FormRequest;

class TransitionStateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
