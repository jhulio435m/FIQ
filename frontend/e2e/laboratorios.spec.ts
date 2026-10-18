import { test, expect } from '@playwright/test';

test.describe('Flujo de Soryntel Chemestry (Software de Laboratorio)', () => {
  test('debe cargar la presentación del software, sus módulos y enlaces de descarga', async ({ page }) => {
    await page.goto('/laboratorios');

    await expect(page.getByRole('heading', { name: 'Soryntel Chemestry', level: 1 })).toBeVisible();
    await expect(page.getByText(/suite integral de simulación computacional/i)).toBeVisible();

    // Enlace de descarga oficial (apunta a ejemplo.com)
    const download = page.getByRole('link', { name: /descargar soryntel chemestry/i }).first();
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute('href', 'https://ejemplo.com');

    // Módulos de simulación declarados en el software
    await expect(page.getByText('Destilación Fraccionada')).toBeVisible();
    await expect(page.getByText('Cinética Química y Reactores')).toBeVisible();
    await expect(page.getByText('Equilibrio Líquido-Vapor (ELV)')).toBeVisible();
    await expect(page.getByText('Balances de Materia y Energía')).toBeVisible();

    // Secciones informativas de la página
    await expect(page.getByText('Guía de Instalación Rápida')).toBeVisible();
    await expect(page.getByText('Requisitos del Sistema')).toBeVisible();
    await expect(page.getByRole('heading', { name: '¿Listo para comenzar a simular?' })).toBeVisible();
  });
});
