# Trellis

Trellis is a separate Laravel 13 playground for the repository's Solid Inertia adapter. It is a polished Trello-style workspace with seeded demo data, board and card management, drag-and-drop ordering, filters, labels, members, due dates, covers, checklists, comments, and activity history.

The app pins both `solid-js` and `@solidjs/web` to `2.0.0-rc.4` and consumes `@engblock/inertia-solid` through the repository's pnpm workspace.

## Local-first architecture

Inertia remains responsible for navigation, initial page snapshots, validation redirects, and dashboard mutations. Once a board is open, `useLocalBoard` owns its editing session:

1. A server snapshot initializes a Solid `createOptimisticStore`.
2. Each board edit runs synchronously inside a Solid `action`, updates the UI immediately, and writes a dirty snapshot to `localStorage`.
3. A debounced `useHttp.put()` reconciles the complete snapshot in a Laravel database transaction.
4. A successful response updates the authoritative source and settles the optimistic action.
5. A network failure leaves the optimistic layer and local snapshot intact; the browser retries when it comes online.

This keeps remote page ownership with Inertia while giving high-frequency board interactions local-first behavior. Dashboard star toggles use Inertia's page-level `optimistic` visit option instead of creating a second page-prop store.

## Setup

Requirements are PHP 8.3 or newer, Composer, Node.js 20 or newer, and pnpm.

From the repository root:

```bash
composer --working-dir=playgrounds/trello run setup
```

The setup installs Composer and workspace dependencies, creates the local environment and SQLite database, seeds the demo workspace, builds the adapter, and builds this app.

To perform those steps manually:

```bash
composer --working-dir=playgrounds/trello install
cp playgrounds/trello/.env.example playgrounds/trello/.env
php playgrounds/trello/artisan key:generate
touch playgrounds/trello/database/database.sqlite
php playgrounds/trello/artisan migrate --seed
pnpm install
pnpm trello:build
```

## Run locally

Run Laravel and Vite in separate terminals:

```bash
php playgrounds/trello/artisan serve
pnpm trello:dev
```

Laravel serves the app at <http://localhost:8000> and Vite uses port 5174.

## Verify

```bash
pnpm --filter trellis-playground typecheck
pnpm trello:build
pnpm trello:test
```

The PHP feature suite covers dashboard and nested board Inertia props, board creation, transactional snapshot reconciliation, and trust-boundary validation for nested card relationships.
