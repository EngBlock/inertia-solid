# Bug lessons

## 2026-08-30 — Client bundle was not hydratable

- **Affected area:** `vite.config.ts`, `tests/browser/vite.config.ts`, Solid SSR hydration
- **Symptom signature:** SSR markup rendered correctly, but hydration first threw `Cannot read properties of undefined (reading 'done')`; after adding the hydration bootstrap it reported missing hydration keys, removed dynamic children, or retained links without client event handlers.
- **Root cause:** The Solid Vite plugin was configured with `ssr: false` for the client build. That emits SPA-only DOM transforms. Calling `hydrate()` cannot make non-hydratable compiled templates claim server DOM, and this package's precompiled browser export carried those transforms into consumers.
- **Resolution:** Include Solid's hydration bootstrap in the document and configure `solid({ ssr: true })` for both the package and browser-test application; Vite chooses hydratable client output versus server output from the build context.
- **Regression signal:** `pnpm test:browser:ssr`
- **Prevention rule:** Any build whose client output may hydrate SSR markup must compile the entire imported component tree in the Solid plugin's SSR posture; never derive the plugin's `ssr` option directly from `isSsrBuild`.
