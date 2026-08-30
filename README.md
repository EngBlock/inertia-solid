# Inertia Solid

A community SolidJS 2 adapter for [Inertia.js](https://inertiajs.com/).

> [!WARNING]
> This package is an early alpha. The runtime spine, links, head descriptors, deferred props, polling, prefetch state, and remembered signals are present. Forms, direct HTTP helpers, visibility, infinite scroll, and fully persistent layout owners are still being implemented. Do not use this release in production yet.

## Design

Inertia owns remote page state: visits, history, deferred requests, prefetching, page merging, and page-level optimism. Solid owns the reactive projection, component lifetime, local state, and user-created async computations.

The adapter intentionally does not depend on Solid Router or create a second query cache. An Inertia page snapshot is synchronous; native Solid async belongs inside page components.

See [docs/architecture.md](docs/architecture.md) for the complete exploration and parity plan.

## Install

```bash
pnpm add @engblock/inertia-solid @inertiajs/core solid-js @solidjs/web
```

Solid 2 is currently an RC, so applications should use compatible `solid-js` and `@solidjs/web` versions.

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
      <Link href="/users" prefetch="hover">Users</Link>
      <For each={page.props.users}>{(user) => <p>{user.name}</p>}</For>
    </main>
  )
}
```

`usePage()` returns a stable read-only reactive facade. Read its properties in JSX or a memo; avoid destructuring reactive values at component top level.

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

## Development

```bash
pnpm install
pnpm check
```

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
- Core/config/server exports

Next priorities:

1. Persistent layout owner compatibility spike
2. `useForm`, `<Form>`, and Precognition
3. `useHttp`
4. `WhenVisible` and `InfiniteScroll`
5. Full Inertia shared Playwright suite and browser matrix
6. Solid ambient-head and async SSR integration

## License

MIT
