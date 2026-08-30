import { expect, test } from './support/test'

const whenVisibleRequests = (page: import('@playwright/test').Page) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.headers()['x-inertia'] === 'true' && request.url().includes('/when-visible')) {
      requests.push(request.url())
    }
  })
  return requests
}

test('reloads selected props only when visible and only once by default', async ({ page }) => {
  const requests = whenVisibleRequests(page)
  await page.goto('/when-visible')

  await page.evaluate(() => window.scrollTo(0, 1000))
  await page.waitForTimeout(100)
  expect(requests).toHaveLength(0)

  const response = page.waitForResponse(
    (result) => result.url().includes('/when-visible') && result.request().headers()['x-inertia-partial-data'] === 'foo',
  )
  await page.evaluate(() => window.scrollTo(0, 3000))
  await expect(page.getByText('Loading first one...')).toBeVisible()
  await response
  await expect(page.getByText('First one is visible: loaded')).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 1000))
  await page.waitForTimeout(100)
  await page.evaluate(() => window.scrollTo(0, 3000))
  await page.waitForTimeout(100)
  expect(requests.filter((url) => !url.includes('?'))).toHaveLength(1)
})

test('honors the viewport buffer', async ({ page }) => {
  const requests = whenVisibleRequests(page)
  await page.goto('/when-visible')

  await page.evaluate(() => window.scrollTo(0, 5800))
  await page.waitForTimeout(100)
  expect(requests).toHaveLength(0)

  const response = page.waitForResponse(
    (result) => result.url().includes('/when-visible') && result.request().headers()['x-inertia-partial-data'] === 'foo',
  )
  await page.evaluate(() => window.scrollTo(0, 6500))
  await expect(page.getByText('Loading second one...')).toBeVisible()
  await response
  await expect(page.getByText('Second one is visible!')).toBeVisible()
})

test('always reloads, exposes fetching, and reads current params lazily', async ({ page }) => {
  const requests = whenVisibleRequests(page)
  await page.goto('/when-visible')

  let response = page.waitForResponse((result) => result.url().includes('count=0') && result.url().includes('param=initial'))
  await page.evaluate(() => window.scrollTo(0, 13000))
  await expect(page.getByText('Loading count...')).toBeVisible()
  await response
  await expect(page.getByText('Count is now 1')).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 10500))
  await page.waitForTimeout(150)
  response = page.waitForResponse((result) => result.url().includes('count=1') && result.url().includes('param=initial'))
  await page.evaluate(() => window.scrollTo(0, 13000))
  await expect(page.getByText('Fetching in background...')).toBeVisible()
  await response
  await expect(page.getByText('Count is now 2')).toBeVisible()
  await expect(page.getByText('Fetching in background...')).not.toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Update Param' }).click()
  await expect(page.getByText('Current param: updated')).toBeVisible()
  await page.waitForTimeout(100)
  expect(requests.filter((url) => url.includes('param=updated'))).toHaveLength(0)

  response = page.waitForResponse((result) => result.url().includes('count=2') && result.url().includes('param=updated'))
  await page.evaluate(() => window.scrollTo(0, 13000))
  await response
  await expect(page.getByText('Count is now 3')).toBeVisible()
})

test('cleans up and observes again after repeated mounting', async ({ page }) => {
  await page.goto('/when-visible')
  await page.getByRole('button', { name: 'Toggle delayed' }).click()
  await page.evaluate(() => window.scrollTo(0, 17500))
  await page.waitForTimeout(100)
  await expect(page.getByText('Loading delayed...')).not.toBeVisible()

  const response = page.waitForResponse(
    (result) => result.url().includes('/when-visible') && result.request().headers()['x-inertia-partial-data'] === 'delayed',
  )
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('button:nth-of-type(2)')?.click())
  await expect(page.getByText('Loading delayed...')).toBeVisible()
  await response
  await expect(page.getByText('Delayed: loaded')).toBeVisible()
})

test('renders deterministic fallback markup during SSR hydration', async ({ page, request }, testInfo) => {
  test.skip(!testInfo.project.name.endsWith('-ssr'))

  const response = await request.get('/when-visible')
  expect(await response.text()).toContain('Loading first one...')

  await page.goto('/when-visible')
  await expect(page.getByText('Loading first one...')).toBeVisible()
})
