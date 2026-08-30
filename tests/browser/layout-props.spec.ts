import { expect, test } from './support/test'

test.describe('layout props', () => {
  test('updates shared and named dynamic props reactively', async ({ page }) => {
    await page.goto('/layout-props/basic')
    await expect(page.locator('.app-title')).toHaveText('Basic Layout Props')
    await expect(page.locator('.sidebar')).toBeVisible()

    await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
    await expect(page.locator('.sidebar')).not.toBeVisible()
    await page.getByRole('button', { name: 'Update Title' }).click()
    await expect(page.locator('.app-title')).toHaveText('Updated Title')

    await page.goto('/layout-props/named-dynamic')
    await expect(page.locator('.app-title')).toHaveText('Named Dynamic Page')
    await expect(page.locator('.content-layout')).toHaveAttribute('data-padding', 'md')
    await page.getByRole('button', { name: 'Update App Title' }).click()
    await page.getByRole('button', { name: 'Update Content Padding' }).click()
    await expect(page.locator('.app-title')).toHaveText('Updated App Title')
    await expect(page.locator('.content-layout')).toHaveAttribute('data-padding', 'xl')

    await page.getByRole('button', { name: 'Set competing titles' }).click()
    await expect(page.locator('.app-title')).toHaveText('Named Title')
    await page.getByRole('button', { name: 'Reset Layout Props' }).click()
    await expect(page.locator('.app-title')).toHaveText('Named Dynamic Page')
    await expect(page.locator('.content-layout')).toHaveAttribute('data-padding', 'md')

    await page.getByRole('button', { name: 'Update App Title' }).click()
    await page.getByRole('link', { name: 'Go to Basic Page' }).click()
    await expect(page.locator('.app-title')).toHaveText('Basic Layout Props')
  })

  test('preserves compatible layout owners while remounting page owners', async ({ page }) => {
    await page.goto('/layout-props/persistent-a')
    const before = await page.evaluate(() => ({
      app: window._inertia_app_layout_id,
      content: window._inertia_content_layout_id,
    }))
    await page.getByRole('button', { name: 'Layout count 0' }).click()

    await page.getByRole('link', { name: 'Go to Page B' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Persistent Page B' })).toBeVisible()
    await expect(page.locator('.app-title')).toHaveText('Persistent Page B')
    await expect(page.locator('.content-layout')).toHaveAttribute('data-padding', 'xl')
    await expect(page.getByRole('button', { name: 'Layout count 1' })).toBeVisible()

    expect(await page.evaluate(() => window._inertia_app_layout_id)).toBe(before.app)
    expect(await page.evaluate(() => window._inertia_content_layout_id)).toBe(before.content)
  })

  test('disposes only a changed layout suffix', async ({ page }) => {
    await page.goto('/layout-props/suffix-a')
    const appId = await page.evaluate(() => window._inertia_app_layout_id)

    await page.getByRole('link', { name: 'Change nested layout' }).click()
    await expect(page.getByRole('heading', { name: 'Suffix Page B' })).toBeVisible()

    expect(await page.evaluate(() => window._inertia_app_layout_id)).toBe(appId)
    expect(await page.evaluate(() => window._inertia_app_layout_disposals ?? 0)).toBe(0)
    expect(await page.evaluate(() => window._inertia_content_layout_disposals)).toBe(1)
    expect(await page.evaluate(() => window._inertia_alternate_layout_mounts)).toBe(1)
  })

  test('resolves layout callbacks from current page props', async ({ page }) => {
    await page.goto('/layout-props/callback')

    await expect(page.getByRole('heading', { name: 'Callback page: resolved' })).toBeVisible()
    await expect(page.locator('.app-title')).toHaveText('Callback resolved')
    await expect(page.locator('.sidebar')).not.toBeVisible()
  })

  test('applies Solid render-function layouts around the page element', async ({ page }) => {
    await page.goto('/layout-props/render-function')

    await expect(page.getByTestId('render-function-layout')).toContainText('Render function page')
  })

  test('follows preserve-state behavior independently of persistent layouts', async ({ page }) => {
    await page.goto('/layout-props/stateful-1')
    await page.getByRole('button', { name: 'Page count 0' }).click()
    await page.getByRole('link', { name: 'Preserve page' }).click()
    await expect(page.getByRole('heading', { name: 'Stateful Page 2' })).toBeVisible()
    await expect(page.locator('.app-layout')).toHaveAttribute('data-step', '2')
    await expect(page.getByRole('button', { name: 'Page count 1' })).toBeVisible()
    expect(await page.evaluate(() => window._inertia_page_mounts)).toBe(1)

    await page.getByRole('link', { name: 'Remount page' }).click()
    await expect(page.getByRole('heading', { name: 'Stateful Page 1' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Page count 0' })).toBeVisible()
    expect(await page.evaluate(() => window._inertia_page_mounts)).toBe(2)
    expect(await page.evaluate(() => window._inertia_page_disposals)).toBe(1)
    expect(await page.evaluate(() => window._inertia_app_layout_mounts)).toBe(1)
  })
})
