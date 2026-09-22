import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('Archive', () => {
  test('lists a chat, renames it, opens it, deletes it, shows the empty state', async ({ page }) => {
    await login(page)
    await page.getByTestId('chat-input').fill('What is a system boundary?')
    await page.getByTestId('chat-send').click()
    await expect(page.getByTestId('message-assistant')).toBeVisible({ timeout: 30_000 })
    await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/)
    const chatUrl = page.url()

    await page.goto('/archive')
    const row = page.getByTestId('archive-row').first()
    await expect(row).toBeVisible()
    await expect(page.getByTestId('archive-count')).toContainText(/1 chat/)

    await row.getByTestId('archive-rename').click()
    await row.getByTestId('archive-rename-input').fill('System boundary notes')
    await row.getByTestId('archive-rename-input').press('Enter')
    await expect(row.getByTestId('archive-open')).toHaveText('System boundary notes')

    await row.getByTestId('archive-open').click()
    await expect(page).toHaveURL(chatUrl)
    await expect(page.getByTestId('chat-title')).toHaveText('System boundary notes')
    await expect(page.getByTestId('message-assistant')).toBeVisible()

    await page.goto('/archive')
    await page.getByTestId('archive-row').first().getByTestId('archive-delete').click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByTestId('archive-empty')).toBeVisible()
  })
})
