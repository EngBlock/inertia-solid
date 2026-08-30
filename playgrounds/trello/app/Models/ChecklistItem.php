<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistItem extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'card_id', 'title', 'completed', 'position'];

    protected function casts(): array
    {
        return ['completed' => 'boolean'];
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(Card::class);
    }
}
