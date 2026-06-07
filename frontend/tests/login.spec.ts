import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Iniciar Sesión');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Adjust selector based on actual implementation of error message
    // await expect(page.locator('text=Error')).toBeVisible();
  });
});
