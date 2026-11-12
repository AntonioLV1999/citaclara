import { expect, test } from '@playwright/test';
import { auditarPantalla, entrar } from './ayudas.js';

/** FR-020: contraste de cada barra con el fondo de su fila, y etiqueta escrita en cada fila. */
function auditarGraficos(page) {
  return page.evaluate(() => {
    const canales = (color) => color.match(/[\d.]+/g).map(Number);
    const opaco = (color) => (canales(color)[3] ?? 1) > 0;
    function fondoDe(elemento) {
      for (let e = elemento; e; e = e.parentElement) {
        const { backgroundColor } = getComputedStyle(e);
        if (opaco(backgroundColor)) return backgroundColor;
      }
      return 'rgb(255, 255, 255)';
    }
    function luminancia(color) {
      const [r, g, b] = canales(color).slice(0, 3).map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const contraste = (a, b) => {
      const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
      return (claro + 0.05) / (oscuro + 0.05);
    };
    const barras = [...document.querySelectorAll('.grafico__barra')];
    const pocoContraste = barras
      .map((barra) => contraste(getComputedStyle(barra).backgroundColor, fondoDe(barra.parentElement)))
      .filter((valor) => valor < 3);
    const sinOcultar = barras.filter((barra) => barra.getAttribute('aria-hidden') !== 'true').length;
    const filasSinEtiqueta = [...document.querySelectorAll('.grafico tr')]
      .filter((fila) => !fila.querySelector('th')?.innerText.trim() || !fila.querySelector('.grafico__cifra')?.innerText.trim()).length;
    return { barras: barras.length, pocoContraste, sinOcultar, filasSinEtiqueta };
  });
}

test.describe('panel de analítica', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page);
  });

  test('004/H5-E1 en el navegador, «Analítica» del menú abre el panel sin pedir nada más', async ({ page }) => {
    await page.getByRole('link', { name: 'Analítica' }).click();
    await expect(page).toHaveURL(/\/analitica$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Analítica' })).toBeVisible();
    await expect(page.getByText('Del 07/09/2026 al 01/11/2026', { exact: false })).toBeVisible();
  });

  test('004/H5-E7 004/SC-007 los gráficos y sus cifras se leen sin desplazamiento horizontal, con contraste y tamaños', async ({ page }) => {
    await page.goto('/analitica');
    const { desbordamiento, pequenos, pocoContraste, controles, textos } = await auditarPantalla(page);
    expect(controles, 'la auditoría debe ver controles').toBeGreaterThan(0);
    expect(textos, 'la auditoría debe ver textos').toBeGreaterThan(0);
    expect(desbordamiento, 'desplazamiento horizontal').toEqual([]);
    expect(pequenos, 'controles de menos de 44 × 44').toEqual([]);
    expect(pocoContraste, 'contraste por debajo de 4,5:1').toEqual([]);
  });

  test('004/FR-020 las barras contrastan al menos 3:1 y cada fila nombra lo que mide', async ({ page }) => {
    await page.goto('/analitica');
    const { barras, pocoContraste, filasSinEtiqueta } = await auditarGraficos(page);
    expect(barras).toBeGreaterThan(50);
    expect(pocoContraste, 'barras por debajo de 3:1').toEqual([]);
    expect(filasSinEtiqueta, 'filas de gráfico sin etiqueta o sin cifra').toBe(0);
  });

  test('004/FR-019 cada cifra se lee como texto sin pasar el ratón, y las barras no duplican lo que lee el lector de pantalla', async ({ page }) => {
    await page.goto('/analitica');
    const { sinOcultar } = await auditarGraficos(page);
    expect(sinOcultar).toBe(0);
    const ingresos = page.getByRole('table', { name: /^Ingresos por servicio/ });
    await expect(ingresos.getByRole('row', { name: /Sesión de fisioterapia/ })).toContainText('220 citas · 8.800,00 €');
    await expect(page.getByRole('table', { name: /^Tasa de no asistencia Escala/ }).getByRole('row', { name: /Lucía/ })).toContainText('13,7 %');
    await expect(page.getByText('Total del periodo: 15.380,00 €')).toBeVisible();
  });

  test('004/FR-021 todas las escalas de los gráficos empiezan en cero', async ({ page }) => {
    await page.goto('/analitica');
    const escalas = await page.locator('.grafico__escala').allInnerTexts();
    expect(escalas.length).toBe(8);
    for (const escala of escalas) expect(escala).toMatch(/^(Escala de 0 % a \d+ %|Escala desde 0,00 €)$/);
  });
});
