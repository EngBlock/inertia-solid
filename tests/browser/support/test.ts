import { expect, test as base } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    const consoleErrors: string[] = []
    const hydrationErrors: string[] = []
    const networkErrors: string[] = []
    const activeInertiaRequests = new Map<string, number>()
    const duplicateRequests: string[] = []
    let expectedValidationErrors = 0

    const inertiaRequestKey = (request: import('@playwright/test').Request) =>
      request.headers()['x-inertia'] === 'true' ? `${request.method()} ${request.url()}` : undefined
    const releaseInertiaRequest = (request: import('@playwright/test').Request) => {
      const key = inertiaRequestKey(request)
      if (!key) return

      const remaining = (activeInertiaRequests.get(key) ?? 1) - 1
      if (remaining > 0) activeInertiaRequests.set(key, remaining)
      else activeInertiaRequests.delete(key)
    }

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
      releaseInertiaRequest(request)
      const error = request.failure()?.errorText ?? 'failed'
      if (/abort|cancel/i.test(error)) return
      networkErrors.push(`${request.method()} ${request.url()}: ${error}`)
    })
    page.on('requestfinished', releaseInertiaRequest)
    page.on('response', (response) => {
      if (response.status() === 422) {
        expectedValidationErrors += 1
        return
      }
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
      }
    })
    page.on('request', (request) => {
      const key = inertiaRequestKey(request)
      if (!key) return

      const active = activeInertiaRequests.get(key) ?? 0
      if (active > 0) duplicateRequests.push(key)
      activeInertiaRequests.set(key, active + 1)
    })

    await use(page)
    const unexpectedConsoleErrors = [...consoleErrors]
    for (let index = 0; index < expectedValidationErrors; index += 1) {
      const expected = unexpectedConsoleErrors.findIndex((error) =>
        error.includes('Failed to load resource: the server responded with a status of 422'),
      )
      if (expected !== -1) unexpectedConsoleErrors.splice(expected, 1)
    }
    expect(unexpectedConsoleErrors, 'browser console and page errors').toEqual([])
    expect(hydrationErrors, 'hydration errors').toEqual([])
    expect(networkErrors, 'failed requests and responses').toEqual([])
    expect(duplicateRequests, 'duplicate Inertia requests').toEqual([])
  },
})

export { expect }
