# Laravel Inertia Solid playground

A small Laravel application wired to the adapter in the repository root through the pnpm workspace. It exercises Inertia page responses, Solid page resolution and props, `Head`, `Link`, hover prefetching, and reactive async memos backed by Laravel JSON endpoints.

## Initial setup

From this directory:

```bash
composer run setup
```

Or install the PHP and JavaScript dependencies separately from the repository root:

```bash
composer --working-dir=playgrounds/laravel install
cp playgrounds/laravel/.env.example playgrounds/laravel/.env
php playgrounds/laravel/artisan key:generate
pnpm install
pnpm playground:build
```

## Run locally

Start Laravel in one terminal:

```bash
php playgrounds/laravel/artisan serve
```

Start Vite in another:

```bash
pnpm playground:dev
```

Then open <http://localhost:8000>.

## Verify

```bash
pnpm playground:build
pnpm playground:test
```
