# Adapter parity and support

`@engblock/inertia-solid` targets the user-visible contracts shared by Inertia's React and Vue adapters. The browser suite exercises those contracts in CSR and SSR/hydration modes on Chromium and WebKit. Firefox is excluded because Playwright 1.58's bundled runner hangs before page creation on the supported development environment; no Firefox compatibility claim is made. The package remains an early alpha: a green parity matrix is a release gate, not a claim of production stability.

## Supported versions

The supported peer range is the range declared by the package:

- `@inertiajs/core`: `^3.7.0`
- `solid-js`: `^2.0.0-rc.0`
- `@solidjs/web`: `^2.0.0-rc.0`

Applications should keep `solid-js` and `@solidjs/web` on matching versions. Versions outside these peer ranges are unsupported.

## Intentional Solid differences

Parity describes behavior, not framework syntax. The following differences are intentional:

- `usePage()` returns one stable read-only reactive facade. Read values in JSX, a memo, or another tracked scope instead of destructuring reactive properties during component construction.
- `useForm()` and `useHttp()` return stable Solid stores with stable methods. Status, data, errors, and responses must likewise be read in a tracked scope.
- `<Form>` uses a render callback, context, and callback ref to expose the same stable reactive surface. `createForm<T>()` creates a typed component; it is not another name for `useForm()`.
- `WhenVisible` exposes `fetching` as an accessor because it is callback-local reactive state.
- `Head` accepts serializable descriptors. Solid has no retained VDOM from which the adapter can reliably inspect arbitrary native head children.
- There is no Vue-style plugin or global-property API. Solid applications use exports and context directly.

These syntax differences must not change visits, form serialization, callbacks, errors, cancellation, pagination, history, SSR output, or hydration behavior.

## Reactive reads and lifecycle ownership

Do this:

```tsx
const form = useForm({ email: '' })
return <button disabled={form.processing}>{form.errors.email ?? 'Save'}</button>
```

Do not eagerly capture reactive values:

```tsx
const { processing } = useForm({ email: '' })
```

Inertia core owns remote page snapshots, visits, history, deferred props, prefetching, merging, and page-level optimistic updates. Solid owners hold each reactive projection and own component-local observers, listeners, timers, validators, and request handles. Disposal cancels or disconnects that work. Server rendering creates request-local app and layout state; mutable server state is never stored in the client dispatcher.

## Release matrix

From the repository root:

```bash
pnpm check            # formatting and linting
pnpm typecheck        # package public types
pnpm test             # focused runtime tests
pnpm build            # client, SSR, and declarations
pnpm test:ssr         # server-render smoke test
pnpm test:browser     # CSR + SSR on Chromium and WebKit
pnpm playground:build # real workspace consumer build
pnpm playground:test  # Laravel endpoint and page tests
```

`pnpm test:browser:csr` and `pnpm test:browser:ssr` run one half of the browser matrix. Browser specs install listeners that fail on console errors, page errors, failed responses, and duplicate Inertia requests.

A test may be mode-gated only when its assertion is intrinsically SSR- or CSR-only, and the reason must be stated next to the gate. Framework behavior must not be hidden behind adapter-specific skips. CI runs every command above and blocks release on any failure.
