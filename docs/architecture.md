# SolidJS 2 RC adapter for Inertia.js

**Research date:** 2026-08-30  
**Repository revision:** `ca14edecf73ece19aa9737f2681b046e09b39279`  
**Solid revision used for source citations:** [`d6a4a52`](https://github.com/solidjs/solid/commit/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed)

## Recommendation in one paragraph

Build an `@engblock/inertia-solid` adapter, initially as a prerelease, around a **per-app, owner-scoped read-only `Page` facade** backed by the exact current `@inertiajs/core` router snapshot. Keep Inertia—not Solid async computations, Solid Router `query`, or a second cache—as the owner of page data, visits, deferred props, prefetching, history, merge semantics, and page-level optimistic updates. Use Solid 2 where it accurately models adapter-local concerns: stores/signals for reactive adapter state, context for page/head/form scope, `flush()` at the router-to-renderer commit boundary, split effects or `onSettled()` for owner-bound setup and teardown (depending on whether setup may wait), keyed owners for page remounting, and optionally `action` plus optimistic stores for direct `useHttp` mutations. Preserve the familiar Inertia export names and behavior, but return Solid-native stable stores/accessors. Do **not** model an Inertia `Page` as `createMemo(async ...)`, `createResource`, `createAsync`, or a Solid Router query.

---

## 1. Scope, methodology, and fact/proposal boundary

### Scope

This note answers what a SolidJS 2.0 RC adapter should expose and how it should behave if it is expected to reach semantic parity with this repository's React and Vue 3 adapters. It covers:

- bootstrap, page swapping, context, layouts, SSR, hydration, and head management;
- links, forms, direct HTTP, optimistic behavior, deferred props, visibility, infinite scroll, polling, prefetch, and remembered state;
- package and test integration into this monorepo;
- where Solid 2's async model should—and should not—be used.

It does not propose changes to `@inertiajs/core`, an Inertia protocol revision, a Solid Router integration, or Solid server functions.

### Method

Only these source classes were used:

1. the local React/Vue adapter source, their test apps, shared Playwright tests, package manifests, and test configuration;
2. the official Solid 2 preview documentation at [v2.solidjs.com](https://v2.solidjs.com/);
3. the official Solid repository's 2.0 RFCs, pinned to the revision above;
4. the three requested official Solid async posts: [reads](https://www.solidjs.com/blog/async-solid-fetch-high-block-low), [writes](https://www.solidjs.com/blog/async-solid-write-sync-run-async), and [the network](https://www.solidjs.com/blog/async-solid-one-graph-two-machines);
5. official Solid release/package metadata.

No third-party articles or Q&A sources were used. Local paths and cited ranges were checked against the repository revision above. No pre-existing research/design-note directory was found, so this is the sole deliverable under `docs/research/`.

### Labels used below

- **Fact** describes current local behavior or an official Solid contract.
- **Proposal** is adapter design recommended by this note.
- **Risk** marks behavior that requires a prototype or RC-version verification.

---

## 2. Version caveat: Solid 2 is an RC, not stable

As of the research date, the official GitHub release line is at [`solid-js@2.0.0-rc.4`](https://github.com/solidjs/solid/releases/tag/solid-js%402.0.0-rc.4). The RC announcement says that the API is frozen but explicitly does **not** claim the implementation is bug-free ([official announcement, “Try It, Migrate to It”](https://www.solidjs.com/blog/solid-2-0-rc-the-big-reveal)). The v2 site calls itself preview documentation. Therefore:

- publish the adapter as `@engblock/inertia-solid@next`/prerelease until Solid 2 is stable;
- pin CI to an exact RC while developing, and run a separate allowed-to-fail job against the newest `next`;
- verify every integration-tier option (`transparent`, `ssrSource`, hydration identifiers, streaming/head callbacks) on each RC bump;
- avoid declaring compatibility with Solid 1.x. The async, lifecycle, package, context, and batching contracts are materially different.

### Status of relevant Solid APIs

| API/concept | Solid 2 status at this date | Adapter conclusion |
|---|---|---|
| `createSignal`, `createMemo`, `createStore`, context, `dynamic()`, `<Show>` | Public Solid 2 RC API ([official `dynamic`](https://v2.solidjs.com/reference/solid-web/components/dynamic)) | Appropriate foundation, but still prerelease. |
| `flush`, split `createEffect`, `onSettled`, owner changes | Public Solid 2 RC behavior; breaking from 1.x ([RFC 01](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/01-reactivity-batching-effects.md#L5-L14), [RFC 02](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/02-signals-derived-ownership.md#L17-L45)) | Essential at external router/lifecycle seams. |
| Async `createMemo`, `<Loading>`, `<Errored>`, `isPending`, `latest`, `refresh` | Public Solid 2 RC async model ([RFC 05](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/05-async-data.md#L5-L17)) | For user-created async values, not for already-resolved Inertia page snapshots. |
| `action`, `createOptimistic`, `createOptimisticStore`, `affects`, `until` | Public Solid 2 RC mutation model ([RFC 06](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/06-actions-optimistic.md#L5-L24)) | Useful selectively for direct HTTP/local optimistic state; do not double-wrap Inertia page optimism. |
| `createResource` | Removed from Solid 2; async computations replace it ([RFC 05 migration](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/05-async-data.md#L192-L205)) | Never use in the adapter. |
| `createAsync` | Not a Solid 2 core primitive, and absent from the v2 core async model. The v2 Solid Router docs consume `query` with `createMemo` ([official router data guide](https://v2.solidjs.com/routing/solid-router/data)) | Do not import it or make the adapter depend on a second Router data API. |
| `startTransition` / `useTransition` | Removed; Solid 2 coordinates async updates through the graph ([official migration guide](https://v2.solidjs.com/migration/from-solid-1#async-and-transitions)) | Do not wrap Inertia visits in a transition API. Keep explicit visit statuses. |
| `<Suspense>` / `<ErrorBoundary>` | Replaced by `<Loading>` / `<Errored>` ([official migration guide](https://v2.solidjs.com/migration/from-solid-1#control-flow-and-context)) | Use the Solid 2 names only for genuine graph readiness/errors. |
| `Context.Provider` | Replaced by the context component itself ([official migration guide](https://v2.solidjs.com/migration/from-solid-1#control-flow-and-context)) | Render `<PageContext value={runtime}>`, not `.Provider`. |
| Solid Router `query`/router `action` | Optional router cache/mutation layer ([official router data guide](https://v2.solidjs.com/routing/solid-router/data)) | Competes with Inertia's router/cache and is not an adapter dependency. |
| Reactive server components | Explicitly experimental in the RC announcement ([“What's Next”](https://www.solidjs.com/blog/solid-2-0-rc-the-big-reveal)) | Out of scope. |

---

## 3. Current React/Vue parity inventory

The adapters expose almost the same public surface (`packages/react/src/index.ts:4-31`, `packages/vue3/src/index.ts:4-21`). Their implementation styles differ, but the shared contract is clear.

### Bootstrap and page runtime

**Fact:** Both adapters:

- export `router`, `http`, `progress`, and an adapter-specific extended `config`;
- resolve default exports, decrypt history before first client render, support manual `setup` and automatic setup, configure progress, custom HTTP, nonce/defaults, layouts, title callbacks, server head, and Vite SSR render-function factories (`packages/react/src/createInertiaApp.ts:87-243`; `packages/vue3/src/createInertiaApp.ts:73-245`);
- maintain current component/page/key, call `router.init`, update flash independently, remount the page when `preserveState` is false, and retain it otherwise (`packages/react/src/App.ts:89-256`; `packages/vue3/src/app.ts:77-224`);
- normalize page/default layouts, support arrays/callbacks/props, reset dynamic layout props on non-preserving visits, and pass current page plus static/dynamic layout props (`packages/react/src/App.ts:165-242`; `packages/vue3/src/app.ts:142-236`);
- synchronize server-provided head on `navigate` and `clientVisit` events.

React explicitly uses `flushSync` when applying a router swap (`packages/react/src/App.ts:147-153`). That is an important renderer-boundary precedent for Solid 2's deferred-by-default writes.

### Public feature inventory

| Current export/feature | Current semantic contract and local evidence | Required Solid parity |
|---|---|---|
| `App`, `createInertiaApp` | CSR, SSR, auto/manual setup, component resolution, history decryption, progress, app wrapping; see bootstrap files above. | Same options and overload outcomes; Solid renderer functions instead of React/Vue apps. |
| `usePage` | Context-backed current `Page`; React throws outside `App` (`packages/react/src/usePage.ts:5-13`), Vue exposes a stable reactive facade (`packages/vue3/src/app.ts:253-284`). | Stable read-only page facade; missing-provider error. |
| `Link` | Visit options/events, URL-method pairs, GET query merging, non-GET button fallback, active loading marker, custom element/component, hover/click/mount prefetch, instant components (`packages/react/src/Link.ts:20-325`; `packages/vue3/src/link.ts:17-370`). | Same core behavior and DOM semantics; Solid `dynamic()` for reactive `as`. |
| `Head` | Client/SSR head provider, escaping, `head-key`/`data-inertia`, reactive updates, title callback, page/server-head reconciliation (`packages/react/src/Head.ts:5-126`; `packages/vue3/src/head.ts:4-162`; `tests/head.spec.ts`; `tests/server-head.spec.ts`). | Semantic parity is required; native-child JSX syntax needs a Solid-specific design (section 8). |
| `Deferred` | Uses nested lookup for definedness, exact key membership for rescued props, and renders default, rescue, or fallback; reports same-page preserving filtered partial-reload `reloading` (`packages/react/src/Deferred.ts:31-32,64-74`; `packages/vue3/src/deferred.ts:23-24,64-75`). | Keep as an Inertia metadata boundary, not a Solid `<Loading>` alias. |
| `Form`, `useFormContext` | Native form serialization including submitter, dirty/default/reset behavior, render/slot state, ref/context methods, lifecycle callbacks, cancellation, precognition, optimistic visits, cache invalidation, inert processing (`packages/react/src/Form.ts:39-344`; `packages/vue3/src/form.ts:24-440`). | Native `<form>` plus stable form store/context with equivalent callbacks/options. |
| `useForm` | Typed data/errors/status/defaults/reset/transform; visit verbs; cancellation; remember; precognition; one-shot page optimistic callback (`packages/react/src/useForm.ts:35-279`; `packages/vue3/src/useForm.ts:35-266`). | Same method set and visit ownership; Solid store/accessor return shape. |
| `useHttp` | Same form state plus `response`; direct HTTP verbs return promises; upload progress, abort, 422 mapping, precognition, remember, local optimistic patch and rollback (`packages/react/src/useHttp.ts:37-378`; `packages/vue3/src/useHttp.ts:36-335`). | Same transport/error contract; only feature for which Solid optimistic actions are a plausible internal fit. |
| `WhenVisible` | `IntersectionObserver`, buffer, `only`, one-shot/always, fallback, fetching state, observer cleanup (`packages/react/src/WhenVisible.ts:6-137`; `packages/vue3/src/whenVisible.ts:5-142`). | Same component and render-prop state. |
| `InfiniteScroll` | Delegates merge/request/history logic to core `useInfiniteScroll`; handles custom elements, previous/next/loading render props, reverse/manual/manual-after, preserve URL, auto-scroll, exposed fetch methods (`packages/react/src/InfiniteScroll.ts:57-353`; `packages/vue3/src/infiniteScroll.ts:12-306`). | Thin Solid DOM/owner wrapper around the same core primitive. |
| `usePoll` | Owner lifecycle around `router.poll`, start/stop, `polling`, auto-start/keep-alive (`packages/react/src/usePoll.ts:4-44`; `packages/vue3/src/usePoll.ts:4-46`). | Same; return `polling` accessor. |
| `usePrefetch` | Reads current-location cache/in-flight state; subscribes to prefetch events; exposes timestamps/status/flush (`packages/react/src/usePrefetch.ts:4-44`; `packages/vue3/src/usePrefetch.ts:4-51`). | Same core cache, not Solid Router query cache. |
| `useRemember` | Restore once, remember reactive updates, support form exclusions/custom serialization (`packages/react/src/useRemember.ts:4-27`; `packages/vue3/src/useRemember.ts:5-29`). | Signal/store forms; serialize snapshots in effect apply phase. |
| `setLayoutProps`, `resetLayoutProps` | Shared/named dynamic persistent-layout props (`packages/react/src/layoutProps.ts:3-19`; `packages/vue3/src/layoutProps.ts:3-27`). | Per-app store; no module-global SSR leakage. |
| `server` entry | Re-export `@inertiajs/core/server` (`packages/react/src/server.ts`; `packages/vue3/src/server.ts`). | Identical. |

Vue additionally exposes a plugin/global helpers and `createForm`; React has React-specific types and ref shapes. A Solid package does not need a plugin/global-property analogue. For parity, Solid's `createForm<T>()` should retain Vue's meaning—a typed `<Form>` component factory (`packages/vue3/src/form.ts:436-438`)—while `useForm` remains the state helper.

### Test parity inventory

**Fact:** `playwright.config.ts:4-31` selects an adapter package, and the same test directory is run against React, Vue, and Svelte. The repository currently has 56 `*.spec.ts` Playwright files. React and Vue test apps each have more than 400 test-app fixtures: 391 matching stems under `Pages/`, 402 under `Pages/` plus `Layouts/`, and 404 when `VitePages/` is included. The shared suite covers all features listed above, including dedicated files for deferred props, forms, head, server head, links, visibility, infinite scroll, polling, prefetch, remember, direct HTTP, optimistic behavior, layouts, SSR/hydration, and view transitions (the validated `tests/` tree). Framework-only cases are explicitly skipped by `PACKAGE`, e.g. Vue plugin tests, React strict mode, and Svelte-only behavior.

**Proposal:** Solid parity means running every framework-neutral shared test, not merely writing a small adapter unit suite. Solid should be added to the adapter/port matrices in `playwright.config.ts:14-29`; framework-specific skip expressions such as `tests/use-page.spec.ts:3-4` should include Solid where the contract applies.

---

## 4. Solid 2 semantics that should shape the adapter

### 4.1 Signals, stores, effects, and imperative commits

**Fact:** Solid 2 batches writes until a microtask. A setter does not immediately change accessor reads or DOM; `flush()` drains updates synchronously ([official `flush` reference](https://v2.solidjs.com/reference/solid-js/reactivity/flush), [RFC 01 lines 83-106](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/01-reactivity-batching-effects.md#L83-L106)). Effects have separate tracked compute and untracked side-effect phases ([official `createEffect`](https://v2.solidjs.com/reference/solid-js/reactivity/create-effect)). Top-level reactive reads in component/control-flow callback bodies warn unless intentionally scoped, and writes in owned compute scope are disallowed by default ([RFC 01 lines 18-81](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/01-reactivity-batching-effects.md#L18-L81)).

**Proposal:**

- Hold the exact current core `Page` snapshot in a signal and expose a stable read-only facade whose getters read that signal. This preserves every nested reference supplied by core while giving `usePage()` stable facade identity. Hold adapter-owned form graphs in deep stores.
- Hold component identity, remount tokens, booleans, element refs, and counters in signals.
- Apply `swapComponent` and flash updates with `flush(() => ...)` so the promise returned to Inertia core means adapter-owned synchronous page/layout work has committed. This mirrors React's existing `flushSync` seam and prevents scroll restoration/view-transition code from observing old synchronous DOM. It does not—and should not—wait for arbitrary user-owned async graph work to reveal.
- Put persistence/network/listener work in the apply half of split effects or in `onSettled`, not in store derivations.

### 4.2 Context and ownership

**Fact:** A default-less Solid 2 context returns `T` and throws when missing; the context itself is its provider component ([official context docs](https://v2.solidjs.com/reference/solid-js/components-context/create-context), [RFC 02 lines 47-91](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/02-signals-derived-ownership.md#L47-L91)). Nested `createRoot` calls are parent-owned by default, and deliberate globals require `runWithOwner(null, ...)` ([RFC 02 lines 17-45](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/02-signals-derived-ownership.md#L17-L45)). `onSettled` replaces `onMount`; it is one-shot, waits for all pending async reads under the current owner and the reactive flush, and may return owner-bound cleanup ([official `onSettled`](https://v2.solidjs.com/reference/solid-js/lifecycle-actions/on-settled)).

**Proposal:** All mutable adapter state belongs under one `App` owner. Avoid module-level page, component, layout-store, or head state. Each SSR call must construct and dispose a separate owner. Register observers, router event listeners, timers, and polling from owned scopes and return cleanup. Existing SSR tests cover sequential request isolation (`tests/ssr.spec.ts:125-175`); concurrent page/head/layout isolation is a new required test, not an existing guarantee.

### 4.3 Async reads, boundaries, and transitions

**Fact:** Solid 2 computations can return promises or async iterables. Consumers read normal accessors; unresolved reads flow to `<Loading>`, errors to `<Errored>`, and stale content normally remains visible during later revalidation (while `<Loading on={value}>` may deliberately show fallback again). `isPending` asks whether a changed answer is in flight; `latest` can inspect the in-flight value ([official async concept](https://v2.solidjs.com/concepts/async-reactivity), [RFC 05 lines 17-119](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/05-async-data.md#L17-L119)). The official reads post emphasizes that components execute once, passing an async prop is not itself a read, and request ordering follows data dependencies rather than component nesting ([“Fetch High, Block Low”](https://www.solidjs.com/blog/async-solid-fetch-high-block-low)).

Solid 2 replaces the Solid 1 names `<Suspense>` and `<ErrorBoundary>` with `<Loading>` and `<Errored>`; the new boundaries participate directly in graph readiness, stale-content transitions, healing, and SSR ([official boundaries guide](https://v2.solidjs.com/concepts/boundaries), [RFC 03 migration](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/03-control-flow.md#L284-L342)). The adapter should neither reintroduce the old names nor turn Inertia validation errors/network error-modal behavior into thrown Solid graph errors.

**Proposal:** Let page authors use this model *inside* their pages. Do not manufacture an async source for the Inertia page itself. By the time `swapComponent` runs, Inertia core has already resolved a component and produced the authoritative `Page` snapshot. Deferred props are represented by missing keys plus `page.deferredProps`/`rescuedProps`, not promises. Turning those into memo fetches would duplicate request ownership, cancellation, fallback, error, and cache semantics.

### 4.4 Actions and optimism

**Fact:** Solid `action` coordinates optimistic writes, yielded async work, and refreshes in one transition; optimistic signal/store overlays disappear when the transition settles or fails ([official `action`](https://v2.solidjs.com/reference/solid-js/lifecycle-actions/action), [RFC 06 lines 17-50](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/06-actions-optimistic.md#L17-L50)). The official writes post describes optimistic state as an overlay reconciled with confirmed truth rather than a copied cache with manual rollback ([“Write Sync, Run Async”](https://www.solidjs.com/blog/async-solid-write-sync-run-async)). A plain `refresh()` of the same question is deliberately quiet; process affordances should be explicit state, not inferred from `isPending` ([RFC 05 lines 68-107](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/05-async-data.md#L68-L107)).

**Proposal:**

- Keep `processing`, `progress`, `fetching`, `reloading`, `polling`, and `isPrefetching` as explicit adapter state. They describe Inertia operations, not arbitrary graph pending state.
- For `useForm`/`Form`, pass `.optimistic(...)` through to Inertia core exactly once. Core owns the page-prop prediction and rollback. Do **not** action-wrap `router.visit`, `<Form>`, or `useForm`: visits return `void`, core owns their callback/cancellation/concurrency lifetime, and an invented yielded promise would change ordering and delay immediate processing state.
- Prototype Solid `action` + `createOptimisticStore` internally only for `useHttp`, where the adapter itself owns direct HTTP and local form data, and only as a replacement for its explicit snapshot/rollback—not another overlay. Preserve AbortController, 422, callback, and returned-promise behavior. `flush()` is forbidden inside an action; after a plain `await`, a bare `yield` is required before later transactional writes ([official `action`](https://v2.solidjs.com/reference/solid-js/lifecycle-actions/action)). Fall back to explicit snapshots if these rules make parity less clear.
- Never apply a Solid optimistic overlay on top of Inertia's optimistic `Page`; double overlays can settle in different orders.

### 4.5 Cache/query

**Fact:** Solid Router's `query` is optional, forms keys from names and arguments, has request/browser-scoped cache rules, and is consumed in v2 via `createMemo` ([official data guide](https://v2.solidjs.com/routing/solid-router/data)). The official network post says core deliberately does not impose a proprietary cache and identifies router/query libraries as optional layers ([“One Graph, Two Machines”](https://www.solidjs.com/blog/async-solid-one-graph-two-machines)).

**Proposal:** The adapter must not depend on `@solidjs/router`, `query`, or its `action`. Inertia already has visit prefetch/cache tags, stale timestamps, invalidation, history reuse, and deduplication. `Link` and `usePrefetch` must call `router.prefetch`, `router.getCached`, `router.getPrefetching`, and `router.flush`, as current adapters do.

---

## 5. Concrete API mapping

Return-shape notation: `Accessor<T>` is `() => T`; “store” means a stable Solid proxy read directly in JSX.

| Inertia API/export | Proposed Solid shape | Solid 2 primitive/approach | Parity notes |
|---|---|---|---|
| `router`, `http`, `progress` | Direct re-exports | None | Exact parity. |
| `config` | `coreConfig.extend<SolidInertiaAppConfig>()` | None | Exact parity; Solid-specific renderer defaults only. |
| `createInertiaApp` | Same CSR/SSR/auto overload families; `setup({ el, App, props })`; optional `withApp(root, { ssr, page })` | `render`, `hydrate`, `renderToString`/awaited `renderToStream` from `@solidjs/web` | Resolve/decrypt/configure in the same order as React/Vue. |
| `App` | Component owning exact current snapshot, read-only page facade, page component, remount token, head manager, layout stack | snapshot signal, stable getters, default-less contexts, keyed `<Show>`, `dynamic()`, `flush` | Call `router.init` synchronously in browser before descendants execute. No module-global page state. |
| `usePage<T>()` | Stable read-only `Page<T & SharedPageProps>` facade | `useContext(PageContext)`; getters read the snapshot signal | Preserve Vue's stable facade property and React's outside-App error without cloning/reconciling core snapshots. |
| Page props passed to page component | Reactive getters backed by the exact current core snapshot | property getters or compiler-safe lazy spread | Preserve nested references supplied by core. Avoid eager destructuring. |
| `Link` | `<Link ...>` with Solid JSX event/ref types; `data-loading` reactive | signals, memos, a stable component from `dynamic()` | Same visit and prefetch modes, URL-method pairs, non-GET button warning/fallback, custom component support. |
| `Head` | `<Head title tags>` plus a collector-friendly `<HeadTag>` descriptor child API | Inertia `createHeadManager`; context + split effect | Preserve title callback, escaping, keys, server head, SSR arrays. Native `<meta>` children cannot be inspected reliably without a VDOM; see section 8. |
| `Deferred` | `<Deferred data fallback rescue>{({ reloading }) => ...}</Deferred>` | page-facade reads + local signal + owned router listeners | Not `<Loading>`; no synthetic promises. |
| `Form` | Native form component; child callback receives stable `FormComponentRef`-compatible store | `<form>`, store, form context, `onSettled` cleanup | Same serialization, submitter, dirty/default/reset, inert, callbacks, precognition, optimistic visit, context/ref. |
| `useFormContext` | Current form store or `undefined` outside Form, matching current public behavior | explicit-default context | Unlike page context, use an explicit `undefined` default because outside-form detection is part of tests. |
| `useForm` | Existing overloads and methods; stable form store | deep `createStore`; split effects; core `router.visit` | Methods read a synchronous canonical form snapshot; visit verbs remain fire-and-forget and are never action-wrapped. |
| `createForm<T>()` | Typed `<Form>` component factory, matching Vue | generic type wrapper around `Form` | Do not alias it to `useForm`. |
| `useHttp` | Existing overloads; stable store; promise-returning verbs | store, AbortController; optional core `action`/optimistic-store prototype | Direct HTTP only. Preserve local optimistic rollback and 422 behavior; no speculative `createHttp` API is needed for parity. |
| `usePoll` | `{ start, stop, polling: Accessor<boolean> }` | signal + `onSettled` cleanup | Core `router.poll` remains owner of timing/background throttling. |
| `usePrefetch` | `{ lastUpdatedAt, isPrefetching, isPrefetched, flush }`, first three accessors | signals + owned core event subscriptions | Core cache only; include fetched timestamp updates (React behavior). |
| `useRemember` | Signal tuple for arbitrary values; add `createRememberedStore` for object state | signal/store + `snapshot`/`deep` in split effect | Restore once; remember in effect apply phase. Forms may exclude fields. |
| `WhenVisible` | Same component/props; child callback receives `{ fetching: Accessor<boolean> }` or stable store field | signal, element ref, `IntersectionObserver`, `onSettled` cleanup | Preserve `always`, `buffer`, `only`, options, fallback, errors. |
| `InfiniteScroll` | Same props and render slots; imperative ref represented by callback/object | core `useInfiniteScroll`; signals/stores for UI; owned observer lifecycle | Preserve reverse/manual/manual-after/custom selectors/elements/URL/SSR slot state. |
| `setLayoutProps`/`resetLayoutProps` | Same overloads routed to the one active client runtime | client dispatcher into app-owned store; `flush` if immediate DOM is required | Unavailable during SSR; no request-global store; multiple active client roots unsupported. |
| `ResolvedComponent`, layout/config/types | Solid component and JSX types | `Component`, `JSX.Element`, `HTMLElement` types from Solid 2 packages | Preserve generic page props and layout callback typing. |
| `@engblock/inertia-solid/server` | Core server re-export | None | Exact parity. |

### Recommended consumer shape

```tsx
import { Deferred, Head, HeadTag, Link, usePage } from '@engblock/inertia-solid'

export default function Users() {
  const page = usePage<{ users?: User[] }>()

  return (
    <>
      <Head title="Users">
        <HeadTag tag="meta" name="description" content="User list" headKey="description" />
      </Head>

      <Link href="/users" prefetch="hover">Users</Link>

      <Deferred data="users" fallback={<UserSkeleton />}>
        {({ reloading }) => (
          <section class={{ reloading: reloading() }}>
            <For each={page.props.users}>{(user) => <UserRow user={user} />}</For>
          </section>
        )}
      </Deferred>
    </>
  )
}
```

This deliberately leaves user-owned async data alone:

```tsx
const recommendations = createMemo(() => fetchRecommendations(page.props.user.id))

<Loading fallback={<RecommendationsSkeleton />}>
  <Recommendations items={recommendations()} />
</Loading>
```

The first boundary is Inertia protocol state; the second is genuine Solid async graph state.

---

## 6. Runtime architecture and lifecycle sketch

### 6.1 Per-app runtime

**Proposal:** `App` constructs one runtime object under its owner:

```ts
interface SolidInertiaRuntime {
  currentPage: Accessor<Page> // exact core snapshot
  page: Page                  // stable read-only getter facade
  replacePage(next: Page): void
  component: Accessor<SolidComponent | undefined>
  remountToken: Accessor<object>
  headManager: HeadManager
  layoutProps: LayoutPropsStore
}
```

Provide this through default-less page/runtime/head contexts. Do not export the context or state as a module singleton. `usePage` returns `runtime.page`.

### 6.2 Client startup

1. Apply defaults, nonce, custom HTTP, and dev interceptors.
2. Read `initialPage`, resolve `initialComponent`, and decrypt history in parallel, matching the current adapters.
3. Create/hydrate the Solid root. Use `hydrate(() => <App ... />, el)` only when `data-server-rendered` is present; otherwise `render`.
4. During `App` setup—and before evaluating any page or layout child—initialize core router in the browser with the final stable `swapComponent` and `onFlash` callbacks. This preserves mount-time `router.reload()` behavior; neither initialization nor these callbacks may wait for `onSettled`.
5. Install `navigate`/`clientVisit` head synchronization before page descendants can initiate visits. Use a split effect whose apply phase subscribes and returns both removers; unlike `onSettled`, this does not wait for every user-owned async read under `App` to settle.
6. Start progress after the root exists.

### 6.3 Page swap

Pseudocode:

```ts
swapComponent: async ({ component, page, preserveState, initialRender }) => {
  if (initialRender) return

  flush(() => {
    if (!preserveState) {
      resetLayoutProps()
      setRemountToken({})
    }

    setComponent(() => component)
    replacePage(page) // signal now holds this exact core snapshot
  })
}
```

`replacePage` replaces the snapshot signal with the exact object supplied by core. The stable facade's property getters then read from that signal. It does not deep-clone or reconcile page data, so it preserves nested identities, additions, and deletions exactly as core produced them.

Flash-only updates use the same store and a synchronous flush when called from core. Router callbacks are imperative boundaries, so they are the correct place for writes; no `ownedWrite` escape hatch should be necessary.

### 6.4 Page owner and persistent layouts

The page subtree is keyed by `remountToken`, not by URL. Therefore:

- `preserveState: true` retains the page owner when component identity is unchanged and only updates reactive props;
- `preserveState: false` changes the token and disposes/remounts the page owner, even if the component type is the same;
- changing component type replaces the page owner naturally.

Persistent layouts need a `LayoutStack` that normalizes `Component.layout` and default layouts through core `normalizeLayouts`. It should key each layout owner by depth plus component identity, preserving the common prefix and disposing only the changed suffix, while replacing the page outlet independently. A descriptor's `name` only selects named dynamic props; it is not layout identity. Layout props must remain reactive and include current page props, static descriptor props, shared dynamic props, and named dynamic props in the same precedence as React/Vue.

**Risk/prototype gate:** Solid components execute once; recreating a JSX expression is not equivalent to React/Vue VNode reconciliation. Before implementation, prove with a small owner-disposal counter that:

- page A → page B under the same layout preserves layout-local signals;
- non-preserving same-component visits remount only the page;
- changing one nested layout disposes only the changed suffix;
- callback/object/array/default layouts and SSR hydrate to the same owner topology.

Implement the stack as explicit keyed nested owners: one owner per depth/component identity, preserving the common prefix and disposing the changed suffix. Use `dynamic()` only to render the selected component within that owner; do not rely on re-running layout component functions to provide reconciliation.

### 6.5 Disposal

Every observer/listener/timer belongs to its component owner:

- a split effect with cleanup for non-DOM router listeners that must exist before descendants can initiate work;
- `onSettled(() => { setup; return cleanup })` for DOM-dependent observers, pollers, and native form listeners that may safely wait for the first stable render;
- split `createEffect(compute, apply)` for reactive external synchronization such as remember;
- core cancel/destroy methods on disposal where current adapters do so;
- cleanup stays in an owned split-effect or `onSettled` callback rather than in a ref callback; refs only capture/update the element needed by that owned lifecycle.

---

## 7. Feature-specific design

### Links and prefetch

`Link` should remain a thin Solid DOM wrapper over core behavior:

- resolve URL-method pairs and instant component metadata;
- merge GET data into query strings;
- default `preserveState` for non-GET;
- choose `<button type="button">` for non-GET when `as="a"`;
- call `shouldIntercept`/`shouldNavigate` before `router.visit`;
- preserve every visit callback, view transition, partial-data option, headers, and `data-loading` counter;
- use core hover delay/cache duration/config and core mount/hover/click prefetch.

Do not express prefetch as an async memo. Prefetch may never be consumed by the current owner, is keyed by Inertia visit options, and must share Inertia's cache with later navigation.

### Deferred props

`Deferred` checks definedness with nested `get`, but checks rescued props by exact key-string membership, matching current adapters. Its listener pair tracks only same-location preserving partial reloads requesting those keys. It renders:

1. children when all requested paths are defined and none of their exact key strings is rescued;
2. rescue when an exact requested key is rescued and rescue exists;
3. fallback otherwise.

A later full-page snapshot may make a key absent again and return the component to fallback; `reloading` is narrower and only describes the filtered partial-reload case above. Nested-path rescue behavior is not currently established by a shared test.

It should expose `reloading` as an accessor/stable store field. It must not throw `NotReadyError`, manufacture promises, or use `<Loading>`: Inertia controls the request and can rescue errors as data, while Solid `<Errored>` handles thrown graph errors. The shared deferred-prop cancellation, rapid-navigation, back-button, partial-reload, rescue, and query-parameter tests are acceptance tests, not optional examples.

### Visibility and infinite scroll

`WhenVisible` and `InfiniteScroll` are imperative browser integrations. Use assigned element refs plus `onSettled` for observer setup and owner cleanup. Keep refs themselves in ordinary variables where possible; use signals only when changing a ref must rerun setup. All callbacks into core should read current options lazily, avoiding stale closure snapshots.

`InfiniteScroll` should delegate all page-number, merge, URL, preserve-error, and element calculations to `@inertiajs/core`'s `useInfiniteScroll`, as current adapters do. Adapter code should only:

- resolve custom selector/element/ref inputs;
- establish/dispose observers and core manager;
- expose loading/has-more/fetch actions;
- render start/items/end in reverse or normal order;
- handle manual thresholds and initial reverse auto-scroll;
- render deterministic SSR slot state from `page.scrollProps` without touching browser globals.

### Polling

Wrap `router.poll`; do not schedule a second interval. Return `start`, `stop`, and a `polling` accessor. `destroy` runs on owner disposal. Because a polling reload asks the same question, Solid 2's `isPending` can intentionally remain false; explicit `polling` and visit callbacks are the correct UI contract.

### Remember

Offer a parity `useRemember` signal tuple and a Solid-friendly object-store helper. Restore synchronously before first render. For object state:

```ts
createEffect(
  () => deep(state),
  (plain) => router.remember(filterExcluded(plain), key),
)
```

`deep` is appropriate when every nested edit should persist; `snapshot` is appropriate for an untracked one-off serialization. Solid documents both distinctions in the store RFC ([lines 184-213](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/04-stores.md#L184-L213)). Do not call `router.remember` from a memo/derived store compute.

### Forms

#### `useForm` and typed `createForm<T>()`

Use a deep store for `data`, `errors`, and status fields, with stable method references. `createForm<T>()` is only the typed component factory; it is not a second state helper. Port the shared form-state logic rather than independently redesigning validation/default/reset semantics. Preserve:

- all overloads, including Wayfinder/URL-method pair and remember key;
- typed nested keys/values/errors;
- transforms, defaults, reset, clear/reset errors;
- progress and success timers;
- cancellation and unmount race protection;
- Precognition's touched/validating/error modes;
- `dontRemember` exclusions;
- `.optimistic(callback)` as a one-shot option delegated to core.

Solid's strict top-level-read rule means docs/examples should avoid destructuring reactive store properties in the component or render-prop callback body. `form.processing` is safe when read in JSX; `const { processing } = form` at component top level is not reactive and should warn.

Queued writes must not change current form callback semantics. Keep a synchronous canonical plain-data snapshot that every `setData`/`reset` updates immediately and every submit transforms/serializes; project it into the reactive store. Lifecycle wrappers update status/progress and use targeted `flush()` before calling user `onStart`, `onProgress`, or `onFinish`, so callbacks observe the new state just as they do in current adapters (`packages/react/src/useForm.ts:168-217`; `packages/vue3/src/useForm.ts:187-226`; `tests/form-helper.spec.ts:742-751,966-1005`). None of this code runs inside a Solid `action`.

#### `<Form>`

Render a real form and use browser `FormData(form, submitter)`, retaining submitter overrides and `_blank` GET behavior. Use native `input`/`change`/`reset` listeners established in `onSettled`, returning cleanup and optional cancellation. Provide a stable context object and render-prop value. The `inert` attribute follows processing when requested.

#### Direct `useHttp`

This is distinct from an Inertia visit and should remain so. It uses the configured `http` client, AbortController, FormData conversion/upload progress, status/response handling, 422 validation mapping, and returned promises. A prototype may implement one submission as a Solid core `action` and local data as an optimistic store:

1. apply the optimistic local patch;
2. yield the HTTP promise;
3. commit defaults/response or throw;
4. let the overlay fall away on settle/failure.

However, compatibility wins over cleverness. If cancellation or handled 422 responses do not map cleanly to action failure/settlement, retain explicit snapshots and rollback exactly as current adapters do (`packages/react/src/useHttp.ts:176-308`). Either implementation must keep explicit `processing` and upload progress.

### Page-level optimistic visits

The core visit option is authoritative. The adapter should only pass the callback and render the optimistic `Page` snapshots delivered by core. Solid `createOptimisticStore` must not wrap the page snapshot signal or facade. Acceptance includes optimistic success, rollback, concurrent visits, forms, and flash/infinite-scroll interactions (`tests/optimistic.spec.ts`, `tests/optimistic-rollback.spec.ts`, and optimistic test-app fixtures).

---

## 8. SSR, hydration, head, and layout decisions

### Renderer choice

Solid 2 moves web rendering to `@solidjs/web`. `renderToString` is synchronous and emits `<Loading>` fallbacks for unresolved async reads; an awaited `renderToStream` returns fully settled HTML ([official `renderToString`](https://v2.solidjs.com/reference/solid-web/rendering-ssr/render-to-string), [official `renderToStream`](https://v2.solidjs.com/reference/solid-web/rendering-ssr/render-to-stream)).

**Proposal:**

- Preserve the current Inertia SSR contract `{ head: string[], body: string }` and Vite render-function factory (`packages/core/src/types.ts:629`).
- Default automatic SSR to `await renderToStream(() => <App ... />)` so user-created Solid async values can settle without losing the existing full-string response contract. Supply `onError`, retain the first render error, discard any partial HTML, and reject the Inertia render after collection; awaiting the stream itself may resolve with partial output rather than reject ([official `renderToStream`](https://v2.solidjs.com/reference/solid-web/rendering-ssr/render-to-stream)).
- Also support a supplied renderer, with `renderToString` as the simple synchronous option.
- Pair server output with `hydrate` and a deterministic `renderId`; pass nonce/render options needed by hydration scripts.
- Keep Inertia's embedded `data-page` script/body construction through `buildSSRBody`.

Streaming directly to the HTTP response would require an `@inertiajs/core` SSR response-contract change and is a later, separate project. Awaiting the stream gives async correctness, not streaming TTFB.

### Hydration policy

The Inertia page snapshot/facade is synchronous serialized input and should not use `ssrSource`: both server and client receive the same `initialPage`. User-created async computations may use Solid's default server-authoritative hydration, hybrid/client sources, or `deferStream` as documented ([RFC 05 lines 157-190](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/05-async-data.md#L157-L190)). The adapter must not branch owner creation between server and client in ways that shift hydration IDs.

### Head management

This is the largest API-shape tension.

**Facts:** React/Vue can inspect framework VNodes and serialize arbitrary native head children into strings for Inertia's head manager. Solid has no retained VDOM; native `<meta>`/`<title>` JSX becomes renderer output, not a portable object tree for the adapter to inspect. Solid 2 has its own ambient owner-scoped head registry through `useHead`, with SSR/hydration support ([official `useHead`](https://v2.solidjs.com/reference/solid-web/head/use-head), [official head guide](https://v2.solidjs.com/building-apps/head-and-metadata)). Inertia additionally requires `title(page)`, `head-key`/`data-inertia`, raw server-head reconciliation, and page head overriding server head, all covered by shared tests.

**Recommendation:** For phase 1, keep Inertia's `createHeadManager` and use serializable descriptors:

```ts
type InertiaHeadTag = {
  tag: string
  headKey?: string
  attrs?: Record<string, unknown>
  children?: string
  innerHTML?: string
}
```

Create one manager per runtime and preserve its initial commit. Each `<Head title tags={...}>` creates one manager provider, registers a reactive descriptor group, and disconnects on owner disposal; `<HeadTag>` is collector sugar that registers one descriptor under the nearest `Head`. Server-head elements collect first, followed by keyed page-provider overrides, matching core precedence. The adapter owns unary tags, `data-inertia`, title callback, provider precedence, and server-head strings exactly as current adapters do. It escapes generated titles and attribute values. A descriptor's explicitly named `innerHTML` remains a raw/unsafe escape hatch, matching current adapters' raw child/`dangerouslySetInnerHTML` capability rather than promising universal escaping. SSR updates the manager synchronously during render; client updates happen in a split effect and disconnect on owner disposal.

Do **not** silently render native `<meta>` children into the body, and do not claim native-child parity until a prototype proves a compiler-free, SSR-safe collector. Document the syntax difference as a Solid-specific surface with semantic parity.

Baseline SSR must also capture Solid's ambient head output via the renderer's `onHead` option; otherwise application-owned `useHead`/`@solidjs/meta` tags and renderer assets can be dropped when Inertia owns the outer document. Return the Inertia-manager array first and the captured Solid head segment after it. Keep the registries independently owned on hydration and do not silently cross-deduplicate them. Mixing the same identity—especially `<title>`—across both systems is a documented error in phase 1 and should produce a development warning until an explicit cross-registry precedence/parser exists. Test ordering, title collisions, nonce/assets, disposal, and hydration in phase 0.

### Persistent layouts and SSR isolation

SSR creates layout and dynamic-layout stores per request. It must never mutate module-global layout state. To retain the argument-less parity exports, `createInertiaApp` may register one active **client** runtime dispatcher that `setLayoutProps`/`resetLayoutProps` call from unowned event handlers; it holds no store itself, is unavailable during SSR, and is cleared on root disposal. Internal App resets call the bound runtime action directly. This preserves the repository's one-active-client-root assumption while preventing request leakage; multiple client roots remain unsupported and documented. Initial server and client normalization must produce identical descriptor order, keys, and wrapper topology. Existing SSR tests establish sequential/static layout isolation, not concurrent dynamic-layout mutation. Acceptance therefore includes those tests plus new concurrent SSR tests using different page/head/layout values and navigation tests for persistent layout local state.

---

## 9. Package and test plan

### Package layout

Create, in implementation work (not in this research change):

```text
packages/solid/
  package.json
  build.js
  tsconfig.json
  src/
    App.tsx
    createInertiaApp.tsx
    Deferred.tsx
    Form.tsx
    Head.tsx
    InfiniteScroll.tsx
    Link.tsx
    WhenVisible.tsx
    contexts.ts
    layoutProps.ts
    useForm.ts
    useFormState.ts
    useHttp.ts
    usePage.ts
    usePoll.ts
    usePrefetch.ts
    useRemember.ts
    index.ts
    server.ts
  test-app/
```

Use the same ESM exports, `./server` subpath, `dist`/`types` layout, ES2022 check, and workspace dependencies as React/Vue (`packages/react/package.json`; `packages/vue3/package.json`). Proposed peers:

- `solid-js` matching the supported 2.0 RC/stable range;
- `@solidjs/web` matching that exact line.

Development dependencies should pin exact RC versions plus the official Vite/compiler plugin. Configure TypeScript JSX for the Solid 2 renderer package; the official migration guide moved JSX types and web runtime imports to renderer packages ([package/import section](https://v2.solidjs.com/migration/from-solid-1#imports-where-things-live-now)). Do not depend on `@solidjs/router` or `@solidjs/meta` for the baseline adapter.

### Test app and shared suite

1. Add a Solid test app using the same server routes and relative fixture names as React/Vue.
2. Add `solid` to Playwright's adapter union, validation list, CSR/SSR/SSR-auto ports, build commands, and root scripts.
3. Port the 404 common React/Vue fixture paths first; then add Solid fixtures for tests currently expressed only in one framework where the semantic contract applies.
4. Run all applicable shared specs in Chromium, WebKit, and Firefox; run `SSR=true` separately.
5. Add Solid-focused tests for:
   - outside-provider `usePage` failure, stable facade identity, and exact nested snapshot-reference preservation;
   - microtask behavior: router swap is committed before `swapComponent` resolves;
   - owner disposal/listener counts after repeated navigation;
   - same-layout persistence and changed-layout suffix disposal;
   - same-component preserve/remount semantics;
   - no strict top-level-read/write warnings in adapter internals;
   - head descriptor attribute/title escaping, explicit raw `innerHTML`, order, key override, reactive updates, ambient `onHead` capture, cross-registry collision warnings, SSR, hydration, and server-head collision;
   - user-created async memo under `<Loading>` in an Inertia SSR page;
   - direct HTTP optimistic action success/failure/cancel/422 if the action prototype is retained;
   - concurrent SSR requests with different page/head/layout props.
6. Add build/type tests for generic page props, layout callbacks, Wayfinder, form paths, render props, refs, and setup overloads.

---

## 10. Design tensions and risks

| Tension/risk | Why it matters | Decision/mitigation |
|---|---|---|
| **Inertia snapshots vs Solid async graph** | Treating page props as fetch resources duplicates ownership and misstates deferred/error/cache behavior. | Keep page synchronous; reserve async memos/Loading for user data. |
| **Two routers/caches** | Solid Router query and Inertia prefetch/history caches have different keys, lifetime, invalidation, and mutation loops. | No Solid Router dependency; expose Inertia core only. |
| **Two optimistic transaction systems** | Inertia page optimism and Solid overlays could commit/revert in different orders. | Core owns page optimism; Solid actions only considered for adapter-owned direct HTTP/local state. |
| **Solid microtask commits vs imperative router expectations** | Core scroll/view-transition code may run before DOM updates. | `flush()` inside swap/flash/layout imperative boundaries; test before-resolution DOM. |
| **Components execute once** | Porting React/Vue render functions mechanically can freeze props or lose persistent owners. | Stable stores/getters, keyed page owner, explicit layout-stack prototype. |
| **Strict reads/writes** | Destructuring or setter calls in component/derive scope can warn or throw. | Read in JSX/memos, write in handlers/effect apply/onSettled; no blanket `ownedWrite`. |
| **Head has no VDOM to inspect** | Existing `<Head><meta /></Head>` serialization cannot be copied directly. | Descriptor-based Inertia Head/HeadTag plus mandatory ambient `onHead` capture in phase 1; test both registries explicitly. |
| **Awaited stream is not streamed response** | Async SSR correctness can be achieved, but TTFB streaming does not fit current Inertia SSR return shape. | Await `renderToStream` for now; scope streaming transport separately. |
| **RC churn/integration-tier options** | API is frozen, but renderer/hydration bugs and package boundaries may still change. | Prerelease adapter, exact pins, next-version CI, upgrade checklist. |
| **Snapshot/facade identity** | A deep store replica may invent/preserve identities differently from core and mishandle deletion of optional protocol fields. | Store the exact snapshot in a signal; expose stable read-only getters; use deep stores only for adapter-owned form state. |
| **Global router singleton and multiple roots** | Core router is singleton-like; two client apps could overwrite callbacks. | Match current one-app assumption, but make adapter state per root and document single active client root. SSR remains isolated. |
| **Head system coexistence** | Inertia manager and Solid ambient head registry have different identity rules. | Baseline captures both as separately owned segments, warns on cross-registry identity collisions, and performs no silent cross-deduplication. |
| **Explicit status vs `isPending`** | Inertia operation statuses include same-question reloads, uploads, cancellation, and prefetches that Solid intentionally may not mark pending. | Keep explicit status accessors. |

---

## 11. Phased implementation recommendation

### Phase 0 — compatibility spikes

Before creating the full test app, prove four high-risk seams against the exact Solid RC:

1. keyed page remount plus persistent nested layout owner preservation;
2. `flush()` swap timing relative to DOM, scroll, and view transitions;
3. descriptor-based head SSR/hydration/server-head override plus ambient `onHead` capture and collision policy;
4. awaited `renderToStream` output passed through `buildSSRBody` and hydrated without mismatch.

**Exit criterion:** tiny tests demonstrate deterministic owner disposal and hydration with no Solid diagnostics.

### Phase 1 — runtime spine and navigation

Implement package/build/types, `createInertiaApp`, `App`, snapshot signal/read-only page facade, layouts, both head-registry paths, `Link`, config/re-exports, layout props, and server entry. Port navigation, page, link, head, layout, initial visit, history, scroll, events, and SSR fixtures.

**Exit criterion:** all applicable non-form/non-lazy shared tests pass in Chromium; SSR page/head/layout tests pass.

### Phase 2 — forms and direct HTTP

Port shared form-state logic, `useForm`/`createForm`, `<Form>`, context, remember, Precognition, and `useHttp`. Spike Solid actions only for direct HTTP and retain them only if behavior is simpler and all compatibility tests pass.

**Exit criterion:** all form component/helper/context, HTTP, Precognition, optimistic, rollback, race/unmount, upload, and TypeScript cases pass.

### Phase 3 — lazy and long-lived behaviors

Implement `Deferred`, `WhenVisible`, `InfiniteScroll`, polling, and prefetch. Audit every observer/listener/timer for owner cleanup.

**Exit criterion:** corresponding shared suites pass, including rapid navigation, back/forward, reverse/manual infinite scroll, cache tags, and unmount races.

### Phase 4 — browser matrix and release hardening

Run all shared CSR tests across three browsers and all SSR tests; add CI, docs/resources, ES2022 check, package exports, and RC compatibility automation.

**Exit criterion:** no unexplained adapter-specific skips; no hydration errors, Solid strict diagnostics, leaked listeners, duplicate head tags, duplicate initial fetches, or cross-request state.

---

## 12. Acceptance criteria

The adapter is release-candidate ready when all of the following are true:

1. **Public parity:** every common React/Vue export has a Solid equivalent listed in section 5; intentional syntax/return-shape differences are documented and typed.
2. **Navigation correctness:** component resolution, initial render, flash, partial/except reloads, preserve state/scroll/URL, history encryption/restoration, view transitions, and client-side visits match core behavior.
3. **Commit timing:** `swapComponent` does not resolve until Solid has committed adapter-owned synchronous page/layout work needed by subsequent core operations; it does not await arbitrary user-owned async reveals.
4. **Page ownership:** `usePage()` returns one stable read-only reactive facade per app backed by the exact current core snapshot; core owns all snapshots and caches; the adapter performs no duplicate page fetch or deep reconciliation.
5. **Layouts:** persistent layout state survives appropriate navigation; page state remounts exactly when requested; dynamic layout props reset correctly; SSR requests do not leak.
6. **Head:** title callback receives the current page; generated titles and attributes escape safely while explicit `innerHTML` remains raw; keyed overrides, ambient `onHead` capture, collision warnings, server head, reactive updates, navigation cleanup, SSR, and hydration pass semantic equivalents of shared tests.
7. **Forms/HTTP:** all state, callback, cancellation, validation, optimistic, reset/default, remember, upload, race, and direct-response semantics pass shared tests.
8. **Lazy features:** deferred/rescue, visibility, infinite scroll, poll, and prefetch all use Inertia core ownership and clean up on disposal.
9. **Solid alignment:** adapter code produces no strict-read/write diagnostics; uses owner-bound cleanup; uses `flush` only at justified imperative seams; does not import `createResource`, `createAsync`, or Solid Router query/action.
10. **SSR/hydration:** synchronous pages and user-created Solid async pages render and hydrate without mismatch; head/layout/page data are request-local; the body preserves Inertia's embedded page script contract.
11. **Quality gates:** package build/type generation and ES2022 check pass; all applicable shared Playwright specs pass in Chromium/WebKit/Firefox and SSR mode; Solid-specific owner/diagnostic tests pass.
12. **Version honesty:** package and README identify the exact supported Solid 2 RC/stable range and the adapter remains prerelease until Solid 2 stable has passed the same matrix.

---

## 13. Primary-source bibliography

### Official Solid 2 documentation and releases

- [Solid 2 preview documentation](https://v2.solidjs.com/)
- [Solid 2.0 RC announcement](https://www.solidjs.com/blog/solid-2-0-rc-the-big-reveal)
- [`solid-js@2.0.0-rc.4` official release](https://github.com/solidjs/solid/releases/tag/solid-js%402.0.0-rc.4)
- [Async reactivity](https://v2.solidjs.com/concepts/async-reactivity)
- [Stores](https://v2.solidjs.com/concepts/stores)
- [Boundaries](https://v2.solidjs.com/concepts/boundaries)
- [Rendering and SSR](https://v2.solidjs.com/concepts/rendering-and-ssr)
- [`createContext`](https://v2.solidjs.com/reference/solid-js/components-context/create-context), [`useContext`](https://v2.solidjs.com/reference/solid-js/components-context/use-context), and [`dynamic`](https://v2.solidjs.com/reference/solid-web/components/dynamic)
- [`flush`](https://v2.solidjs.com/reference/solid-js/reactivity/flush), [`createEffect`](https://v2.solidjs.com/reference/solid-js/reactivity/create-effect), [`onSettled`](https://v2.solidjs.com/reference/solid-js/lifecycle-actions/on-settled), and [`onCleanup`](https://v2.solidjs.com/reference/solid-js/advanced/specialized-reactivity/on-cleanup)
- [`Loading`](https://v2.solidjs.com/reference/solid-js/components-jsx/loading), [`Errored`](https://v2.solidjs.com/reference/solid-js/components-jsx/errored), [`isPending`](https://v2.solidjs.com/reference/solid-js/reactivity/is-pending), and [`latest`](https://v2.solidjs.com/reference/solid-js/reactivity/latest)
- [`action`](https://v2.solidjs.com/reference/solid-js/lifecycle-actions/action), [`refresh`](https://v2.solidjs.com/reference/solid-js/lifecycle-actions/refresh), [`createOptimistic`](https://v2.solidjs.com/reference/solid-js/reactivity/create-optimistic), and [`createOptimisticStore`](https://v2.solidjs.com/reference/solid-js/stores/create-optimistic-store)
- [`hydrate`](https://v2.solidjs.com/reference/solid-web/rendering-ssr/hydrate), [`renderToString`](https://v2.solidjs.com/reference/solid-web/rendering-ssr/render-to-string), and [`renderToStream`](https://v2.solidjs.com/reference/solid-web/rendering-ssr/render-to-stream)
- [Head and metadata](https://v2.solidjs.com/building-apps/head-and-metadata) and [`useHead`](https://v2.solidjs.com/reference/solid-web/head/use-head)
- [Solid Router data loading and mutations](https://v2.solidjs.com/routing/solid-router/data)
- [Solid 1 → 2 migration guide](https://v2.solidjs.com/migration/from-solid-1)

### Official Solid async series

- Ryan Carniato, [“Async Solid — Fetch High, Block Low”](https://www.solidjs.com/blog/async-solid-fetch-high-block-low)
- Ryan Carniato, [“Async Solid — Write Sync, Run Async”](https://www.solidjs.com/blog/async-solid-write-sync-run-async)
- Ryan Carniato, [“Async Solid — One Graph, Two Machines”](https://www.solidjs.com/blog/async-solid-one-graph-two-machines)

### Official Solid source/RFCs, pinned

- [Solid 2 RFC index](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/README.md)
- [RFC 01: reactivity, batching, and effects](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/01-reactivity-batching-effects.md)
- [RFC 02: signals, derived primitives, ownership, and context](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/02-signals-derived-ownership.md)
- [RFC 03: control flow](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/03-control-flow.md)
- [RFC 04: stores](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/04-stores.md)
- [RFC 05: async data](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/05-async-data.md)
- [RFC 06: actions and optimistic updates](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/06-actions-optimistic.md)
- [RFC 12: SSR and HTTP](https://github.com/solidjs/solid/blob/d6a4a52ffc203abfa6c25f4960b0c53bb8cbdfed/documentation/solid-2.0/12-ssr-http.md)

### Local primary sources

- `packages/react/src/`, `packages/vue3/src/`
- `packages/react/test-app/`, `packages/vue3/test-app/`
- `tests/` (shared `*.spec.ts` suite and `tests/support.ts`)
- `playwright.config.ts`
- `packages/react/package.json`, `packages/vue3/package.json`, root `package.json`, and `pnpm-workspace.yaml`
