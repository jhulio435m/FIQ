import { test, expect } from '@playwright/test';

test.describe('Flujo de Biblioteca y Descargas', () => {
  
  test('debe permitir navegar la biblioteca y ver detalles sin estar logueado', async ({ page }) => {
    // 1. Ir a la biblioteca
    await page.goto('/biblioteca');
    
    // 2. Verificar que el título es visible
    await expect(page.locator('h1')).toContainText('Biblioteca Virtual');
    
    // 3. Esperar a que carguen los recursos (usando el texto de conteo)
    await expect(page.locator('text=encontrado')).toBeVisible({ timeout: 10000 });
    
    // 4. Hacer click en el primer recurso (ResourceCard)
    const firstCard = page.locator('.cursor-pointer').first();
    await firstCard.click();
    
    // 5. Verificar que se abre el modal de detalle
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('button:has-text("Iniciar Sesión para Descargar")')).toBeVisible();
  });

  test('debe redirigir al login al intentar descargar sin sesión', async ({ page }) => {
    await page.goto('/biblioteca');
    await expect(page.locator('text=encontrado')).toBeVisible();
    
    await page.locator('.cursor-pointer').first().click();
    await expect(page.locator('role=dialog')).toBeVisible();
    
    // Click en el botón de descarga bloqueado
    await page.click('button:has-text("Iniciar Sesión para Descargar")');
    
    // Verificar toast de error (ajustar selector si es necesario)
    await expect(page.locator('text=Debe iniciar sesión para descargar')).toBeVisible();
    
    // Verificar redirección al login
    await expect(page).toHaveURL(/\/login/);
  });

  test('debe permitir login y descarga exitosa', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@fiq.uncp.edu.pe');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Verificar que estamos dentro (el header debe mostrar el nombre)
    await expect(page.locator('text=Administrador PRO')).toBeVisible();
    
    // 2. Ir a biblioteca y descargar
    await page.goto('/biblioteca');
    await expect(page.locator('text=encontrado')).toBeVisible();
    
    await page.locator('.cursor-pointer').first().click();
    await expect(page.locator('role=dialog')).toBeVisible();
    
    // El botón ahora debe decir "Descargar PDF"
    const downloadBtn = page.locator('button:has-text("Descargar PDF")');
    await expect(downloadBtn).toBeVisible();
    
    // Al hacer click, Playwright puede interceptar la descarga o el cambio de URL
    await downloadBtn.click();
    
    // El contador de descargas debería actualizarse (podemos verificar que la query se invalida/recarga)
    // Pero para un test E2E básico, verificamos que no hubo error 401
    await expect(page.locator('text=Error')).not.toBeVisible();
  });

  test('debe permitir a un admin ver el panel de administración', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@fiq.uncp.edu.pe');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Panel Administrativo');
    
    // Verificar que la pestaña de usuarios carga datos
    await page.click('role=tab[name="Usuarios"]');
    await expect(page.locator('text=admin@fiq.uncp.edu.pe')).toBeVisible();
  });
});
