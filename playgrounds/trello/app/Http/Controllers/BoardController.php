<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BoardResource;
use App\Models\Activity;
use App\Models\Board;
use App\Models\BoardList;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BoardController extends Controller
{
    public function index(): Response
    {
        $boards = Board::query()
            ->with('members')
            ->withCount('cards')
            ->latest('updated_at')
            ->get()
            ->map(fn (Board $board) => [
                'id' => $board->id,
                'title' => $board->title,
                'background' => $board->background,
                'starred' => $board->starred,
                'cards_count' => $board->cards_count,
                'updated_at' => $board->updated_at?->toIso8601String(),
                'members' => $board->members->map(fn (User $member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'initials' => collect(explode(' ', $member->name))
                        ->map(fn (string $part) => mb_substr($part, 0, 1))
                        ->take(2)
                        ->implode(''),
                ])->values(),
            ]);

        return Inertia::render('Boards/Index', [
            'boards' => $boards,
            'currentUser' => $this->currentUser(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'background' => ['required', 'in:ocean,violet,forest,sunset,slate'],
        ]);
        $user = $this->currentUserModel();

        $board = Board::create([
            'id' => (string) Str::uuid(),
            'owner_id' => $user->id,
            ...$data,
        ]);
        $board->members()->attach(User::query()->pluck('id'));

        foreach (['To do', 'Doing', 'Done'] as $position => $title) {
            BoardList::create([
                'id' => (string) Str::uuid(),
                'board_id' => $board->id,
                'title' => $title,
                'position' => $position,
            ]);
        }

        Activity::create([
            'board_id' => $board->id,
            'user_id' => $user->id,
            'action' => 'created this board',
        ]);

        return to_route('boards.show', $board);
    }

    public function show(Board $board): Response
    {
        $board->load($this->boardRelations());

        return Inertia::render('Boards/Show', [
            'board' => (new BoardResource($board))->resolve(),
            'currentUser' => $this->currentUser(),
        ]);
    }

    public function update(Request $request, Board $board): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:120'],
            'background' => ['sometimes', 'required', 'in:ocean,violet,forest,sunset,slate'],
            'starred' => ['sometimes', 'boolean'],
        ]);

        $board->update($data);

        return back();
    }

    public function destroy(Board $board): RedirectResponse
    {
        $board->delete();

        return to_route('boards.index');
    }

    /**
     * @return array<int, string>
     */
    private function boardRelations(): array
    {
        return [
            'members',
            'labels',
            'lists.cards.labels',
            'lists.cards.members',
            'lists.cards.checklistItems',
            'lists.cards.comments.user',
            'activities.user',
        ];
    }

    /**
     * @return array{id: int, name: string}
     */
    private function currentUser(): array
    {
        $user = $this->currentUserModel();

        return ['id' => $user->id, 'name' => $user->name];
    }

    private function currentUserModel(): User
    {
        return User::query()->firstOrFail();
    }
}
