import { expect, test } from './support/test'

for (const integration of ['form-helper', 'form-component'] as const) {
  test.describe(`${integration} Precognition`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${integration}/precognition/default`)
    })

    test('validates touched fields and clears errors when they become valid', async ({ page }) => {
      await expect(page.getByTestId('name-touched')).toHaveText('Name is not touched')

      await page.getByLabel('Name').fill('ab')
      await page.getByLabel('Name').blur()
      await expect(page.getByText('Validating...')).toBeVisible()
      await expect(page.getByTestId('name-error')).toHaveText('The name must be at least 3 characters.')
      await expect(page.getByTestId('name-touched')).toHaveText('Name is touched')

      await page.getByLabel('Name').fill('Ada')
      await page.getByLabel('Name').blur()
      await expect(page.getByTestId('name-error')).toHaveText('')
      await expect(page.getByTestId('name-valid')).toHaveText('Name is valid!')
    })

    test('validates multiple fields without losing unrelated errors', async ({ page }) => {
      await page.getByRole('button', { name: 'Validate Both' }).click()
      await expect(page.getByTestId('name-error')).toHaveText('The name field is required.')
      await expect(page.getByTestId('email-error')).toHaveText('The email field is required.')

      await page.getByLabel('Name').fill('Ada')
      await page.getByLabel('Name').blur()
      await expect(page.getByTestId('name-error')).toHaveText('')
      await expect(page.getByTestId('email-error')).toHaveText('The email field is required.')
    })

    test('does not allow a slow stale validation to replace the latest result', async ({ page }) => {
      await page.getByLabel('Name').fill('ab')
      await page.getByLabel('Name').blur()
      await expect(page.getByText('Validating...')).toBeVisible()

      await page.getByLabel('Name').fill('Grace')
      await page.getByLabel('Name').blur()
      await expect(page.getByText('Validating...')).not.toBeVisible()
      await expect(page.getByTestId('name-error')).toHaveText('')
      await expect(page.getByTestId('name-valid')).toHaveText('Name is valid!')
      await page.waitForTimeout(150)
      await expect(page.getByTestId('name-error')).toHaveText('')
    })
  })
}

test('Form merges submission headers into validation requests', async ({ page }) => {
  await page.goto('/form-component/precognition/default')
  const validation = page.waitForRequest(
    (request) => request.url().endsWith('/precognition/default') && request.headers()['precognition'] === 'true',
  )
  await page.getByLabel('Name').fill('Ada')
  await page.getByLabel('Name').blur()
  expect((await validation).headers()['x-test']).toBe('solid')
})
