import { expect, test } from './support/test'

for (const [label, method] of [
  ['GET', 'get'],
  ['POST', 'post'],
  ['PUT', 'put'],
  ['PATCH', 'patch'],
  ['DELETE', 'delete'],
  ['Generic submit', 'post'],
  ['Wayfinder submit', 'patch'],
] as const) {
  test(`useForm submits with ${label}`, async ({ page }) => {
    await page.goto('/form-helper/methods')
    await page.getByRole('button', { name: label, exact: true }).click()

    await expect(page.getByTestId('method')).toHaveText(method)
    await expect(page.getByTestId('submitted-name')).toHaveText('Ada')
  })
}

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

test('useForm restores remembered state without excluded fields', async ({ page }) => {
  await page.goto('/form-helper/remember')
  await page.getByLabel('Name').fill('Grace')
  await page.getByLabel('Password').fill('secret')
  await page.getByRole('link', { name: 'Leave form' }).click()
  await expect(page).toHaveURL('/about')
  await page.goBack()
  await expect(page).toHaveURL('/form-helper/remember')

  await expect(page.getByLabel('Name')).toHaveValue('Grace')
  await expect(page.getByLabel('Password')).toHaveValue('')
})

test('useForm delegates a one-shot optimistic update that settles on success', async ({ page }) => {
  await page.goto('/form-helper/optimistic')
  await page.getByRole('button', { name: 'Optimistic success' }).click()
  await expect(page.getByTestId('count')).toHaveText('2')
  await page.waitForResponse('/form-helper/optimistic')
  await expect(page.getByTestId('count')).toHaveText('2')
})

test('useForm rolls a failed optimistic update back and exposes its errors', async ({ page }) => {
  await page.goto('/form-helper/optimistic')
  await page.getByRole('button', { name: 'Optimistic failure' }).click()
  await expect(page.getByTestId('count')).toHaveText('2')
  await page.waitForResponse('/form-helper/optimistic')
  await expect(page.getByTestId('count')).toHaveText('1')
  await expect(page.getByTestId('error')).toHaveText('Optimistic update failed.')
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
