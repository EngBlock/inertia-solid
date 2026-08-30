# Bug lessons

## 2026-08-30 — Form Precognition initialization halted reactivity

- **Affected area:** `src/Form.tsx`, `src/useForm.ts`
- **Symptom signature:** Rendering a Precognition-enabled `<Form>` halted with `Maximum call stack size exceeded` or `Cannot read properties of undefined (reading 'effect')` before its fields appeared.
- **Root cause:** Precognition initialization flushed a store write during component construction and used Solid 1's one-argument `createEffect` shape against Solid 2's source-and-effect API, recursively re-entering or detaching effect creation from its owner.
- **Resolution:** Avoid store writes and flushes when idle during form construction, and express reactive validation props with Solid 2 source/effect pairs plus explicit initial setup.
- **Regression signal:** `pnpm --dir tests/browser exec playwright test precognition.spec.ts --project=solid-chromium-csr`
- **Prevention rule:** Component initialization must not flush reactive writes, and Solid 2 effects must always declare a source separately from the effect callback.

## 2026-08-30 — Client bundle was not hydratable

- **Affected area:** `vite.config.ts`, `tests/browser/vite.config.ts`, Solid SSR hydration
- **Symptom signature:** SSR markup rendered correctly, but hydration first threw `Cannot read properties of undefined (reading 'done')`; after adding the hydration bootstrap it reported missing hydration keys, removed dynamic children, or retained links without client event handlers.
- **Root cause:** The Solid Vite plugin was configured with `ssr: false` for the client build. That emits SPA-only DOM transforms. Calling `hydrate()` cannot make non-hydratable compiled templates claim server DOM, and this package's precompiled browser export carried those transforms into consumers.
- **Resolution:** Include Solid's hydration bootstrap in the document and configure `solid({ ssr: true })` for both the package and browser-test application; Vite chooses hydratable client output versus server output from the build context.
- **Regression signal:** `pnpm test:browser:ssr`
- **Prevention rule:** Any build whose client output may hydrate SSR markup must compile the entire imported component tree in the Solid plugin's SSR posture; never derive the plugin's `ssr` option directly from `isSsrBuild`.

## 2026-08-30 — Deferred initial owner topology broke layout hydration

- **Affected area:** `src/App.tsx`, persistent layout stack initialization
- **Symptom signature:** Two-level persistent layouts rendered correctly during SSR, then hydration reported `Hydration Mismatch. Unable to find DOM nodes for hydration key` and disposed the outer layout owner.
- **Root cause:** The layout-stack signal was created with an empty value and populated by a deferred Solid 2 signal write during initial component execution, allowing server rendering and client hydration to observe different initial owner topologies.
- **Resolution:** Normalize and reconcile the initial layout stack before creating its signal so the first signal value already describes the complete owner tree.
- **Regression signal:** `pnpm --dir tests/browser exec playwright test --project=solid-chromium-ssr layout-props.spec.ts`
- **Prevention rule:** State that determines hydration owner topology must be present in a signal's initial value; do not publish initial structural state through a deferred write.
