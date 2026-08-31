<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('boards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 120);
            $table->text('description')->default('');
            $table->string('background', 20)->default('ocean');
            $table->boolean('starred')->default(false);
            $table->unsignedInteger('revision')->default(0);
            $table->timestamps();
        });

        Schema::create('board_user', function (Blueprint $table) {
            $table->foreignUuid('board_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['board_id', 'user_id']);
        });

        Schema::create('board_lists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('board_id')->constrained()->cascadeOnDelete();
            $table->string('title', 120);
            $table->unsignedInteger('position');
            $table->timestamps();
        });

        Schema::create('cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('board_list_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->default('');
            $table->unsignedInteger('position');
            $table->timestamp('due_at')->nullable();
            $table->boolean('completed')->default(false);
            $table->string('cover_color', 20)->nullable();
            $table->timestamps();
        });

        Schema::create('labels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('board_id')->constrained()->cascadeOnDelete();
            $table->string('name', 40)->default('');
            $table->string('color', 20);
            $table->timestamps();
        });

        Schema::create('card_label', function (Blueprint $table) {
            $table->foreignUuid('card_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('label_id')->constrained()->cascadeOnDelete();
            $table->primary(['card_id', 'label_id']);
        });

        Schema::create('card_user', function (Blueprint $table) {
            $table->foreignUuid('card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['card_id', 'user_id']);
        });

        Schema::create('checklist_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('card_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->boolean('completed')->default(false);
            $table->unsignedInteger('position');
            $table->timestamps();
        });

        Schema::create('comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('board_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('action', 120);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('checklist_items');
        Schema::dropIfExists('card_user');
        Schema::dropIfExists('card_label');
        Schema::dropIfExists('labels');
        Schema::dropIfExists('cards');
        Schema::dropIfExists('board_lists');
        Schema::dropIfExists('board_user');
        Schema::dropIfExists('boards');
    }
};
