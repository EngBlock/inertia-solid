import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'

const isExternal = (id: string) =>
  ['@inertiajs/core', '@solidjs/web', 'solid-js', 'es-toolkit'].some(
    (dependency) => id === dependency || id.startsWith(`${dependency}/`),
  )

export default defineConfig(({ mode }) => {
  const ssr = mode === 'ssr'

  return {
    // The browser export must remain hydratable because consumers use the same
    // precompiled package for CSR and SSR hydration.
    plugins: [solid({ ssr: true })],
    build: ssr
      ? {
          ssr: 'src/index.ts',
          outDir: 'dist/ssr',
          emptyOutDir: false,
          rollupOptions: {
            external: isExternal,
            output: {
              entryFileNames: 'index.js',
              chunkFileNames: 'chunks/[name]-[hash].js',
            },
          },
          target: 'es2022',
          sourcemap: true,
        }
      : {
          lib: {
            entry: {
              index: 'src/index.ts',
              server: 'src/server.ts',
            },
            formats: ['es'],
          },
          rollupOptions: {
            external: isExternal,
            output: {
              entryFileNames: '[name].js',
              chunkFileNames: 'chunks/[name]-[hash].js',
            },
          },
          target: 'es2022',
          sourcemap: true,
        },
  }
})
