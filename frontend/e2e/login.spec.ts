import { test, expect } from '@playwright/test';

test.describe('Flujo de Autenticación', () => {
  test('debe mostrar el formulario de ingreso correctamente', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Iniciar Sesión')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('error@fiq.uncp.edu.pe');
    await page.getByLabel('Contraseña').fill('wrongpassword');
    // Target only the button inside the form to avoid conflict with Header link
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();
    
    await expect(page.getByText('Credenciales inválidas')).toBeVisible();
  });
});
