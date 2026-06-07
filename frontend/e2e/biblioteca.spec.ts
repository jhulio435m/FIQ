import { test, expect } from '@playwright/test';

test.describe('Flujo de Biblioteca y Descargas', () => {
  
  test('debe permitir navegar la biblioteca y ver detalles sin estar logueado', async ({ page }) => {
    await page.goto('/biblioteca');
    await expect(page.getByText('Biblioteca Virtual')).toBeVisible();
    await expect(page.getByText(/recurso.*encontrado/)).toBeVisible({ timeout: 15000 });
    
    // Click en la primera tarjeta
    await page.locator('.group.p-4').first().click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Iniciar Sesión para Descargar')).toBeVisible();
  });

  test('debe redirigir al login al intentar descargar sin sesión', async ({ page }) => {
    await page.goto('/biblioteca');
    await page.locator('.group.p-4').first().click();
    
    await page.getByText('Iniciar Sesión para Descargar').click();
    
    // Esperar a que cambie la URL al login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('debe permitir login y descarga exitosa', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@fiq.uncp.edu.pe');
    await page.getByLabel('Contraseña').fill('admin123');
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();
    
    await expect(page.locator('header')).toContainText('Administrador PRO');
    
    await page.goto('/biblioteca');
    await expect(page.getByText(/recurso.*encontrado/)).toBeVisible();
    
    await page.locator('.group.p-4').first().click();
    const downloadBtn = page.getByText('Descargar PDF');
    await expect(downloadBtn).toBeVisible();
    
    await downloadBtn.click();
    await expect(page.getByText('Error')).not.toBeVisible();
  });

  test('debe permitir a un admin ver el panel de administración', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@fiq.uncp.edu.pe');
    await page.getByLabel('Contraseña').fill('admin123');
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.locator('header')).toContainText('Administrador PRO');
    
    await page.goto('/admin');
    await expect(page.getByText('Panel Administrativo')).toBeVisible();
    
    await page.getByRole('tab', { name: 'Usuarios' }).click();
    // Verificar que la tabla de usuarios no esté vacía
    await expect(page.locator('table tbody tr')).not.toHaveCount(0);
  });
});
