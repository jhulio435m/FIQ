import { test, expect } from '@playwright/test';

test.describe('Flujo de Autenticación', () => {
  test('debe mostrar el formulario de ingreso correctamente', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Iniciar Sesión')).toBeVisible();
    await expect(page.getByLabel('Correo institucional')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo institucional').fill('error@fiq.uncp.edu.pe');
    await page.getByLabel('Contraseña').fill('wrongpassword');
    // Target only the button inside the form to avoid conflict with Header link
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();
    
    await expect(page.getByText('Credenciales inválidas')).toBeVisible();
  });

  test('restaura sesión sin localStorage y la revoca al salir', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo institucional').fill('admin@fiq.uncp.edu.pe');
    await page.getByLabel('Contraseña').fill('admin123');
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('refresh_token'))).toBeNull();
    await page.goto('/perfil');
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.locator('header').getByRole('button', { name: 'Ingresar' })).toBeVisible();
    await page.goto('/perfil');
    await expect(page).toHaveURL(/\/login$/);
  });
});
