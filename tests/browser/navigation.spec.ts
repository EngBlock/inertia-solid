import { expect, test } from './support/test'

test('renders the initial page and completes client-side navigation', async ({ page, request }, testInfo) => {
  const initialResponse = await request.get('/')
  const initialHtml = await initialResponse.text()

  expect(initialResponse.ok()).toBe(true)
  expect(initialHtml.includes('data-server-rendered')).toBe(testInfo.project.name.endsWith('-ssr'))
  if (testInfo.project.name.endsWith('-ssr')) {
    expect(initialHtml).toContain('Home page')
  }

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Home page' })).toBeVisible()
  await expect(page.getByTestId('message')).toHaveText('Rendered by the shared fixture server')

  const navigation = page.waitForResponse(
    (response) => response.url().endsWith('/about') && response.request().headers()['x-inertia'] === 'true',
  )
  await page.getByRole('link', { name: 'Visit about' }).click()
  await navigation

  await expect(page).toHaveURL('/about')
  await expect(page.getByRole('heading', { name: 'About page' })).toBeVisible()
  await expect(page.getByTestId('message')).toHaveText('Client-side navigation completed')
})
