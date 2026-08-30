import { expect, test } from './support/test'

test('useForm submits data changed in the same turn', async ({ page }) => {
  await page.goto('/form-helper/set-data-then-post')

  const post = page.waitForResponse(
    (response) => response.url().endsWith('/dump/post') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Set and POST' }).click()
  await post

  await expect(page.getByTestId('method')).toHaveText('post')
  await expect(page.getByTestId('submitted-code')).toHaveText('123456')
})

test('useForm exposes validation errors from a failed POST', async ({ page }) => {
  await page.goto('/form-helper/errors')
  await page.getByLabel('Name').fill('')

  const post = page.waitForResponse(
    (response) => response.url().endsWith('/form-helper/errors') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Submit form' }).click()
  await post

  await expect(page.getByTestId('name-error')).toHaveText('The name field is required.')
  await expect(page.getByTestId('lifecycle')).toContainText('start:true')
  await expect(page.getByTestId('lifecycle')).toContainText('error:true')
  await expect(page.getByTestId('lifecycle')).toContainText('finish:false')
})
