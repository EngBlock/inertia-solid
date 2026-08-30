# Laravel Inertia Solid playground

A Laravel application wired to the repository's adapter through the pnpm workspace. It is a real consumer build rather than an adapter-internal fixture.

The home and about pages exercise page resolution, props, `Head`, `Link`, prefetching, Solid-owned async work, and persistent layouts. `/workflows` contains intentionally small examples of:

- helper-driven `useForm` visits;
- native `<Form>` submission with Laravel Precognition;
- direct JSON submission through `useHttp`;
- lazy partial reloads through `WhenVisible`;
- manual paginated merging through `InfiniteScroll`; and
- reactive named layout props through `setLayoutProps`.

The examples read store properties and accessors inside JSX so that Solid tracks them. They do not eagerly destructure reactive form or page state.

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

Then open <http://localhost:8000/workflows>.

## Verify

```bash
pnpm playground:build
pnpm playground:test
```

The feature suite verifies the Inertia pages, scroll metadata, helper/direct endpoints, validation, and Precognition handshake. The Vite build verifies that the playground consumes the generated workspace package declarations and browser bundle.
