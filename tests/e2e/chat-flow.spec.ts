import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('Chat', () => {
  test('asks a question, sees citations, resumes after reload', async ({ page }) => {
    await login(page)
    await expect(page.getByTestId('chat-empty')).toBeVisible()
    await page.getByTestId('chat-input').fill('What is a functional unit?')
    await page.getByTestId('chat-send').click()
    await expect(page.getByTestId('message-user')).toContainText('What is a functional unit?')
    await expect(page.getByTestId('message-assistant')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('citations').getByRole('link').first()).toHaveAttribute('href', /github\.com\/sentier-dev\/lca-wiki\/blob\//)
    await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/)
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByTestId('message-assistant')).toBeVisible()
    await expect(page.getByTestId('message-user')).toContainText('What is a functional unit?')
    await expect(page.getByTestId('app-footer')).toContainText(/at\s+[0-9a-f]{7}/)
  })

  test('shows the gap note when the wiki cannot answer', async ({ page }) => {
    await login(page)
    await page.getByTestId('chat-input').fill('Tell me about unknown-topic-xyz')
    await page.getByTestId('chat-send').click()
    await expect(page.getByTestId('gap-note')).toBeVisible({ timeout: 30_000 })
  })

  test('another user cannot open the conversation', async ({ page, browser }) => {
    await login(page)
    await page.getByTestId('chat-input').fill('What is a system boundary?')
    await page.getByTestId('chat-send').click()
    await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/)
    const url = page.url()
    const other = await browser.newContext()
    const otherPage = await other.newPage()
    await login(otherPage, 'dev@lca-wiki.local', 'devpassword123')
    const res = await otherPage.goto(url)
    expect(res?.status()).toBe(404)
    await other.close()
  })
})
