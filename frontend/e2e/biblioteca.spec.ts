import { test, expect } from '@playwright/test';

test.describe('Flujo de Biblioteca y Descargas', () => {
  
  test('debe permitir navegar la biblioteca y ver detalles sin estar logueado', async ({ page }) => {
    await page.goto('/biblioteca');
    await expect(page.getByText('Biblioteca Virtual')).toBeVisible();
    await expect(page.getByText(/resultado/)).toBeVisible({ timeout: 15000 });
    
    // Click en la primera tarjeta
    await page.getByRole('button', { name: /^Abrir recurso:/ }).first().click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Iniciar Sesión para Descargar')).toBeVisible();
    await expect(page).toHaveURL(/\/biblioteca\/recurso\/\d+/);
    await expect(page.getByRole('button', { name: 'Copiar enlace permanente' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ediciones y formatos' })).toBeVisible();
    await expect(page.getByText(/PDF · actual/)).toBeVisible();

    await page.reload();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('debe redirigir al login al intentar descargar sin sesión', async ({ page }) => {
    await page.goto('/biblioteca');
    await page.getByRole('button', { name: /^Abrir recurso:/ }).first().click();
    
    await page.getByText('Iniciar Sesión para Descargar').click();
    
    // Esperar a que cambie la URL al login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('debe permitir login y descarga exitosa', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo institucional').fill('admin@fiq.uncp.edu.pe');
    await page.getByLabel('Contraseña').fill('admin123');
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();
    
    await expect(page.locator('header')).toContainText('Administrador PRO');
    
    await page.goto('/biblioteca');
    await expect(page.getByText(/resultado/)).toBeVisible();
    
    await page.getByRole('button', { name: /^Abrir recurso:/ }).first().click();
    const downloadBtn = page.getByText('Descargar PDF');
    await expect(downloadBtn).toBeVisible();
    
    await downloadBtn.click();
    await expect(page.getByText('Error')).not.toBeVisible();
  });

  test('debe guardar un favorito y mostrarlo en Mi biblioteca', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo institucional').fill('admin@fiq.uncp.edu.pe');
    await page.getByLabel('Contraseña').fill('admin123');
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.locator('header')).toContainText('Administrador PRO');

    await page.goto('/biblioteca');
    const firstCard = page.getByRole('button', { name: /^Abrir recurso:/ }).first();
    const resourceTitle = (await firstCard.getAttribute('aria-label'))?.replace('Abrir recurso: ', '') ?? '';
    await firstCard.click();
    const match = page.url().match(/\/biblioteca\/recurso\/(\d+)/);
    expect(match).not.toBeNull();
    const resourceId = match?.[1] ?? '';

    try {
      await page.getByRole('button', { name: 'Añadir a favoritos' }).click();
      await expect(page.getByRole('button', { name: 'Guardado en favoritos' })).toBeVisible();
      await page.goto('/mi-biblioteca');
      await expect(page.getByRole('heading', { name: 'Mi biblioteca' })).toBeVisible();
      await expect(page.getByText(resourceTitle, { exact: true })).toBeVisible();
    } finally {
      if (resourceId) {
        await page.goto(`/biblioteca/recurso/${resourceId}`);
        await page.getByRole('button', { name: 'Guardado en favoritos' }).click();
      }
    }
  });

  test('debe usar un solo buscador y alternar entre local y APIs', async ({ page }) => {
    await page.goto('/biblioteca');

    await expect(page.getByRole('textbox')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Biblioteca local' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'APIs académicas' }).click();

    await expect(page.getByRole('textbox')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Fuentes externas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'APIs académicas' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('debe cargar portadas reales al buscar libros en APIs académicas', async ({ page }) => {
    await page.goto('/biblioteca');
    await page.getByRole('textbox').fill('quimica');
    await page.getByRole('button', { name: 'APIs académicas' }).click();

    const cover = page.getByRole('img', { name: /^Portada de / }).first();
    await expect(cover).toBeVisible({ timeout: 15000 });
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  });

  test('debe permitir a un admin ver el panel de administración', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo institucional').fill('admin@fiq.uncp.edu.pe');
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
