import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Flujo de Gestión de Recursos Académicos', () => {
  test('debe permitir a un usuario autorizado subir un recurso y a un admin aprobarlo', async ({ page }) => {
    // 1. Iniciar sesión como administrador (quien tiene permisos de Docente/Admin para subir)
    await page.goto('/login');
    await page.getByLabel('Correo institucional').fill('admin@fiq.uncp.edu.pe');
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
    const pdfPath = path.resolve(process.cwd(), '../backend/seed_files/documento_de_prueba.pdf');
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

    // 8. El autor lo ve "En revisión" en Mis recursos
    await page.goto('/mis-recursos');
    const tarjeta = page.locator('li', { hasText: recursoTitulo });
    await expect(tarjeta.getByText('En revisión')).toBeVisible({ timeout: 10000 });

    // 9. El admin pide cambios con un comentario
    await page.goto('/admin');
    await expect(page.getByText('Panel Administrativo')).toBeVisible();
    await page.getByRole('list', { name: 'Cola de moderación' }).getByRole('button', { name: recursoTitulo }).click();
    const revision = page.getByRole('region', { name: `Revisión de ${recursoTitulo}` });
    await revision.getByRole('button', { name: 'Pedir cambios' }).click();
    const comentario = 'Agrega los autores y el año de publicación.';
    await page.getByLabel('Qué debe corregir').fill(comentario);
    await page.getByRole('button', { name: 'Enviar observación' }).click();
    await expect(page.getByText('Observación enviada al autor')).toBeVisible();

    // 10. El autor ve el comentario, corrige y reenvía con una nota
    await page.goto('/mis-recursos');
    await expect(tarjeta.getByText('Requiere cambios')).toBeVisible();
    await expect(tarjeta.getByText(comentario)).toBeVisible();
    await tarjeta.getByRole('button', { name: 'Corregir y reenviar' }).click();
    const nota = 'Completé autores y año.';
    await page.getByLabel(/Nota para el revisor/).fill(nota);
    await page.getByRole('button', { name: 'Reenviar a revisión' }).click();
    await expect(page.getByText('Reenviado a revisión')).toBeVisible();
    await expect(tarjeta.getByText('En revisión')).toBeVisible();

    // 11. El admin ve la nota del reenvío y aprueba
    await page.goto('/admin');
    await page.getByRole('list', { name: 'Cola de moderación' }).getByRole('button', { name: recursoTitulo }).click();
    // La nota aparece en el aviso de reenvío (y también en el historial).
    await expect(revision.getByText('Nota del autor al reenviar')).toBeVisible();
    await expect(revision.getByText(nota).first()).toBeVisible();
    await revision.getByRole('button', { name: 'Aprobar y publicar' }).click();
    await expect(page.getByText('Recurso aprobado y publicado')).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Cola de moderación' }).getByRole('button', { name: recursoTitulo }),
    ).not.toBeVisible({ timeout: 5000 });

    // 12. Queda publicado y aparece en la biblioteca
    await page.goto('/mis-recursos');
    await expect(tarjeta.getByText('Publicado')).toBeVisible();
    await page.goto(`/biblioteca?q=${encodeURIComponent(recursoTitulo)}`);
    await expect(page.getByRole('button', { name: `Ver detalle de ${recursoTitulo}` })).toBeVisible();
  });
});
