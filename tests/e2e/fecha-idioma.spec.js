import { expect, test } from '@playwright/test';
import { entrar, huecoLargo } from './ayudas.js';

// `locale` de Playwright no cambia cómo pinta Chromium sus controles: hace falta `--lang`.
test.use({ launchOptions: { args: ['--lang=en-US'] } });

test('FR-024 con el navegador en inglés las fechas de los campos siguen siendo dd/mm/aaaa', async ({ page }) => {
  await entrar(page);
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
  await expect(page.getByLabel('Ir a otro día')).toHaveValue('04/11/2026');
  await page.getByRole('link', { name: 'Reservar' }).first().click();
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
  await expect(page.getByLabel('Día (dd/mm/aaaa)')).toHaveValue('04/11/2026');
});

test('FR-027 con el navegador en inglés los avisos del alta siguen en español', async ({ page }) => {
  await entrar(page);
  const { enlace } = await huecoLargo(page);
  await enlace.click();
  await page.locator('[name="paciente_nombre"]').fill('Rosa Prieto');
  await page.locator('[name="paciente_telefono"]').fill('000 100 999');
  await page.getByLabel('Correo electrónico (opcional)').fill('sin-arroba');
  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page.getByRole('alert')).toHaveText('Ese correo no parece válido. Revísalo o déjalo en blanco.');
});

test('FR-027 con el navegador en inglés la clave vacía se explica en español', async ({ page }) => {
  await page.goto('/acceso');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('La clave no es correcta. Revísala e inténtalo de nuevo.');
});
