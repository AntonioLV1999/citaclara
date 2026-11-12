import { expect, test } from '@playwright/test';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';

// Servidor del portal: semilla por defecto y reloj del 04/11/2026 a las 12:00 (servidor-portal-e2e.js).
const { pacientes } = generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO });
const enlaceDe = (nombre) => `/e/${pacientes.find((p) => p.nombre === nombre).enlace}`;

test('002/H2-E6 002/FR-022 en 360 × 640, la próxima cita de Isabel Navarro y su «Cancelar» se ven sin desplazarse', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto(enlaceDe('Isabel Navarro'));
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole('heading', { name: 'Tus citas' })).toBeVisible();

  const primera = page.locator('#proximas .cita-portal').first();
  await expect(primera).toContainText('mié 04/11/2026, 15:15–16:00');
  const cancelar = primera.getByRole('link', { name: 'Cancelar' });
  await expect(cancelar).toBeInViewport({ ratio: 1 });
  const caja = await primera.boundingBox();
  expect(caja.y + caja.height).toBeLessThanOrEqual(640);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(ancho).toBeLessThanOrEqual(360);
});

// Cada proyecto cancela una cita distinta: comparten servidor y datos.
const CANCELABLE = {
  'portal-movil': { nombre: 'Javier Peña', tramo: 'vie 06/11/2026, 12:30–13:00' },
  'portal-portatil': { nombre: 'Isabel Serrano', tramo: 'lun 09/11/2026, 10:30–11:00' },
};

test('002/H3-E2 desde el móvil, el paciente cancela una cita y la ve en su historial como cancelada por él', async ({ page }, info) => {
  const { nombre, tramo } = CANCELABLE[info.project.name];
  await page.goto(enlaceDe(nombre));
  const tarjeta = page.locator('#proximas .cita-portal').filter({ hasText: tramo });
  await tarjeta.getByRole('link', { name: 'Cancelar' }).click();

  await expect(page.getByRole('heading', { name: '¿Cancelar esta cita?' })).toBeVisible();
  await expect(page.getByText('Si la cancelas, no se puede deshacer.')).toBeVisible();
  await page.getByRole('button', { name: 'Sí, cancelar la cita' }).click();

  await expect(page.getByRole('heading', { name: 'Cita cancelada' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver a mis citas' }).click();
  const enHistorial = page.locator('#historial .cita-portal').filter({ hasText: tramo });
  await expect(enHistorial).toContainText('Cancelada por el paciente el 04/11/2026 a las 12:00');
  await expect(page.locator('#proximas').getByText(tramo)).toHaveCount(0);
});
