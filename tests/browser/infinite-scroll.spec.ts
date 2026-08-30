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
