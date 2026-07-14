import { test, expect } from '@playwright/test';

test.describe('Flujo de Laboratorios Interactivos', () => {
  test('debe cargar la lista de laboratorios y mostrar su información', async ({ page }) => {
    await page.goto('/laboratorios');
    await expect(page.getByText('Laboratorios Interactivos')).toBeVisible();
    await expect(page.getByText('Simuladores de ingeniería química con parámetros modificables y resultados en tiempo real.')).toBeVisible();

    // Esperar a que los módulos y el simulador activo se carguen
    const labCards = page.locator('aside button');
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

    await expect(page.getByText('Objetivo')).toBeVisible();
    await expect(page.getByText('Reflexión').first()).toBeVisible();
    await page.getByRole('button', { name: /Completar/i }).click();
    await expect(page.getByText(/Completado/)).toBeVisible();
  });
});
