<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\SyncBoardRequest;
use App\Http\Resources\BoardResource;
use App\Models\Activity;
use App\Models\Board;
use App\Models\BoardList;
use App\Models\Card;
use App\Models\ChecklistItem;
use App\Models\Comment;
use App\Models\Label;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class BoardSyncController extends Controller
{
    public function __invoke(SyncBoardRequest $request, Board $board): JsonResponse
    {
        $data = $request->validated();
        abort_unless($data['snapshot']['id'] === $board->id, 422, 'The board snapshot does not match the route.');

        $baseRevision = $data['base_revision'];
        $snapshot = $data['snapshot'];

        DB::transaction(function () use ($board, $snapshot, $data): void {
            $board->fill([
                ...Arr::only($snapshot, ['title', 'background', 'starred']),
                'description' => $snapshot['description'] ?? '',
            ]);
            $board->revision++;
            $board->save();

            $this->syncLabels($board, $snapshot['labels']);
            $this->syncLists($board, $snapshot['lists']);

            if (filled($data['activity'] ?? null)) {
                Activity::create([
                    'board_id' => $board->id,
                    'user_id' => $board->owner_id,
                    'action' => $data['activity'],
                ]);
            }
        });

        $board->load([
            'members',
            'labels',
            'lists.cards.labels',
            'lists.cards.members',
            'lists.cards.checklistItems',
            'lists.cards.comments.user',
            'activities.user',
        ]);

        return response()->json([
            'board' => (new BoardResource($board))->resolve(),
            'conflict' => $baseRevision !== $board->revision - 1,
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $labels
     */
    private function syncLabels(Board $board, array $labels): void
    {
        $ids = collect($labels)->pluck('id');

        foreach ($labels as $labelData) {
            Label::query()->updateOrCreate(
                ['id' => $labelData['id'], 'board_id' => $board->id],
                Arr::only($labelData, ['name', 'color']),
            );
        }

        $query = $board->labels();
        $ids->isEmpty() ? $query->delete() : $query->whereNotIn('id', $ids)->delete();
    }

    /**
     * @param  array<int, array<string, mixed>>  $lists
     */
    private function syncLists(Board $board, array $lists): void
    {
        $listIds = collect($lists)->pluck('id');
        $cardIds = collect();

        foreach ($lists as $listData) {
            $list = BoardList::query()->updateOrCreate(
                ['id' => $listData['id'], 'board_id' => $board->id],
                Arr::only($listData, ['title', 'position']),
            );

            foreach ($listData['cards'] as $cardData) {
                $cardIds->push($cardData['id']);
                $card = Card::query()
                    ->whereHas('boardList', fn ($query) => $query->where('board_id', $board->id))
                    ->updateOrCreate(
                        ['id' => $cardData['id']],
                        [
                            'board_list_id' => $list->id,
                            'description' => $cardData['description'] ?? '',
                            ...Arr::only($cardData, [
                                'title',
                                'position',
                                'due_at',
                                'completed',
                                'cover_color',
                            ]),
                        ],
                    );

                $card->labels()->sync($cardData['label_ids']);
                $card->members()->sync($cardData['member_ids']);
                $this->syncChecklist($card, $cardData['checklist']);
                $this->syncComments($board, $card, $cardData['comments']);
            }
        }

        $cards = Card::query()->whereHas('boardList', fn ($query) => $query->where('board_id', $board->id));
        $cardIds->isEmpty() ? $cards->delete() : $cards->whereNotIn('id', $cardIds)->delete();

        $boardLists = $board->lists();
        $listIds->isEmpty() ? $boardLists->delete() : $boardLists->whereNotIn('id', $listIds)->delete();
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncChecklist(Card $card, array $items): void
    {
        $ids = collect($items)->pluck('id');

        foreach ($items as $itemData) {
            ChecklistItem::query()->updateOrCreate(
                ['id' => $itemData['id'], 'card_id' => $card->id],
                Arr::only($itemData, ['title', 'completed', 'position']),
            );
        }

        $query = $card->checklistItems();
        $ids->isEmpty() ? $query->delete() : $query->whereNotIn('id', $ids)->delete();
    }

    /**
     * @param  array<int, array<string, mixed>>  $comments
     */
    private function syncComments(Board $board, Card $card, array $comments): void
    {
        $ids = collect($comments)->pluck('id');

        foreach ($comments as $commentData) {
            Comment::query()->updateOrCreate(
                ['id' => $commentData['id'], 'card_id' => $card->id],
                ['user_id' => $board->owner_id, 'body' => $commentData['body']],
            );
        }

        $query = $card->comments();
        $ids->isEmpty() ? $query->delete() : $query->whereNotIn('id', $ids)->delete();
    }
}
