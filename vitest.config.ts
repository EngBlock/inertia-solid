import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [solid()],
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/browser/**'],
  },
})
