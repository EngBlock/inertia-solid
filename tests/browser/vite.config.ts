import { resolve } from 'node:path'
import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig(({ isSsrBuild }) => ({
  // SSR mode emits hydratable client code and server code from the same tree.
  plugins: [solid({ ssr: true })],
  build: isSsrBuild
    ? {
        outDir: 'dist/server',
        emptyOutDir: false,
        rollupOptions: {
          output: { entryFileNames: 'ssr.js' },
        },
        target: 'es2022',
      }
    : {
        outDir: 'dist/client',
        rollupOptions: {
          input: resolve(import.meta.dirname, 'index.html'),
        },
        target: 'es2022',
      },
}))
