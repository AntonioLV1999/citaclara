import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { auditarPantalla } from './ayudas.js';
import { ENLACES_E2E } from './enlaces-e2e.js';

// Servidor propio, con el reloj del 04/11/2026 a las 10:00 y los recordatorios de las ejecuciones del
// 03/11 y del 04/11 (servidor-correo-e2e.js). Cada proyecto cancela citas distintas; la de fuera de
// plazo no cambia, y la comparten.
const CITAS = {
  'correo-movil': { confirmar: 'Sergio Fernández', sinJavaScript: 'Javier Muñoz' },
  'correo-portatil': { confirmar: 'Óscar García', sinJavaScript: 'Javier Peña' },
};
const FUERA_DE_PLAZO = 'Isabel Serrano';
const enlace = (nombre) => {
  const ruta = JSON.parse(readFileSync(ENLACES_E2E, 'utf8'))[nombre];
  if (!ruta) throw new Error(`No hay recordatorio de ${nombre}`);
  return ruta;
};

/** FR-028 de la 001: sin desplazamiento horizontal, contraste de 4,5:1 y controles de 44 × 44. */
async function comprobar(page) {
  const { desbordamiento, pequenos, pocoContraste, controles, textos } = await auditarPantalla(page);
  expect(controles, 'la auditoría debe ver controles').toBeGreaterThan(0);
  expect(textos, 'la auditoría debe ver textos').toBeGreaterThan(0);
  expect(desbordamiento, 'desplazamiento horizontal').toEqual([]);
  expect(pequenos, 'controles de menos de 44 × 44').toEqual([]);
  expect(pocoContraste, 'contraste por debajo de 4,5:1').toEqual([]);
}

test('003/H2-E9 003/FR-017 confirmación, «Cita cancelada» y «ya está cancelada», legibles y manejables', async ({ page }, info) => {
  const ruta = enlace(CITAS[info.project.name].confirmar);
  await page.goto(ruta);
  await expect(page).toHaveURL(/\/cancelar$/);
  await expect(page.getByRole('heading', { name: 'Cancelar tu cita' })).toBeVisible();
  await expect(page.getByText('No se puede deshacer.')).toBeVisible();
  await comprobar(page);

  await page.getByRole('button', { name: 'Sí, cancelar la cita' }).click();
  await expect(page.getByRole('heading', { name: 'Cita cancelada' })).toBeVisible();
  await comprobar(page);

  await page.goto(ruta);
  await expect(page.getByRole('heading', { name: 'Esta cita ya está cancelada' })).toBeVisible();
  await expect(page.getByRole('button', { name: /cancelar/i })).toHaveCount(0);
  await comprobar(page);
});

test('003/H2-E9 003/FR-017 fuera de plazo, con el teléfono de la clínica como enlace de llamada', async ({ page }) => {
  await page.goto(enlace(FUERA_DE_PLAZO));
  await expect(page.getByRole('heading', { name: 'Ya no se puede cancelar desde aquí' })).toBeVisible();
  const telefono = page.locator('main').getByRole('link', { name: '000 200 000' });
  await expect(telefono).toHaveAttribute('href', 'tel:000200000');
  await comprobar(page);
});

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('003/H2-E9 003/FR-017 abrir el enlace, confirmar y ver «Cita cancelada» funciona sin JavaScript', async ({ page }, info) => {
    await page.goto(enlace(CITAS[info.project.name].sinJavaScript));
    await expect(page.getByRole('heading', { name: 'Cancelar tu cita' })).toBeVisible();
    await page.getByRole('button', { name: 'Sí, cancelar la cita' }).click();
    await expect(page.getByRole('heading', { name: 'Cita cancelada' })).toBeVisible();
    await expect(page.getByText('Gracias por avisar.')).toBeVisible();
  });
});
