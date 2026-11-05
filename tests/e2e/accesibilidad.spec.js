import { expect, test } from '@playwright/test';
import { auditarPantalla, entrar, HOY } from './ayudas.js';

async function comprobar(page) {
  const { desbordamiento, pequenos, pocoContraste, controles, textos } = await auditarPantalla(page);
  expect(controles, 'la auditoría debe ver controles').toBeGreaterThan(0);
  expect(textos, 'la auditoría debe ver textos').toBeGreaterThan(0);
  expect(desbordamiento, 'desplazamiento horizontal').toEqual([]);
  expect(pequenos, 'controles de menos de 44 × 44').toEqual([]);
  expect(pocoContraste, 'contraste por debajo de 4,5:1').toEqual([]);
}

test('SC-007 FR-028 pantalla de acceso', async ({ page }) => {
  await page.goto('/acceso');
  await comprobar(page);
});

test('SC-007 FR-028 pantalla de acceso con clave incorrecta', async ({ page }) => {
  await page.goto('/acceso');
  await page.getByLabel('Clave de la clínica').fill('clave-mala');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await comprobar(page);
});

test.describe('con sesión', () => {
  test.beforeEach(async ({ page }) => { await entrar(page); });

  test('H2-E5 SC-007 FR-028 agenda de hoy', async ({ page }) => {
    await comprobar(page);
  });

  test('H2-E5 FR-028 en la agenda se puede cambiar de profesional y de día sin desplazar', async ({ page }) => {
    await page.getByRole('link', { name: 'Jorge' }).click();
    await expect(page.getByRole('heading', { name: 'Agenda de Jorge' })).toBeVisible();
    await page.getByRole('link', { name: 'Día siguiente' }).click();
    await expect(page.getByText('Jueves 05/11/2026')).toBeVisible();
    await comprobar(page);
  });

  test('SC-007 FR-028 agenda de un día pasado con todos los estados', async ({ page }) => {
    for (const dia of ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11']) {
      await page.goto(`/agenda?dia=${dia}`);
      await comprobar(page);
    }
  });

  test('SC-007 FR-028 agenda de un día sin apertura', async ({ page }) => {
    await page.goto('/agenda?dia=2026-11-07');
    await expect(page.getByText('La clínica no abre este día.')).toBeVisible();
    await comprobar(page);
  });

  test('SC-007 FR-028 formulario de alta', async ({ page }) => {
    await page.goto('/citas/nueva');
    await comprobar(page);
  });

  test('SC-007 FR-028 formulario de alta con resultados de búsqueda', async ({ page }) => {
    await page.goto('/citas/nueva');
    await page.getByLabel('Buscar por nombre o teléfono').fill('000 100');
    await expect(page.locator('[data-paciente]').first()).toBeVisible();
    await comprobar(page);
  });

  test('SC-007 FR-028 formulario de alta rechazado, con los huecos actuales', async ({ page }) => {
    await page.goto(`/citas/nueva?dia=${HOY}&hora=09:00`);
    await page.getByRole('button', { name: 'Reservar cita' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Huecos libres/ })).toBeVisible();
    await comprobar(page);
  });

  test('SC-007 FR-028 confirmación de una acción y rechazo posterior', async ({ page }) => {
    await page.goto('/agenda?dia=2026-11-12');
    await page.getByRole('link', { name: 'Cancelar' }).first().click();
    await expect(page.getByText('Esta acción no se puede deshacer.')).toBeVisible();
    await comprobar(page);

    const url = new URL(page.url());
    await page.goto(url.pathname.concat('?accion=completar'));
    await page.getByRole('button', { name: 'Sí, confirmar' }).click();
    await expect(page.getByRole('alert')).toContainText('todavía no ha empezado');
    await comprobar(page);
  });

  test('SC-007 FR-028 página de error de algo que no existe', async ({ page }) => {
    await page.goto('/no-existe');
    await expect(page.getByRole('alert')).toBeVisible();
    await comprobar(page);
  });
});
