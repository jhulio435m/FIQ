import { test, expect } from '@playwright/test';

test.describe('Flujo de Perfil de Usuario', () => {
  test('debe redirigir al login al intentar acceder sin estar autenticado', async ({ page }) => {
    await page.goto('/perfil');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('debe permitir ver y actualizar el perfil del usuario autenticado', async ({ page }) => {
    // 1. Iniciar sesión
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@fiq.uncp.edu.pe');
    await page.getByLabel('Contraseña').fill('admin123');
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.locator('header')).toContainText('Administrador PRO');

    // 2. Ir a perfil
    await page.goto('/perfil');
    await expect(page.getByText('Mi Perfil')).toBeVisible();
    await expect(page.getByText('Gestiona tu información personal')).toBeVisible();

    // 3. Verificar que los inputs tengan los valores actuales
    const nombreInput = page.getByLabel('Nombre Completo');
    const emailInput = page.getByLabel('Correo Institucional');

    await expect(nombreInput).toHaveValue('Administrador PRO');
    await expect(emailInput).toHaveValue('admin@fiq.uncp.edu.pe');

    // 4. Modificar el nombre
    const nuevoNombre = 'Administrador Modificado E2E';
    await nombreInput.fill(nuevoNombre);
    
    // Guardar cambios
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    // Esperar toast de éxito
    await expect(page.getByText('Perfil actualizado')).toBeVisible();

    // 5. Verificar que el header se actualice con el nuevo nombre
    await expect(page.locator('header')).toContainText(nuevoNombre);

    // 6. Restaurar el nombre original para evitar romper otros tests
    await page.goto('/perfil');
    await nombreInput.fill('Administrador PRO');
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByText('Perfil actualizado')).toBeVisible();
  });
});
