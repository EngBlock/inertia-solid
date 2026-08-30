<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProfileRequest;
use Illuminate\Http\RedirectResponse;

class WorkflowController extends Controller
{
    public function store(StoreProfileRequest $request): RedirectResponse
    {
        return to_route('workflows');
    }
}
