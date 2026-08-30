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

    public function test_workflow_page_exposes_scroll_and_lazy_props(): void
    {
        $this->get('/workflows')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Workflows')
                ->missing('activity')
                ->has('users.data', 5)
                ->where('users.data.0.name', 'Person 1'));

        $this->get('/workflows?page=2')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Workflows')
                ->where('users.data.0.name', 'Person 6'));
    }

    public function test_workflow_form_endpoints_validate_and_respond(): void
    {
        $this->post('/workflows/helper', ['name' => 'Ada'])
            ->assertRedirect('/workflows');

        $this->postJson('/api/profile', ['name' => 'Ada'])
            ->assertOk()
            ->assertJsonPath('greeting', 'Saved Ada directly.');

        $this->postJson('/api/profile', ['name' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_precognition_endpoint_validates_without_running_the_handler_response(): void
    {
        $headers = [
            'Accept' => 'application/json',
            'Precognition' => 'true',
            'Precognition-Validate-Only' => 'name',
        ];

        $this->withHeaders($headers)
            ->post('/workflows/precognition', ['name' => 'Ada'])
            ->assertNoContent();

        $this->withHeaders($headers)
            ->post('/workflows/precognition', ['name' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
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
