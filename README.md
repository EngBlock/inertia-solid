# Inertia Solid

A community SolidJS 2 adapter for [Inertia.js](https://inertiajs.com/).

> [!WARNING]
> This package is an early alpha. The parity matrix is a release gate, not a claim of production stability. Do not use this release in production yet.

## Design

Inertia owns remote page state: visits, history, deferred requests, prefetching, page merging, and page-level optimism. Solid owns the reactive projection, component lifetime, local state, and user-created async computations.

The adapter intentionally does not depend on Solid Router or create a second query cache. An Inertia page snapshot is synchronous; native Solid async belongs inside page components.

See [docs/architecture.md](docs/architecture.md) for the complete exploration and [docs/parity.md](docs/parity.md) for supported versions, intentional Solid differences, and release gates.

## Install

```bash
pnpm add @engblock/inertia-solid @inertiajs/core solid-js @solidjs/web
```

The supported peer ranges are `@inertiajs/core@^3.7.0`, `solid-js@^2.0.0-rc.0`, and `@solidjs/web@^2.0.0-rc.0`. Keep both Solid packages on matching versions. See [the parity and support guide](docs/parity.md) for intentional Solid syntax differences and lifecycle guidance.

## Client setup

```tsx
import { createInertiaApp } from '@engblock/inertia-solid'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx')
    return pages[`./Pages/${name}.tsx`]()
  },
})
```

Manual setup is also supported:

```tsx
import { createInertiaApp } from '@engblock/inertia-solid'
import { render } from '@solidjs/web'

createInertiaApp({
  resolve: (name) => import(`./Pages/${name}.tsx`),
  setup({ el, App, props }) {
    render(() => <App {...props} />, el!)
  },
})
```

## Page data and navigation

```tsx
import { Link, usePage } from '@engblock/inertia-solid'

export default function Users() {
  const page = usePage<{ users: Array<{ id: number; name: string }> }>()

  return (
    <main>
      <Link href="/users" prefetch="hover">
        Users
      </Link>
      <For each={page.props.users}>{(user) => <p>{user.name}</p>}</For>
    </main>
  )
}
```

`usePage()` returns a stable read-only reactive facade. Read its properties in JSX or a memo; avoid destructuring reactive values at component top level.

## Persistent layouts

Layout components retain their owners and local state across navigation while page owners follow `preserveState`. Dynamic props can target every layout or one named layout:

```tsx
import { setLayoutProps } from '@engblock/inertia-solid'

function Page() {
  return <button onClick={() => setLayoutProps('content', { padding: 'xl' })}>Expand content</button>
}

Page.layout = {
  app: [AppLayout, { title: 'Dashboard' }],
  content: [ContentLayout, { padding: 'md' }],
}
```

`resetLayoutProps()` explicitly clears dynamic values. Non-preserving navigation clears them automatically.

## Deferred and native async data

Inertia deferred props retain their protocol-specific boundary:

```tsx
<Deferred data="users" fallback={<UsersSkeleton />}>
  {({ reloading }) => <Users dimmed={reloading()} />}
</Deferred>
```

User-owned asynchronous data uses Solid directly:

```tsx
const recommendations = createMemo(() => fetchRecommendations(page.props.user.id))

<Loading fallback={<RecommendationsSkeleton />}>
  <Recommendations items={recommendations()} />
</Loading>
```

## Head descriptors

Solid has no retained VDOM for inspecting arbitrary native head children. The alpha API therefore uses serializable descriptors:

```tsx
<Head
  title="Users"
  tags={[
    {
      tag: 'meta',
      headKey: 'description',
      attrs: { name: 'description', content: 'User list' },
    },
  ]}
/>
```

## Component forms

`Form` serializes native controls and exposes one stable reactive surface to its render callback, component ref, and descendants:

```tsx
import { createForm, Form, type FormComponentRef, useFormContext } from '@engblock/inertia-solid'

function FieldError() {
  const form = useFormContext<{ name: string }>()
  return <span>{form?.errors.name}</span>
}

let formRef: FormComponentRef<{ name: string }> | undefined

;<Form<{ name: string }> action="/users" method="post" ref={(form) => (formRef = form)}>
  {(form) => (
    <>
      <input name="name" />
      <FieldError />
      <button disabled={form.processing}>Save</button>
    </>
  )}
</Form>
```

The surface provides `errors`, `hasErrors`, `processing`, `progress`, success state, and `isDirty`, plus `clearErrors`, `resetAndClearErrors`, `setError`, `reset`, `submit`, `cancel`, `defaults`, `getData`, and `getFormData`. Precognitive forms also expose `validate`, `touch`, `touched`, `valid`, `invalid`, `validating`, and `validator`; configure component forms with `validationTimeout`, `validateFiles`, and `withAllErrors`. Read reactive properties where Solid tracks them rather than destructuring them eagerly. `useFormContext()` returns `undefined` outside a form.

Use `createForm<T>()` to create a reusable typed `Form` component. It is a component factory, not an alias for the state-oriented `useForm` helper.

```tsx
const ProfileForm = createForm<{ name: string; email: string }>()
```

## Direct HTTP forms

`useHttp` shares the reactive form surface but sends JSON or multipart requests through the HTTP client configured by `createInertiaApp`. Its submit methods return response data without starting an Inertia visit:

```tsx
const form = useHttp<{ name: string }, { id: number }>({ name: '' })

const user = await form.post('/api/users', {
  onProgress: (progress) => console.log(progress.percentage),
})
```

HTTP 422 responses populate `form.errors`; other HTTP and network failures invoke their callbacks and reject. `form.cancel()` aborts the active request. Use `.optimistic(data => ({ ... }))` for a one-shot local patch that settles on success and rolls back on failure or cancellation. As with `useForm`, read state such as `form.processing` and `form.response` inside tracked JSX or computations.

## Development

```bash
pnpm install
pnpm check
```

The browser parity harness runs applicable shared behavior in CSR and SSR/hydration modes on Chromium and WebKit. Firefox is currently excluded because Playwright 1.58's bundled runner hangs before page creation; no Firefox compatibility claim is made. Focused commands are `pnpm test:browser:csr` and `pnpm test:browser:ssr`; harness details are documented in [`tests/browser/README.md`](tests/browser/README.md).

## Laravel playground

A Laravel integration app lives in [`playgrounds/laravel`](playgrounds/laravel). It links this adapter through the pnpm workspace and includes example pages and feature tests.

```bash
composer --working-dir=playgrounds/laravel run setup

# Run these in separate terminals:
php playgrounds/laravel/artisan serve
pnpm playground:dev
```

See the [playground README](playgrounds/laravel/README.md) for first-run setup and test commands.

## Status

Implemented:

- CSR and SSR bootstrap
- Automatic render/hydration and manual setup
- Stable read-only page facade
- Synchronously flushed page swaps
- `Link` visits and prefetch modes
- Descriptor-based `Head`
- `Deferred`
- `usePoll`
- `usePrefetch`
- `useRemember`
- Typed `useForm` visit lifecycle, remembrance, cancellation, optimistic updates, and Precognition
- Native `Form` with Precognition, stable form context and refs, and typed `createForm<T>()`
- Typed `useHttp` direct JSON and upload requests with cancellation and optimistic updates
- `WhenVisible` partial reloads with owner-bound observer and request cleanup
- Forward, reverse, manual, and history-aware `InfiniteScroll`
- Owner-safe persistent and named layouts
- Reactive `setLayoutProps` and `resetLayoutProps`
- Core/config/server exports

Release gates:

1. Unit, public-type, client build, SSR build, declaration, and SSR smoke verification
2. Applicable shared Playwright behavior in CSR and SSR across Chromium and WebKit
3. Laravel workspace-consumer build and feature tests

Solid ambient-head inspection and streaming async SSR remain outside the current adapter contract.

## License

MIT
