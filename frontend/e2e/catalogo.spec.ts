import { test, expect } from '@playwright/test';

// Usa el recurso del seed: "Documento de prueba" (Libro, Química General).
test.describe('Búsqueda del catálogo', () => {
  test('busca sin importar tildes, guarda la búsqueda en la URL y la conserva al recargar', async ({ page }) => {
    await page.goto('/biblioteca');
    await page.getByRole('searchbox', { name: 'Buscar en la biblioteca' }).fill('DOCUMENTO prueba');

    await expect(page).toHaveURL(/q=DOCUMENTO\+prueba/);
    await expect(page.getByRole('button', { name: /Ver detalle de Documento de prueba/ })).toBeVisible();
    await expect(page.locator('mark').first()).toHaveText(/documento/i);

    await page.reload();
    await expect(page.getByRole('searchbox', { name: 'Buscar en la biblioteca' })).toHaveValue('DOCUMENTO prueba');
    await expect(page.getByRole('button', { name: /Ver detalle de Documento de prueba/ })).toBeVisible();
  });

  test('filtra por tipo con facetas y permite quitar el filtro', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/biblioteca');

    await page.getByRole('complementary', { name: 'Filtros' }).getByRole('button', { name: /^Libro\s*\d+$/ }).click();
    await expect(page).toHaveURL(/tipo=1/);
    const chip = page.getByRole('button', { name: 'Quitar filtro Libro' });
    await expect(chip).toBeVisible();

    await chip.click();
    await expect(page).not.toHaveURL(/tipo=/);
  });

  test('sin resultados ofrece borrar la búsqueda', async ({ page }) => {
    await page.goto('/biblioteca?q=zzzznoexiste');
    await expect(page.getByText(/No encontramos recursos para «zzzznoexiste»/)).toBeVisible();

    await page.getByRole('button', { name: 'Borrar búsqueda', exact: true }).click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(page.getByText(/Mostrando \d+–\d+ de \d+ recurso/)).toBeVisible();
  });
});
