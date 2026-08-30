import { expect, test as base } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    const consoleErrors: string[] = []
    const hydrationErrors: string[] = []
    const networkErrors: string[] = []
    const inertiaRequests = new Map<string, number>()

    page.on('console', (message) => {
      if (message.type() !== 'error') return

      const text = message.text()
      consoleErrors.push(text)
      if (/hydrat|mismatch/i.test(text)) hydrationErrors.push(text)
    })
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message)
      if (/hydrat|mismatch/i.test(error.message)) hydrationErrors.push(error.message)
    })
    page.on('requestfailed', (request) => {
      networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`)
    })
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
      }
    })
    page.on('request', (request) => {
      if (!request.headers()['x-inertia']) return

      const key = `${request.method()} ${request.url()}`
      inertiaRequests.set(key, (inertiaRequests.get(key) ?? 0) + 1)
    })

    await use(page)

    const duplicateRequests = [...inertiaRequests].filter(([, count]) => count > 1)
    expect(consoleErrors, 'browser console and page errors').toEqual([])
    expect(hydrationErrors, 'hydration errors').toEqual([])
    expect(networkErrors, 'failed requests and responses').toEqual([])
    expect(duplicateRequests, 'duplicate Inertia requests').toEqual([])
  },
})

export { expect }
