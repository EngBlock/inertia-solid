import { defineConfig, devices } from '@playwright/test'

const adapter = process.env.PACKAGE ?? 'solid'
const adapters = ['solid'] as const

if (!adapters.includes(adapter as (typeof adapters)[number])) {
  throw new Error(`Invalid adapter package "${adapter}". Expected one of: ${adapters.join(', ')}.`)
}

const ports = {
  solid: { csr: 13721, ssr: 13722 },
} as const
const selectedPorts = ports[adapter as keyof typeof ports]
const browsers = [
  { name: 'chromium', device: devices['Desktop Chrome'] },
  { name: 'webkit', device: devices['Desktop Safari'] },
] as const
const modes = ['csr', 'ssr'] as const

export default defineConfig({
  testDir: '.',
  testIgnore: ['fixtures/**', 'support/**'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 10_000,
  expect: { timeout: 5_000 },
  projects: browsers.flatMap(({ name, device }) =>
    modes.map((mode) => ({
      name: `${adapter}-${name}-${mode}`,
      use: { ...device, baseURL: `http://127.0.0.1:${selectedPorts[mode]}` },
    })),
  ),
  webServer: [
    {
      command: `PORT=${selectedPorts.csr} SSR=false node server.mjs`,
      url: `http://127.0.0.1:${selectedPorts.csr}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `PORT=${selectedPorts.ssr} SSR=true node server.mjs`,
      url: `http://127.0.0.1:${selectedPorts.ssr}/health`,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
