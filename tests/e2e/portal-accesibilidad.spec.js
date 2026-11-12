import { expect, test } from '@playwright/test';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { auditarPantalla, entrar } from './ayudas.js';

// Servidor del portal: semilla por defecto y reloj del 04/11/2026 a las 12:00 (servidor-portal-e2e.js).
const { pacientes } = generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO });
const enlaceDe = (nombre) => `/e/${pacientes.find((p) => p.nombre === nombre).enlace}`;
const inventado = () => `/e/${[...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')}`;

// Cada proyecto cancela citas distintas: comparten servidor y datos, también con portal-paciente.spec.js.
const CITAS = {
  'portal-movil': {
    hecha: { nombre: 'Paula Iglesias', tramo: 'lun 09/11/2026, 15:00–15:45' },
    porLaClinica: { nombre: 'Javier Ortega', tramo: 'mar 10/11/2026, 12:30–13:00', profesional: 'Lucía', dia: '2026-11-10', hora: '12:30' },
  },
  'portal-portatil': {
    hecha: { nombre: 'Marta Santos', tramo: 'lun 09/11/2026, 18:15–18:45' },
    porLaClinica: { nombre: 'Óscar López', tramo: 'jue 12/11/2026, 14:15–15:00', profesional: 'Jorge', dia: '2026-11-12', hora: '14:15' },
  },
};

/** 002/FR-021 con los umbrales de FR-028 de la 001. Las páginas sin sesión no tienen por qué tener controles. */
async function comprobar(page, { conControles = true } = {}) {
  const { desbordamiento, pequenos, pocoContraste, controles, textos } = await auditarPantalla(page);
  if (conControles) expect(controles, 'la auditoría debe ver controles').toBeGreaterThan(0);
  expect(textos, 'la auditoría debe ver textos').toBeGreaterThan(0);
  expect(desbordamiento, 'desplazamiento horizontal').toEqual([]);
  expect(pequenos, 'controles de menos de 44 × 44').toEqual([]);
  expect(pocoContraste, 'contraste por debajo de 4,5:1').toEqual([]);
}

/** El id de una cita, leído en la agenda de recepción, que enlaza cada cita con el suyo. */
async function idDeCita(browser, { profesional, dia, hora }) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await entrar(page);
  await page.goto(`/agenda?dia=${dia}`);
  await page.getByRole('navigation', { name: 'Cambiar de profesional' }).getByRole('link', { name: profesional }).click();
  const href = await page.locator('.cita').filter({ has: page.locator('.cita__hora', { hasText: new RegExp(`^${hora} a `) }) }).getByRole('link', { name: 'Enlace del paciente' }).getAttribute('href');
  await contexto.close();
  return Number(href.match(/\/citas\/(\d+)\//)[1]);
}

/** Envía el formulario de cancelar aunque la página no lo ofrezca, como haría un envío retrasado. */
async function enviarCancelacion(page, id) {
  const cargada = page.waitForEvent('load');
  await page.evaluate((accion) => {
    const formulario = Object.assign(document.createElement('form'), { method: 'post', action: accion });
    document.body.append(formulario);
    formulario.submit();
  }, `/portal/citas/${id}/cancelar`);
  await cargada;
}

test.describe('002/FR-021 002/SC-007 pantallas del paciente', () => {
  test('002/SC-007 002/FR-021 «Tus citas», la confirmación y «Cita cancelada»', async ({ page }, info) => {
    const { nombre, tramo } = CITAS[info.project.name].hecha;
    await page.goto(enlaceDe(nombre));
    await expect(page.getByRole('heading', { name: 'Tus citas' })).toBeVisible();
    await comprobar(page);
    await page.locator('#proximas .cita-portal').filter({ hasText: tramo }).getByRole('link', { name: 'Cancelar' }).click();
    await expect(page.getByRole('heading', { name: '¿Cancelar esta cita?' })).toBeVisible();
    await comprobar(page);
    await page.getByRole('button', { name: 'Sí, cancelar la cita' }).click();
    await expect(page.getByRole('heading', { name: 'Cita cancelada' })).toBeVisible();
    await comprobar(page);
  });

  test('002/SC-007 002/FR-021 fuera de plazo, en la confirmación y al enviarla, y una cita que ya no se puede cancelar', async ({ page, browser }) => {
    const javier = await idDeCita(browser, { profesional: 'Jorge', dia: '2026-11-04', hora: '12:15' });
    const completada = await idDeCita(browser, { profesional: 'Lucía', dia: '2026-10-30', hora: '12:00' });
    await page.goto(enlaceDe('Javier Peña'));
    await page.goto(`/portal/citas/${javier}/cancelar`);
    await expect(page.getByRole('heading', { name: 'Ya no se puede cancelar desde aquí' })).toBeVisible();
    await comprobar(page);
    await enviarCancelacion(page, javier);
    await expect(page.getByText('Se podía cancelar hasta el mié 04/11/2026 a las 10:15.', { exact: false })).toBeVisible();
    await comprobar(page);

    await page.goto(enlaceDe('David Gil'));
    await enviarCancelacion(page, completada);
    await expect(page.getByRole('heading', { name: 'Esta cita ya no se puede cancelar' })).toBeVisible();
    await comprobar(page);
    await page.goto('/portal/citas/999999/cancelar');
    await expect(page.getByRole('heading', { name: 'No encontramos esa cita' })).toBeVisible();
    await comprobar(page);
  });

  test('002/SC-007 002/FR-021 002/H3-E6 la cita que cancela la clínica con la confirmación abierta', async ({ page, browser }, info) => {
    const cita = CITAS[info.project.name].porLaClinica;
    await page.goto(enlaceDe(cita.nombre));
    await page.locator('#proximas .cita-portal').filter({ hasText: cita.tramo }).getByRole('link', { name: 'Cancelar' }).click();
    await expect(page.getByRole('button', { name: 'Sí, cancelar la cita' })).toBeVisible();

    const recepcion = await browser.newContext();
    const agenda = await recepcion.newPage();
    await entrar(agenda);
    await agenda.goto(`/agenda?dia=${cita.dia}`);
    await agenda.getByRole('navigation', { name: 'Cambiar de profesional' }).getByRole('link', { name: cita.profesional }).click();
    await agenda.locator('.cita').filter({ has: agenda.locator('.cita__hora', { hasText: new RegExp(`^${cita.hora} a `) }) }).getByRole('link', { name: 'Cancelar' }).click();
    await agenda.getByRole('button', { name: 'Sí, confirmar' }).click();
    await recepcion.close();

    await page.getByRole('button', { name: 'Sí, cancelar la cita' }).click();
    await expect(page.getByText('Esta cita ya está cancelada. No tienes que hacer nada más.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tus citas' })).toBeVisible();
    await comprobar(page);
  });

  test('002/SC-007 002/FR-021 «Este enlace no funciona», «Tu sesión ha terminado» y «Has salido»', async ({ page }) => {
    await page.goto(inventado());
    await expect(page.getByRole('heading', { name: 'Este enlace no funciona' })).toBeVisible();
    await comprobar(page, { conControles: false });
    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: 'Tu sesión ha terminado' })).toBeVisible();
    await comprobar(page, { conControles: false });
    await page.goto(enlaceDe('Rocío Marín'));
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByRole('heading', { name: 'Has salido' })).toBeVisible();
    await comprobar(page, { conControles: false });
  });

  test('002/SC-007 002/FR-021 «Demasiados intentos»', async ({ page }) => {
    // Desde [::1], otra dirección de origen: el bloqueo no alcanza al resto de pruebas, que usan 127.0.0.1.
    const origen = 'http://[::1]:3101';
    for (let i = 0; i < 11; i += 1) {
      await page.goto(`${origen}${inventado()}`);
      if (await page.getByRole('heading', { name: 'Demasiados intentos' }).count()) break;
    }
    await expect(page.getByRole('heading', { name: 'Demasiados intentos' })).toBeVisible();
    await comprobar(page, { conControles: false });
  });
});

test.describe('002/FR-021 002/SC-007 pantallas nuevas de recepción', () => {
  test.beforeEach(async ({ page }) => { await entrar(page); });

  test('002/SC-007 002/FR-021 «Enlace de…», su anulación y la agenda con la lista de huecos liberados', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Huecos liberados por pacientes' })).toBeVisible();
    await comprobar(page);
    await page.getByRole('link', { name: 'Enlace del paciente' }).first().click();
    await expect(page.getByRole('heading', { name: /^Enlace de / })).toBeVisible();
    await comprobar(page);
    await page.getByRole('link', { name: 'Anular este enlace' }).click();
    await expect(page.getByRole('heading', { name: /^¿Anular el enlace de / })).toBeVisible();
    await comprobar(page);
  });
});

test('002/SC-007 002/FR-010 002/CL Reloj del móvil equivocado o paciente en otra zona horaria: las horas son las mismas', async ({ browser }) => {
  const horas = [];
  for (const timezoneId of ['Europe/Madrid', 'Atlantic/Canary', 'America/New_York']) {
    const contexto = await browser.newContext({ timezoneId });
    const page = await contexto.newPage();
    await page.goto(enlaceDe('David Gil'));
    await expect(page.getByText('Horas en hora peninsular')).toBeVisible();
    horas.push(await page.locator('.cita-portal__tramo').allInnerTexts());
    await contexto.close();
  }
  expect(horas[0]).toContain('lun 09/11/2026, 18:00–18:45');
  expect(horas[1]).toEqual(horas[0]);
  expect(horas[2]).toEqual(horas[0]);
});

test('002/FR-023 con el navegador en inglés, el portal sigue en español', async ({ browser }) => {
  const contexto = await browser.newContext({ locale: 'en-US' });
  const page = await contexto.newPage();
  await page.goto(enlaceDe('David Gil'));
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
  for (const texto of ['Tus citas', 'Próximas citas', 'Historial', 'Horas en hora peninsular', 'Llamar a la clínica: 000 200 000']) {
    await expect(page.getByText(texto, { exact: true }).first()).toBeVisible();
  }
  await page.goto(inventado());
  await expect(page.getByRole('heading', { name: 'Este enlace no funciona' })).toBeVisible();
  await contexto.close();
});
