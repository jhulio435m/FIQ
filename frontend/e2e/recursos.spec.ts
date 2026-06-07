import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Flujo de Gestión de Recursos Académicos', () => {
  test('debe permitir a un usuario autorizado subir un recurso y a un admin aprobarlo', async ({ page }) => {
    // 1. Iniciar sesión como administrador (quien tiene permisos de Docente/Admin para subir)
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@fiq.uncp.edu.pe');
    await page.getByLabel('Contraseña').fill('admin123');
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.locator('header')).toContainText('Administrador PRO');

    // 2. Navegar a la Biblioteca
    await page.goto('/biblioteca');
    await expect(page.getByText('Biblioteca Virtual')).toBeVisible();

    // 3. Abrir diálogo de subida de recurso
    await page.getByRole('button', { name: 'Subir Recurso' }).click();
    await expect(page.getByText('Subir Recurso Académico')).toBeVisible();

    // 4. Cargar archivo simulado
    const pdfPath = path.resolve(__dirname, '../../documento de prueba.pdf');
    const mockPdfBuffer = fs.readFileSync(pdfPath);
    await page.setInputFiles('input[type="file"]', {
      name: 'documento_de_prueba.pdf',
      mimeType: 'application/pdf',
      buffer: mockPdfBuffer,
    });

    // 5. Completar metadatos del recurso
    const recursoTitulo = `Prueba E2E Automatizada ${Date.now()}`;
    await page.getByLabel('Título del Recurso').fill(recursoTitulo);
    
    // Seleccionar tipo de recurso "Guía de laboratorio"
    const form = page.locator('form');
    await form.locator('button', { hasText: /^Tipo/ }).click();
    await page.getByRole('option', { name: 'Guía de laboratorio' }).click();

    // Seleccionar curso "Química General"
    await form.locator('button', { hasText: /^Curso/ }).click();
    await page.getByRole('option', { name: 'Química General' }).click();

    // Rellenar resumen
    await page.getByLabel('Resumen (Opcional)').fill('Resumen automático generado por la prueba E2E de Playwright.');

    // 6. Enviar formulario
    await page.getByRole('button', { name: 'Iniciar Subida' }).click();

    // 7. Verificar pantalla de éxito
    await expect(page.getByText('¡Subida Completada!')).toBeVisible({ timeout: 10000 });

    // Esperar a que el diálogo se cierre automáticamente
    await expect(page.getByText('Subir Recurso Académico')).not.toBeVisible({ timeout: 5000 });

    // 8. Navegar al Panel Administrativo
    await page.goto('/admin');
    await expect(page.getByText('Panel Administrativo')).toBeVisible();

    // Asegurarse de estar en la pestaña de Pendientes
    await page.getByRole('tab', { name: 'Pendientes' }).click();

    // 9. Verificar que el recurso recién subido esté en la lista
    const recursoFila = page.locator('tr', { hasText: recursoTitulo });
    await expect(recursoFila).toBeVisible({ timeout: 10000 });

    // 10. Aprobar el recurso y comprobar que desaparece de la lista
    await recursoFila.getByRole('button', { name: 'Aprobar' }).click();
    await expect(page.getByText('Recurso aprobado')).toBeVisible();

    // El recurso ya no debería estar en la lista de pendientes
    await expect(recursoFila).not.toBeVisible({ timeout: 5000 });
  });
});
