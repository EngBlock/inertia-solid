import { expect, test } from './support/test'

test('Form serializes browser controls and exposes reactive submission state', async ({ page }) => {
  await page.goto('/form-component/basic')

  await expect(page.getByTestId('dirty')).toHaveText('false')
  await page.getByLabel('Name').fill('Grace')
  await expect(page.getByTestId('dirty')).toHaveText('true')

  const response = page.waitForResponse(
    (value) => value.url().endsWith('/form-component/basic') && value.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('form')).toHaveAttribute('inert', '')
  await response

  await expect(page.getByTestId('successful')).toHaveText('true')
  await expect(page.getByTestId('processing')).toHaveText('false')
  await expect(page.getByTestId('submitted-form')).toContainText('Grace')
  await expect(page.getByTestId('submitted-form')).toContainText('solid')
  await expect(page.getByTestId('submitted-form')).toContainText('inertia')
  await expect(page.getByTestId('submitted-form')).toContainText('2000-01-02')
  await expect(page.getByTestId('submitted-form')).toContainText('save')
})

test('Form provides one stable reactive surface through slots, context, and refs', async ({ page }) => {
  await page.goto('/form-component/advanced')

  await expect(page.getByTestId('outside-context')).toHaveText('true')
  await expect(page.getByTestId('context-same-slot')).toHaveText('true')
  await page.getByRole('button', { name: 'Compare surfaces' }).click()
  await expect(page.getByTestId('surface-identity')).toHaveText('true')

  await expect(page.getByTestId('slot-dirty')).toHaveText('false')
  await expect(page.getByTestId('context-dirty')).toHaveText('false')
  await page.getByLabel('Name').fill('Grace')
  await expect(page.getByTestId('slot-dirty')).toHaveText('true')
  await expect(page.getByTestId('context-dirty')).toHaveText('true')

  await page.getByRole('button', { name: 'Read data' }).click()
  await expect(page.getByTestId('current-data')).toContainText('"name":"Grace"')
  await page.getByLabel('Role').selectOption('editor')
  await page.getByRole('button', { name: 'Read data' }).click()
  await expect(page.getByTestId('current-data')).toContainText('"role":"editor"')
})

test('Form synchronizes native reset, selective reset, defaults, and errors', async ({ page }) => {
  await page.goto('/form-component/advanced')

  await page.getByLabel('Name').fill('Grace')
  await page.getByLabel('Email').fill('grace@example.com')
  await page.getByRole('button', { name: 'Set errors' }).click()
  await expect(page.getByTestId('context-name-error')).toHaveText('Name error')
  await expect(page.getByTestId('context-email-error')).toHaveText('Email error')

  await page.getByRole('button', { name: 'Clear email error' }).click()
  await expect(page.getByTestId('context-email-error')).toHaveText('')
  await page.getByRole('button', { name: 'Reset and clear name' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Ada')
  await expect(page.getByLabel('Email')).toHaveValue('grace@example.com')
  await expect(page.getByTestId('context-name-error')).toHaveText('')
  await expect(page.getByTestId('slot-dirty')).toHaveText('true')

  await page.getByRole('button', { name: 'Native reset' }).click()
  await expect(page.getByLabel('Email')).toHaveValue('ada@example.com')
  await expect(page.getByTestId('slot-dirty')).toHaveText('false')

  await page.getByLabel('Email').fill('new-default@example.com')
  await page.getByRole('button', { name: 'Set defaults' }).click()
  await expect(page.getByTestId('slot-dirty')).toHaveText('false')
  await page.getByLabel('Email').fill('temporary@example.com')
  await page.getByRole('button', { name: 'Reset email from ref' }).click()
  await expect(page.getByLabel('Email')).toHaveValue('new-default@example.com')
  await expect(page.getByTestId('slot-dirty')).toHaveText('false')
})

test('Form exposes submit completion methods through an imperative ref', async ({ page }) => {
  await page.goto('/form-component/advanced')
  await page.getByLabel('Name').fill('Grace')
  await page.getByLabel('Email').fill('grace@example.com')

  const response = page.waitForResponse(
    (value) => value.url().endsWith('/form-component/advanced') && value.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Submit from ref' }).click()
  await response

  await expect(page.getByTestId('completed')).toHaveText('true')
  await expect(page.getByLabel('Name')).toHaveValue('Grace')
  await expect(page.getByLabel('Email')).toHaveValue('ada@example.com')
})

test('Form exposes validation errors and stable reset behavior', async ({ page }) => {
  await page.goto('/form-component/errors')
  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page.getByTestId('name-error')).toHaveText('The name field is required.')
  await expect(page.getByTestId('has-errors')).toHaveText('true')

  await page.goto('/form-component/basic')
  await page.getByLabel('Name').fill('Changed')
  await expect(page.getByTestId('dirty')).toHaveText('true')
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Ada')
  await expect(page.getByTestId('dirty')).toHaveText('false')
})

test('Form submits files through browser FormData', async ({ page }) => {
  await page.goto('/form-component/basic')
  await page.getByLabel('Avatar').setInputFiles({
    name: 'avatar.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('solid form upload'),
  })

  const response = page.waitForResponse(
    (value) => value.url().endsWith('/form-component/basic') && value.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Save' }).click()
  const result = await response

  expect(result.request().headers()['content-type']).toContain('multipart/form-data')
  await expect(page.getByTestId('submitted-form')).toContainText('avatar.txt')
})

test('Form respects alternate submitter action, method, encoding, name, and value', async ({ page }) => {
  await page.goto('/form-component/basic')

  const response = page.waitForResponse(
    (value) => value.url().endsWith('/dump/patch') && value.request().method() === 'PATCH',
  )
  await page.getByRole('button', { name: 'Publish' }).click()
  const result = await response

  expect(result.request().headers()['content-type']).toContain('multipart/form-data')
  await expect(page.getByTestId('method')).toHaveText('patch')
  await expect(page.getByTestId('submitted-form')).toContainText('publish')
})

test('Form merges GET data and the clicked submitter into the query string', async ({ page }) => {
  await page.goto('/form-component/basic')
  await page.getByLabel('Name').fill('Query Name')
  await page.getByRole('button', { name: 'Search' }).click()

  await expect(page).toHaveURL(/\/dump\/get\?/)
  const url = new URL(page.url())
  expect(url.searchParams.get('profile[name]')).toBe('Query Name')
  expect(url.searchParams.get('intent')).toBe('search')
  await expect(page.getByTestId('method')).toHaveText('get')
})

test('Form retains GET formtarget blank behavior', async ({ page, context }) => {
  await page.goto('/form-component/basic')

  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Preview' }).click()
  const popup = await popupPromise
  await popup.waitForURL(/\/dump\/get\?/)

  const url = new URL(popup.url())
  expect(url.pathname).toBe('/dump/get')
  expect(url.searchParams.get('intent')).toBe('preview')
  await expect(page).toHaveURL('/form-component/basic')
})
