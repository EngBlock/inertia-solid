import { expect, test } from './support/test'

test.describe('useHttp', () => {
  test.beforeEach(async ({ page }) => page.goto('/use-http'))

  test('returns JSON through the configured direct HTTP client without an Inertia visit', async ({ page }) => {
    await page.fill('#name', 'Ada')
    await page.click('#save')

    await expect(page.locator('#result')).toHaveText('POST:Ada:preserved')
    await expect(page.locator('#response')).toHaveText('POST')
    await expect(page).toHaveURL(/\/use-http$/)
  })

  test('maps validation responses to reactive field errors', async ({ page }) => {
    await page.click('#validate')

    await expect(page.locator('#name-error')).toHaveText('The name field is required.')
    await expect(page.locator('#processing')).toHaveText('idle')
  })

  test('rolls back an optimistic patch when the request is cancelled', async ({ page }) => {
    await page.fill('#name', 'Todo')
    await page.click('#optimistic')
    await expect(page.locator('#name-value')).toHaveText('Todo (saving)')
    await expect(page.locator('#processing')).toHaveText('processing')

    await page.click('#cancel')
    await expect(page.locator('#cancelled')).toHaveText('cancelled')
    await expect(page.locator('#name-value')).toHaveText('Todo')
    await expect(page.locator('#processing')).toHaveText('idle')
  })
})
