<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SyncBoardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'base_revision' => ['required', 'integer', 'min:0'],
            'activity' => ['nullable', 'string', 'max:120'],
            'snapshot' => ['required', 'array'],
            'snapshot.id' => ['required', 'uuid'],
            'snapshot.title' => ['required', 'string', 'max:120'],
            'snapshot.description' => ['present', 'nullable', 'string', 'max:5000'],
            'snapshot.background' => ['required', Rule::in(['ocean', 'violet', 'forest', 'sunset', 'slate'])],
            'snapshot.starred' => ['required', 'boolean'],
            'snapshot.labels' => ['present', 'array', 'max:20'],
            'snapshot.labels.*.id' => ['required', 'uuid', 'distinct'],
            'snapshot.labels.*.name' => ['present', 'string', 'max:40'],
            'snapshot.labels.*.color' => ['required', Rule::in(['green', 'yellow', 'orange', 'red', 'purple', 'blue'])],
            'snapshot.lists' => ['present', 'array', 'max:50'],
            'snapshot.lists.*.id' => ['required', 'uuid', 'distinct'],
            'snapshot.lists.*.title' => ['required', 'string', 'max:120'],
            'snapshot.lists.*.position' => ['required', 'integer', 'min:0'],
            'snapshot.lists.*.cards' => ['present', 'array', 'max:500'],
            'snapshot.lists.*.cards.*.id' => ['required', 'uuid', 'distinct'],
            'snapshot.lists.*.cards.*.title' => ['required', 'string', 'max:255'],
            'snapshot.lists.*.cards.*.description' => ['present', 'nullable', 'string', 'max:10000'],
            'snapshot.lists.*.cards.*.position' => ['required', 'integer', 'min:0'],
            'snapshot.lists.*.cards.*.due_at' => ['nullable', 'date'],
            'snapshot.lists.*.cards.*.completed' => ['required', 'boolean'],
            'snapshot.lists.*.cards.*.cover_color' => ['nullable', Rule::in(['green', 'yellow', 'orange', 'red', 'purple', 'blue'])],
            'snapshot.lists.*.cards.*.label_ids' => ['present', 'array'],
            'snapshot.lists.*.cards.*.label_ids.*' => ['uuid'],
            'snapshot.lists.*.cards.*.member_ids' => ['present', 'array'],
            'snapshot.lists.*.cards.*.member_ids.*' => ['integer'],
            'snapshot.lists.*.cards.*.checklist' => ['present', 'array', 'max:100'],
            'snapshot.lists.*.cards.*.checklist.*.id' => ['required', 'uuid', 'distinct'],
            'snapshot.lists.*.cards.*.checklist.*.title' => ['required', 'string', 'max:255'],
            'snapshot.lists.*.cards.*.checklist.*.completed' => ['required', 'boolean'],
            'snapshot.lists.*.cards.*.checklist.*.position' => ['required', 'integer', 'min:0'],
            'snapshot.lists.*.cards.*.comments' => ['present', 'array', 'max:200'],
            'snapshot.lists.*.cards.*.comments.*.id' => ['required', 'uuid', 'distinct'],
            'snapshot.lists.*.cards.*.comments.*.body' => ['required', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $board = $this->route('board');
            $snapshot = $this->input('snapshot');
            $labelIds = collect($snapshot['labels'])->pluck('id');
            $memberIds = $board->members()->pluck('users.id');

            foreach ($snapshot['lists'] as $listIndex => $list) {
                foreach ($list['cards'] as $cardIndex => $card) {
                    if (collect($card['label_ids'])->duplicates()->isNotEmpty()) {
                        $validator->errors()->add(
                            "snapshot.lists.$listIndex.cards.$cardIndex.label_ids",
                            'A card cannot contain the same label more than once.',
                        );
                    }

                    if (collect($card['member_ids'])->duplicates()->isNotEmpty()) {
                        $validator->errors()->add(
                            "snapshot.lists.$listIndex.cards.$cardIndex.member_ids",
                            'A card cannot contain the same member more than once.',
                        );
                    }

                    if (collect($card['label_ids'])->diff($labelIds)->isNotEmpty()) {
                        $validator->errors()->add(
                            "snapshot.lists.$listIndex.cards.$cardIndex.label_ids",
                            'Every card label must belong to this board snapshot.',
                        );
                    }

                    if (collect($card['member_ids'])->diff($memberIds)->isNotEmpty()) {
                        $validator->errors()->add(
                            "snapshot.lists.$listIndex.cards.$cardIndex.member_ids",
                            'Every card member must belong to this board.',
                        );
                    }
                }
            }
        }];
    }
}
