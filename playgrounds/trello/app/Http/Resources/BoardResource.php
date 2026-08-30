<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BoardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'background' => $this->background,
            'starred' => $this->starred,
            'revision' => $this->revision,
            'updated_at' => $this->updated_at?->toIso8601String(),
            'members' => $this->members->map(fn ($member) => [
                'id' => $member->id,
                'name' => $member->name,
                'initials' => collect(explode(' ', $member->name))
                    ->map(fn (string $part) => mb_substr($part, 0, 1))
                    ->take(2)
                    ->implode(''),
                'color' => ['violet', 'blue', 'teal', 'rose', 'amber'][($member->id - 1) % 5],
            ])->values(),
            'labels' => $this->labels->map(fn ($label) => [
                'id' => $label->id,
                'name' => $label->name,
                'color' => $label->color,
            ])->values(),
            'lists' => $this->lists->map(fn ($list) => [
                'id' => $list->id,
                'title' => $list->title,
                'position' => $list->position,
                'cards' => $list->cards->map(fn ($card) => [
                    'id' => $card->id,
                    'list_id' => $list->id,
                    'title' => $card->title,
                    'description' => $card->description,
                    'position' => $card->position,
                    'due_at' => $card->due_at?->toIso8601String(),
                    'completed' => $card->completed,
                    'cover_color' => $card->cover_color,
                    'label_ids' => $card->labels->pluck('id')->values(),
                    'member_ids' => $card->members->pluck('id')->values(),
                    'checklist' => $card->checklistItems->map(fn ($item) => [
                        'id' => $item->id,
                        'title' => $item->title,
                        'completed' => $item->completed,
                        'position' => $item->position,
                    ])->values(),
                    'comments' => $card->comments->map(fn ($comment) => [
                        'id' => $comment->id,
                        'body' => $comment->body,
                        'created_at' => $comment->created_at?->toIso8601String(),
                        'user' => [
                            'id' => $comment->user->id,
                            'name' => $comment->user->name,
                        ],
                    ])->values(),
                ])->values(),
            ])->values(),
            'activity' => $this->activities->take(30)->map(fn ($activity) => [
                'id' => $activity->id,
                'action' => $activity->action,
                'created_at' => $activity->created_at?->toIso8601String(),
                'user' => [
                    'id' => $activity->user->id,
                    'name' => $activity->user->name,
                ],
            ])->values(),
        ];
    }
}
