<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BoardsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_dashboard_returns_seeded_board_summaries(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Boards/Index')
                ->has('boards', 3)
                ->where('boards.0.title', 'Website launch')
                ->where('boards.0.starred', true)
                ->where('boards.0.cards_count', 6)
                ->where('currentUser.name', 'Maya Chen'));
    }

    public function test_board_page_returns_the_nested_workspace(): void
    {
        $board = Board::query()->where('title', 'Website launch')->firstOrFail();

        $this->get(route('boards.show', $board))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Boards/Show')
                ->where('board.id', $board->id)
                ->has('board.members', 4)
                ->has('board.labels', 5)
                ->has('board.lists', 4)
                ->has('board.lists.1.cards', 2)
                ->where('board.lists.1.cards.0.title', 'Build the local-first board experience')
                ->has('board.lists.1.cards.0.checklist', 3)
                ->has('board.lists.1.cards.0.comments', 1));
    }

    public function test_a_board_can_be_created_with_default_lists(): void
    {
        $this->post('/boards', [
            'title' => 'Customer onboarding',
            'background' => 'sunset',
        ])->assertRedirect();

        $board = Board::query()->where('title', 'Customer onboarding')->firstOrFail();

        $this->assertSame('sunset', $board->background);
        $this->assertSame(['To do', 'Doing', 'Done'], $board->lists()->pluck('title')->all());
        $this->assertCount(4, $board->members);
        $this->assertDatabaseHas('activities', [
            'board_id' => $board->id,
            'action' => 'created this board',
        ]);
    }

    public function test_a_local_snapshot_reconciles_the_entire_board_transactionally(): void
    {
        $board = Board::query()->where('title', 'Website launch')->firstOrFail();
        $snapshot = $this->snapshot($board);
        $labelId = (string) Str::uuid();
        $cardId = (string) Str::uuid();
        $checklistId = (string) Str::uuid();
        $commentId = (string) Str::uuid();
        $originalCardId = $snapshot['lists'][0]['cards'][0]['id'];

        $snapshot['title'] = 'Launch command center';
        $snapshot['labels'] = [[
            'id' => $labelId,
            'name' => 'Ready',
            'color' => 'green',
        ]];
        $snapshot['lists'] = [[
            'id' => $snapshot['lists'][0]['id'],
            'title' => 'Now',
            'position' => 0,
            'cards' => [[
                'id' => $cardId,
                'title' => 'Ship it',
                'description' => 'Publish the final release.',
                'position' => 0,
                'due_at' => null,
                'completed' => false,
                'cover_color' => 'green',
                'label_ids' => [$labelId],
                'member_ids' => [User::query()->firstOrFail()->id],
                'checklist' => [[
                    'id' => $checklistId,
                    'title' => 'Tag release',
                    'completed' => true,
                    'position' => 0,
                ]],
                'comments' => [[
                    'id' => $commentId,
                    'body' => 'Ready when you are.',
                ]],
            ]],
        ]];

        $this->putJson(route('boards.sync', $board), [
            'base_revision' => 0,
            'activity' => 'prepared the final release',
            'snapshot' => $snapshot,
        ])->assertOk()
            ->assertJsonPath('conflict', false)
            ->assertJsonPath('board.title', 'Launch command center')
            ->assertJsonPath('board.revision', 1)
            ->assertJsonPath('board.lists.0.cards.0.id', $cardId)
            ->assertJsonPath('board.lists.0.cards.0.checklist.0.id', $checklistId)
            ->assertJsonPath('board.lists.0.cards.0.comments.0.id', $commentId);

        $this->assertDatabaseCount('board_lists', 7);
        $this->assertDatabaseMissing('cards', ['id' => $originalCardId]);
        $this->assertDatabaseHas('cards', ['id' => $cardId, 'title' => 'Ship it']);
        $this->assertDatabaseHas('card_label', ['card_id' => $cardId, 'label_id' => $labelId]);
        $this->assertDatabaseHas('activities', [
            'board_id' => $board->id,
            'action' => 'prepared the final release',
        ]);
    }

    public function test_sync_rejects_labels_and_members_outside_the_board_snapshot(): void
    {
        $board = Board::query()->where('title', 'Website launch')->firstOrFail();
        $snapshot = $this->snapshot($board);
        $snapshot['lists'][0]['cards'][0]['label_ids'] = [(string) Str::uuid()];
        $snapshot['lists'][0]['cards'][0]['member_ids'] = [9999];

        $this->putJson(route('boards.sync', $board), [
            'base_revision' => 0,
            'activity' => '',
            'snapshot' => $snapshot,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'snapshot.lists.0.cards.0.label_ids',
                'snapshot.lists.0.cards.0.member_ids',
            ]);

        $this->assertSame(0, $board->fresh()->revision);
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(Board $board): array
    {
        $board->load([
            'members',
            'labels',
            'lists.cards.labels',
            'lists.cards.members',
            'lists.cards.checklistItems',
            'lists.cards.comments.user',
            'activities.user',
        ]);

        return json_decode(json_encode((new BoardResource($board))->resolve(), JSON_THROW_ON_ERROR), true, flags: JSON_THROW_ON_ERROR);
    }
}
