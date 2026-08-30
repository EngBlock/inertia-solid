# Solid browser parity harness

This Solid application exercises the applicable framework-neutral Inertia behavior for the adapter. Every specification runs in CSR and SSR/hydration modes on Chromium and WebKit unless an assertion is intrinsically mode-specific. Mode-only gates state their reason inline; there are no Solid-specific semantic skips.

Firefox is intentionally outside the current corpus: Playwright 1.58's bundled Firefox hangs before page creation on the supported development environment. The suite makes no Firefox compatibility claim until that upstream runner is usable.

## Configuration

- Adapter selector: `PACKAGE=solid` (the default and currently the only adapter in this repository).
- CSR fixture server: `http://127.0.0.1:13721`.
- SSR fixture server: `http://127.0.0.1:13722`.
- Fixtures: `fixtures/pages/<Inertia component>.tsx`, resolved eagerly by both `app.tsx` and `ssr.tsx`.
- Client build: `vite build` to `dist/client`.
- SSR build: `vite build --ssr ssr.tsx` to `dist/server`.
- Projects: `solid-{chromium,webkit}-{csr,ssr}`.

The Node fixture server implements the same Inertia distinction used by the shared suite: ordinary requests receive the app document and requests with `X-Inertia` receive page JSON. SSR uses the package's `createInertiaApp` render path, then the browser hydrates the marked root.

The suite covers navigation plus the shared form helper, native form, context, Precognition, direct HTTP, visibility, infinite-scroll, and layout-props contracts. Its page fixture fails tests on browser console/page errors, hydration diagnostics, failed requests or responses, and duplicate Inertia requests.

## Commands

Run from the repository root after `pnpm install`:

```bash
pnpm test:browser       # all four browser/mode projects
pnpm test:browser:csr   # Chromium and WebKit CSR
pnpm test:browser:ssr   # Chromium and WebKit SSR/hydration
```

For a focused project, run Playwright directly, for example:

```bash
pnpm --dir tests/browser exec playwright test --project=solid-chromium-ssr layout-props.spec.ts
```
