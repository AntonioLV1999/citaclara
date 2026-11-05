import { expect } from '@playwright/test';

export const HOY = '2026-11-04';

export async function entrar(page) {
  await page.goto('/acceso');
  await page.getByLabel('Clave de la clínica').fill('eleva-demo');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/agenda/);
}

/** Primer hueco reservable de al menos una hora: ahí cabe cualquier servicio. */
export async function huecoLargo(page) {
  const huecos = page.locator('.hueco').filter({ has: page.getByRole('link', { name: 'Reservar' }) });
  for (let i = 0; i < await huecos.count(); i += 1) {
    const hueco = huecos.nth(i);
    const [inicio, fin] = (await hueco.locator('.hueco__tramo').innerText()).match(/\d\d:\d\d/g);
    const minutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
    if (minutos(fin) - minutos(inicio) >= 60) return { enlace: hueco.getByRole('link', { name: 'Reservar' }), inicio };
  }
  throw new Error('No hay ningún hueco de una hora en este día');
}

export function sumarAHora(hora, minutos) {
  const total = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3)) + minutos;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Comprueba en la página los umbrales de FR-028 y devuelve lo que los incumpla. */
export function auditarPantalla(page) {
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
    function contraste(a, b) {
      const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
      return (claro + 0.05) / (oscuro + 0.05);
    }
    const visible = (e) => {
      const { width, height } = e.getBoundingClientRect();
      return width > 0 && height > 0 && getComputedStyle(e).visibility !== 'hidden';
    };
    const describir = (e) => `${e.tagName.toLowerCase()}.${e.className}: ${(e.innerText ?? e.name ?? '').slice(0, 40)}`;

    const raiz = document.documentElement;
    const desbordamiento = raiz.scrollWidth > raiz.clientWidth ? [`${raiz.scrollWidth} > ${raiz.clientWidth}`] : [];

    const controles = [...document.querySelectorAll('a, button, select, input:not([type="hidden"])')].filter(visible);
    const pequenos = controles.flatMap((e) => {
      const { width, height } = e.getBoundingClientRect();
      return width < 44 || height < 44 ? [`${describir(e)} (${width} × ${height})`] : [];
    });

    const conTexto = [...document.body.querySelectorAll('*')].filter((e) => visible(e)
      && ([...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
        || e.matches('select, input:not([type="hidden"])')));
    const pocoContraste = conTexto.flatMap((e) => {
      const ratio = contraste(getComputedStyle(e).color, fondoDe(e));
      return ratio < 4.5 ? [`${describir(e)} (${ratio.toFixed(2)})`] : [];
    });

    return { desbordamiento, pequenos, pocoContraste, controles: controles.length, textos: conTexto.length };
  });
}
