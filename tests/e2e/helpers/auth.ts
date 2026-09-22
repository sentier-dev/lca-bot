import { type Page } from '@playwright/test'
import { E2E_USER } from '@/lib/seed-dev-user'

export async function login(
  page: Page,
  email: string = E2E_USER.email,
  password: string = E2E_USER.password,
) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/chat', { timeout: 10_000 })
}

/**
 * Open the sidebar by clicking the toggle button.
 * The sidebar starts hidden and must be opened before accessing nav links.
 */
export async function openSidebar(page: Page) {
  await page.getByLabel('Toggle sidebar').click()
  // Wait for the sidebar to finish animating (it transitions from -translate-x-full to translate-x-0)
  await page.locator('aside').first().waitFor({ state: 'visible', timeout: 5_000 })
}
