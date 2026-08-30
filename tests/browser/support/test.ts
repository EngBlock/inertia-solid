import { expect, test as base } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    const consoleErrors: string[] = []
    const hydrationErrors: string[] = []
    const networkErrors: string[] = []
    const inertiaRequests = new Map<string, number>()
    let precognitionValidationErrors = 0

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
      const error = request.failure()?.errorText ?? 'failed'
      if (request.headers()['precognition'] === 'true' && /abort|cancel/i.test(error)) return
      networkErrors.push(`${request.method()} ${request.url()}: ${error}`)
    })
    page.on('response', (response) => {
      if (response.status() === 422 && response.request().headers()['precognition'] === 'true') {
        precognitionValidationErrors += 1
        return
      }
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
    const unexpectedConsoleErrors = [...consoleErrors]
    for (let index = 0; index < precognitionValidationErrors; index += 1) {
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
