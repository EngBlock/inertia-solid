<?php

use App\Http\Controllers\WorkflowController;
use Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Home', [
    'adapter' => 'the local @engblock/inertia-solid package',
    'framework' => 'Laravel',
    'message' => 'Laravel meets Solid.',
]))->name('home');

Route::get('/about', fn () => Inertia::render('About', [
    'features' => [
        'Client-side Inertia navigation',
        'Solid reactive page props',
        'Document head updates',
        'Hover prefetching',
    ],
]))->name('about');

Route::get('/workflows', function (Request $request) {
    $page = max(1, $request->integer('page', 1));
    $perPage = 5;
    $people = collect(range(1, 15))->map(fn (int $id) => [
        'id' => $id,
        'name' => "Person {$id}",
    ]);
    $paginator = new LengthAwarePaginator(
        $people->forPage($page, $perPage)->values(),
        $people->count(),
        $perPage,
        $page,
        ['path' => route('workflows'), 'pageName' => 'page'],
    );

    return Inertia::render('Workflows', [
        'activity' => Inertia::optional(fn () => 'Visibility loaded this from a partial reload.'),
        'users' => Inertia::scroll($paginator),
    ]);
})->name('workflows');

Route::post('/workflows/helper', function (Request $request) {
    $request->validate(['name' => ['required', 'string', 'max:80']]);

    return to_route('workflows');
})->name('workflows.helper');

Route::post('/workflows/precognition', [WorkflowController::class, 'store'])
    ->middleware(HandlePrecognitiveRequests::class)
    ->name('workflows.precognition');

Route::post('/api/profile', function (Request $request) {
    $data = $request->validate(['name' => ['required', 'string', 'max:80']]);

    return response()->json(['greeting' => "Saved {$data['name']} directly."]);
})->name('api.profile');

Route::get('/async/fact', function (Request $request) {
    $topic = $request->string('topic')->value();
    $facts = [
        'adapter' => 'The adapter keeps Inertia page state synchronous and lets Solid own local async work.',
        'inertia' => 'Inertia delivers server responses as reactive page props without introducing a client router.',
        'solid' => 'Solid 2 async memos keep stale content visible while a reactive dependency is revalidated.',
    ];

    abort_unless(array_key_exists($topic, $facts), 404);

    if (! app()->environment('testing')) {
        //        usleep(350_000);
    }

    return response()->json([
        'topic' => $topic,
        'detail' => $facts[$topic],
    ]);
})->name('async.fact');

Route::get('/async/pulse/{sequence}', function (int $sequence) {
    if (! app()->environment('testing')) {
        // usleep(500_000);
    }

    return response()->json([
        'sequence' => $sequence,
        'servedAt' => now()->toIso8601String(),
    ]);
})->whereNumber('sequence')->name('async.pulse');
