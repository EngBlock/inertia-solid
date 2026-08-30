<?php

use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardSyncController;
use Illuminate\Support\Facades\Route;

Route::get('/', [BoardController::class, 'index'])->name('boards.index');
Route::post('/boards', [BoardController::class, 'store'])->name('boards.store');
Route::get('/boards/{board}', [BoardController::class, 'show'])->name('boards.show');
Route::patch('/boards/{board}', [BoardController::class, 'update'])->name('boards.update');
Route::delete('/boards/{board}', [BoardController::class, 'destroy'])->name('boards.destroy');
Route::put('/api/boards/{board}/sync', BoardSyncController::class)->name('boards.sync');
