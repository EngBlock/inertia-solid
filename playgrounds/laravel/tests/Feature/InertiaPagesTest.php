<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InertiaPagesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_home_page_returns_the_solid_playground_props(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Home')
                ->where('framework', 'Laravel')
                ->where('adapter', 'the local @engblock/inertia-solid package')
                ->where('message', 'Laravel meets Solid.'));
    }

    public function test_about_page_returns_the_feature_list(): void
    {
        $this->get('/about')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('About')
                ->has('features', 4));
    }

    public function test_reactive_async_endpoints_return_json(): void
    {
        $this->getJson('/async/fact?topic=solid')
            ->assertOk()
            ->assertJsonPath('topic', 'solid')
            ->assertJsonStructure(['detail']);

        $this->getJson('/async/pulse/2')
            ->assertOk()
            ->assertJsonPath('sequence', 2)
            ->assertJsonStructure(['servedAt']);
    }
}
