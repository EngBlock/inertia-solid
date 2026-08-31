import solid from '@solidjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.tsx'],
      refresh: true,
    }),
    solid(),
    tailwindcss(),
  ],
  resolve: {
    dedupe: ['@solidjs/web', 'solid-js'],
  },
  server: {
    port: 5174,
    watch: {
      ignored: ['**/storage/framework/views/**'],
    },
  },
})
