import { expect, test } from './support/test'

const listenForInfiniteScroll = (page: import('@playwright/test').Page) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.headers()['x-inertia'] === 'true' && request.url().includes('/infinite-scroll/')) {
      requests.push(request.url())
    }
  })
  return requests
}

const scrollToBottom = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

test('automatically loads and merges each forward page once', async ({ page }) => {
  const requests = listenForInfiniteScroll(page)
  await page.goto('/infinite-scroll/automatic')

  await expect(page.getByText('User 1', { exact: true })).toBeVisible()
  await expect(page.getByText('User 6', { exact: true })).toBeHidden()

  await scrollToBottom(page)
  await expect(page.getByText('Next loading: yes')).toBeVisible()
  await expect(page.getByText('Items loading: yes')).toBeVisible()
  await expect(page.getByText('User 6', { exact: true })).toBeVisible()
  await expect(page.getByText('User 10', { exact: true })).toBeVisible()
  await expect(page.getByText('Next loading: no')).toBeVisible()
  expect(requests).toHaveLength(1)

  await scrollToBottom(page)
  await expect(page.getByText('User 15', { exact: true })).toBeVisible()
  await expect(page.getByText('Has next: no')).toBeVisible()
  await scrollToBottom(page)
  await page.waitForTimeout(150)

  expect(requests).toHaveLength(2)
  await expect(page.locator('[data-user-id]')).toHaveCount(15)
  await expect(page.locator('[data-user-id="1"]')).toHaveAttribute('data-infinite-scroll-page', '1')
  await expect(page.locator('[data-user-id="6"]')).toHaveAttribute('data-infinite-scroll-page', '2')
})

test('reverse mode renders in timeline order and begins at the bottom without an initial request', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 420 })
  const requests = listenForInfiniteScroll(page)
  await page.goto('/infinite-scroll/reverse')

  await expect(page.locator('[data-user-id]')).toHaveCount(5)
  await expect
    .poll(() => page.locator('[data-user-id]').evaluateAll((items) => items.map((item) => item.textContent)))
    .toEqual(['User 11', 'User 12', 'User 13', 'User 14', 'User 15'])
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await page.waitForTimeout(150)
  expect(requests).toHaveLength(0)
})

test('prepends previous pages without moving the visible content', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 420 })
  await page.goto('/infinite-scroll/trigger-both?page=3')

  await expect(page.getByText('User 6', { exact: true })).toBeVisible()
  await expect(page.locator('[data-user-id]')).toHaveCount(10)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByText('Previous loading: yes')).toBeVisible()
  const before = await page.locator('[data-user-id="6"]').boundingBox()

  await expect(page.getByText('User 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Previous loading: no')).toBeVisible()
  await expect
    .poll(async () => (await page.locator('[data-user-id="6"]').boundingBox())?.y)
    .toBeCloseTo(before!.y, 0)
  await expect(page.locator('[data-user-id]')).toHaveCount(15)
  await expect
    .poll(() => page.locator('[data-user-id]').evaluateAll((items) => items.map((item) => item.textContent)))
    .toEqual(Array.from({ length: 15 }, (_, index) => `User ${index + 1}`))
})

test('reverse mode supports automatic, manual, and manual-after loading', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 420 })
  await page.goto('/infinite-scroll/reverse')
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByText('User 6', { exact: true })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByText('User 1', { exact: true })).toBeVisible()
  await expect(page.locator('[data-user-id]')).toHaveCount(15)

  await page.goto('/infinite-scroll/manual-reverse?page=2')
  await expect(page.getByText('Previous action is manual: yes')).toBeVisible()
  await expect(page.getByTestId('next-state').getByText('Manual mode: yes')).toBeVisible()
  await page.getByRole('button', { name: 'Load next' }).click()
  await expect(page.getByText('Next loading: yes')).toBeVisible()
  await expect(page.getByText('User 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Has next: no')).toBeVisible()
  await page.getByRole('button', { name: 'Load previous' }).click()
  await expect(page.getByText('Previous loading: yes')).toBeVisible()
  await expect(page.getByText('User 15', { exact: true })).toBeVisible()
  await expect(page.getByText('Has previous: no')).toBeVisible()

  await page.goto('/infinite-scroll/manual-after?reverse=1')
  await expect(page.getByTestId('next-state').getByText('Manual mode: no')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByText('User 6', { exact: true })).toBeVisible()
  await expect(page.getByTestId('next-state').getByText('Manual mode: yes')).toBeVisible()
  await page.getByRole('button', { name: 'Load next' }).click()
  await expect(page.getByText('User 1', { exact: true })).toBeVisible()
})

test('reports previous, next, loading, and completion state in both directions', async ({ page }) => {
  await page.goto('/infinite-scroll/manual?page=2')

  await expect(page.getByText('Has previous: yes')).toBeVisible()
  await expect(page.getByText('Has next: yes')).toBeVisible()
  await page.getByRole('button', { name: 'Load previous' }).click()
  await expect(page.getByText('Previous loading: yes')).toBeVisible()
  await expect(page.getByText('Items loading: yes')).toBeVisible()
  await expect(page.getByText('Has previous: no')).toBeVisible()
  await page.getByRole('button', { name: 'Load next' }).click()
  await expect(page.getByText('Next loading: yes')).toBeVisible()
  await expect(page.getByText('Items loading: yes')).toBeVisible()
  await expect(page.getByText('Has next: no')).toBeVisible()
})

test('restores merged pages, URL, page tags, and scroll through browser history', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 420 })
  await page.goto('/infinite-scroll/remember-state?page=2')
  await page.getByRole('button', { name: 'Load previous' }).click()
  await expect(page.getByText('User 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Load next' }).click()
  await expect(page.getByText('User 15', { exact: true })).toBeVisible()
  await page.locator('[data-user-id="8"]').evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await expect(page).toHaveURL(/page=2/)
  await expect
    .poll(() =>
      page.evaluate(
        () => window.history.state?.documentScrollPosition?.top === window.scrollY,
      ),
    )
    .toBe(true)
  const url = page.url()
  const userPosition = await page.locator('[data-user-id="8"]').boundingBox()
  const requests = listenForInfiniteScroll(page)

  await page.getByRole('link', { name: 'Leave timeline' }).click()
  await expect(page.getByText('About page')).toBeVisible()
  await page.goBack()

  await expect(page).toHaveURL(url)
  await expect(page.locator('[data-user-id]')).toHaveCount(15)
  await expect(page.locator('[data-user-id="1"]')).toHaveAttribute('data-infinite-scroll-page', '1')
  await expect(page.locator('[data-user-id="6"]')).toHaveAttribute('data-infinite-scroll-page', '2')
  await expect(page.locator('[data-user-id="11"]')).toHaveAttribute('data-infinite-scroll-page', '3')
  await expect(page.getByText('Has previous: no')).toBeVisible()
  await expect(page.getByText('Has next: no')).toBeVisible()
  await expect
    .poll(async () => (await page.locator('[data-user-id="8"]').boundingBox())?.y)
    .toBeCloseTo(userPosition!.y, 0)

  await page.goForward()
  await expect(page.getByText('About page')).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(url)
  await expect(page.locator('[data-user-id]')).toHaveCount(15)
  await expect
    .poll(async () => (await page.locator('[data-user-id="8"]').boundingBox())?.y)
    .toBeCloseTo(userPosition!.y, 0)
  expect(requests).toHaveLength(0)
})

test('renders deterministic reverse slot state and hydrates without an initial request', async (
  { page, request },
  testInfo,
) => {
  test.skip(!testInfo.project.name.endsWith('-ssr'))

  const response = await request.get('/infinite-scroll/manual-reverse?page=2')
  const html = await response.text()
  expect(html).toMatch(/Has previous:.*yes/)
  expect(html).toMatch(/Has next:.*yes/)
  const renderedUser = html.lastIndexOf('User 6')
  expect(html.indexOf('data-testid="next-state"')).toBeLessThan(renderedUser)
  expect(renderedUser).toBeLessThan(html.indexOf('data-testid="previous-state"'))

  const requests = listenForInfiniteScroll(page)
  await page.goto('/infinite-scroll/manual-reverse?page=2')
  await expect(page.getByText('User 6', { exact: true })).toBeVisible()
  await page.waitForTimeout(150)
  expect(requests).toHaveLength(0)
})

test('tracks the visible page in the URL unless preservation is requested', async ({ page }) => {
  await page.goto('/infinite-scroll/automatic')
  await scrollToBottom(page)
  await expect(page.getByText('User 10', { exact: true })).toBeVisible()
  await page
    .locator('[data-user-id="8"]')
    .evaluate((element) => element.scrollIntoView({ block: 'start' }))
  await expect(page).toHaveURL(/page=2/)

  await page.goto('/infinite-scroll/preserve-url')
  await scrollToBottom(page)
  await expect(page.getByText('User 10', { exact: true })).toBeVisible()
  await page
    .locator('[data-user-id="8"]')
    .evaluate((element) => element.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(150)
  await expect(page).toHaveURL('/infinite-scroll/preserve-url')
})

test('supports manual actions, state, programmatic access, and remounting', async ({ page }) => {
  const requests = listenForInfiniteScroll(page)
  await page.goto('/infinite-scroll/manual')

  await expect(page.getByText('Manual mode: yes')).toBeVisible()
  await expect(page.getByText('Has next: yes')).toBeVisible()
  await page.getByRole('button', { name: 'Load next' }).click()
  await expect(page.getByText('Next loading: yes')).toBeVisible()
  await expect(page.getByText('User 10', { exact: true })).toBeVisible()
  await expect(page.getByText('Next loading: no')).toBeVisible()

  await page.getByRole('button', { name: 'Toggle scroll' }).click()
  await page.getByRole('button', { name: 'Toggle scroll' }).click()
  await page.getByRole('button', { name: 'Programmatic next' }).click()
  await expect(page.getByText('User 15', { exact: true })).toBeVisible()
  await expect(page.getByText('Has next: no')).toBeVisible()
  expect(requests).toHaveLength(2)
})

test('switches from automatic to manual mode after the configured request count', async ({
  page,
}) => {
  await page.goto('/infinite-scroll/manual-after')
  await expect(page.getByText('Manual mode: no')).toBeVisible()

  await scrollToBottom(page)
  await expect(page.getByText('User 10', { exact: true })).toBeVisible()
  await expect(page.getByText('Manual mode: yes')).toBeVisible()
  await page.getByRole('button', { name: 'Load next' }).click()
  await expect(page.getByText('User 15', { exact: true })).toBeVisible()
})

test('supports a custom wrapper, items selector, end trigger, and scroll container', async ({
  page,
}) => {
  const requests = listenForInfiniteScroll(page)
  await page.goto('/infinite-scroll/custom')

  await expect(page.locator('section.custom-wrapper')).toBeVisible()
  await expect(page.locator('section.custom-wrapper > #custom-items')).toBeVisible()
  const container = page.getByTestId('scroll-container')
  await container.evaluate((element) => element.scrollTo(0, element.scrollHeight))
  await expect(page.getByText('User 10', { exact: true })).toBeVisible()
  expect(requests).toHaveLength(1)
})
