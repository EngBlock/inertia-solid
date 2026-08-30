# Solid browser parity harness

This is the first Solid application for the framework-neutral Inertia browser-test workflow. The same navigation specification runs against CSR and SSR; no Solid-specific semantic skip is used.

## Configuration

- Adapter selector: `PACKAGE=solid` (the default and currently the only adapter in this repository).
- CSR fixture server: `http://127.0.0.1:13721`.
- SSR fixture server: `http://127.0.0.1:13722`.
- Fixtures: `fixtures/pages/<Inertia component>.tsx`, resolved eagerly by both `app.tsx` and `ssr.tsx`.
- Client build: `vite build` to `dist/client`.
- SSR build: `vite build --ssr ssr.tsx` to `dist/server`.

The Node fixture server implements the same Inertia distinction used by the shared suite: ordinary requests receive the app document and requests with `X-Inertia` receive page JSON. SSR uses the package's `createInertiaApp` render path, then the browser hydrates the marked root.

## Focused commands

Run from the repository root after `pnpm install`:

```bash
pnpm test:browser       # CSR and SSR
pnpm test:browser:csr   # CSR only
pnpm test:browser:ssr   # SSR and hydration only
```

Each command builds the adapter and test application. The harness fails a test on browser console/page errors (including hydration mismatch diagnostics), failed requests or HTTP responses, and duplicate Inertia requests. CI installs Chromium and runs the full CSR/SSR command.
