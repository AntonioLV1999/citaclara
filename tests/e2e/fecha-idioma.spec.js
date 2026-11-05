import { expect, test } from '@playwright/test';
import { entrar } from './ayudas.js';

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
