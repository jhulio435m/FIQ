import { test, expect } from '@playwright/test';

test.describe('Flujo de Laboratorios Interactivos', () => {
  test('debe cargar la lista de laboratorios y mostrar su información', async ({ page }) => {
    await page.goto('/laboratorios');
    await expect(page.getByText('Laboratorios Interactivos')).toBeVisible();
    await expect(page.getByText('Simulaciones organizadas por nivel de dificultad')).toBeVisible();

    // Esperar a que las tarjetas de laboratorios se carguen
    const labCards = page.locator('.grid.md\\:grid-cols-2 .group');
    await expect(labCards.first()).toBeVisible({ timeout: 10000 });

    // Verificar que haya al menos uno de los laboratorios esperados (de seed.py)
    await expect(page.getByText('Operaciones Unitarias I')).toBeVisible();
    await expect(page.getByText('Cinética Química')).toBeVisible();
    await expect(page.getByText('Termodinámica')).toBeVisible();
    await expect(page.getByText('Reactores Químicos')).toBeVisible();

    // Verificar insignias de dificultad
    await expect(page.getByText('Básico').first()).toBeVisible();
    await expect(page.getByText('Intermedio').first()).toBeVisible();
    await expect(page.getByText('Avanzado').first()).toBeVisible();
  });
});
