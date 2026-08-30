<?php

use Illuminate\Http\Request;
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
