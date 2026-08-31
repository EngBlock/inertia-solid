<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Board;
use App\Models\BoardList;
use App\Models\Card;
use App\Models\Comment;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $users = collect([
            ['name' => 'Maya Chen', 'email' => 'maya@example.com'],
            ['name' => 'Jon Bell', 'email' => 'jon@example.com'],
            ['name' => 'Priya Shah', 'email' => 'priya@example.com'],
            ['name' => 'Theo Martin', 'email' => 'theo@example.com'],
        ])->map(fn (array $user) => User::create([
            ...$user,
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]));

        $this->createSimpleBoard($users, 'Product roadmap', 'violet', true, [
            'Ideas',
            'Next up',
            'Released',
        ]);
        $this->createSimpleBoard($users, 'Personal planning', 'forest', false, [
            'Inbox',
            'This week',
            'Done',
        ]);
        $this->createWebsiteBoard($users);
    }

    /**
     * @param  Collection<int, User>  $users
     * @param  array<int, string>  $listTitles
     */
    private function createSimpleBoard(Collection $users, string $title, string $background, bool $starred, array $listTitles): void
    {
        $owner = $users->first();
        $board = Board::create([
            'id' => (string) Str::uuid(),
            'owner_id' => $owner->id,
            'title' => $title,
            'description' => 'A focused space for the work that matters next.',
            'background' => $background,
            'starred' => $starred,
        ]);
        $board->members()->attach($users->pluck('id'));

        foreach ($listTitles as $position => $listTitle) {
            BoardList::create([
                'id' => (string) Str::uuid(),
                'board_id' => $board->id,
                'title' => $listTitle,
                'position' => $position,
            ]);
        }

        Activity::create([
            'board_id' => $board->id,
            'user_id' => $owner->id,
            'action' => 'created this board',
        ]);
    }

    /**
     * @param  Collection<int, User>  $users
     */
    private function createWebsiteBoard(Collection $users): void
    {
        $owner = $users->first();
        $board = Board::create([
            'id' => (string) Str::uuid(),
            'owner_id' => $owner->id,
            'title' => 'Website launch',
            'description' => 'Plan and ship the new Trellis marketing site.',
            'background' => 'ocean',
            'starred' => true,
        ]);
        $board->members()->attach($users->pluck('id'));

        $labels = collect([
            ['name' => 'Design', 'color' => 'purple'],
            ['name' => 'Engineering', 'color' => 'blue'],
            ['name' => 'Content', 'color' => 'green'],
            ['name' => 'Urgent', 'color' => 'red'],
            ['name' => 'Launch', 'color' => 'yellow'],
        ])->mapWithKeys(function (array $label) use ($board) {
            $created = $board->labels()->create(['id' => (string) Str::uuid(), ...$label]);

            return [$created->name => $created];
        });

        $lists = collect(['Backlog', 'In progress', 'Review', 'Done'])->map(function (string $title, int $position) use ($board) {
            return BoardList::create([
                'id' => (string) Str::uuid(),
                'board_id' => $board->id,
                'title' => $title,
                'position' => $position,
            ]);
        });

        $makeCard = function (BoardList $list, int $position, string $title, array $options = []) use ($labels, $users): Card {
            $card = Card::create([
                'id' => (string) Str::uuid(),
                'board_list_id' => $list->id,
                'title' => $title,
                'description' => $options['description'] ?? '',
                'position' => $position,
                'due_at' => $options['due_at'] ?? null,
                'completed' => $options['completed'] ?? false,
                'cover_color' => $options['cover_color'] ?? null,
            ]);
            $card->labels()->sync(collect($options['labels'] ?? [])->map(fn (string $name) => $labels[$name]->id));
            $card->members()->sync(collect($options['members'] ?? [0])->map(fn (int $index) => $users[$index]->id));

            foreach ($options['checklist'] ?? [] as $itemPosition => $item) {
                $card->checklistItems()->create([
                    'id' => (string) Str::uuid(),
                    'title' => $item,
                    'completed' => $itemPosition === 0,
                    'position' => $itemPosition,
                ]);
            }

            if (isset($options['comment'])) {
                Comment::create([
                    'id' => (string) Str::uuid(),
                    'card_id' => $card->id,
                    'user_id' => $users[1]->id,
                    'body' => $options['comment'],
                ]);
            }

            return $card;
        };

        $makeCard($lists[0], 0, 'Write homepage launch copy', [
            'description' => 'Draft the headline, supporting copy, and customer proof points.',
            'labels' => ['Content', 'Launch'],
            'members' => [2],
        ]);
        $makeCard($lists[1], 0, 'Build the local-first board experience', [
            'description' => 'Make every board interaction immediate, resilient, and pleasant.',
            'cover_color' => 'blue',
            'labels' => ['Engineering', 'Urgent'],
            'members' => [0, 1],
            'checklist' => ['Add optimistic board updates', 'Persist dirty snapshots', 'Reconcile with the server'],
            'comment' => 'The interaction model feels fast now. Let’s verify reconnect behavior next.',
        ]);
        $makeCard($lists[1], 1, 'Design the launch page', [
            'description' => 'Finish responsive layouts and interaction states.',
            'labels' => ['Design', 'Launch'],
            'members' => [1, 2],
            'due_at' => now()->addDays(4),
        ]);
        $makeCard($lists[2], 0, 'Polish the mobile board layout', [
            'labels' => ['Design'],
            'members' => [1],
        ]);
        $makeCard($lists[2], 1, 'Prepare the launch announcement', [
            'labels' => ['Content', 'Launch'],
            'members' => [2, 3],
        ]);
        $makeCard($lists[3], 0, 'Choose the visual direction', [
            'labels' => ['Design'],
            'members' => [0],
            'completed' => true,
            'cover_color' => 'purple',
        ]);

        foreach (['created this board', 'added the launch checklist', 'moved “Choose the visual direction” to Done'] as $action) {
            Activity::create([
                'board_id' => $board->id,
                'user_id' => $owner->id,
                'action' => $action,
            ]);
        }

        $board->forceFill(['updated_at' => now()->addSecond()])->save();
    }
}
