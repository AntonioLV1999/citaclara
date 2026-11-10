import { expect, test } from '@playwright/test';
import { entrar, HOY, huecoLargo, sumarAHora } from './ayudas.js';

// Los dos proyectos comparten datos: cada uno escribe en días distintos.
const diaDe = (testInfo, movil, portatil) => (testInfo.project.name === 'movil' ? movil : portatil);

async function elegirPacienteBuscando(page, texto) {
  await page.getByLabel('Buscar por nombre o teléfono').fill(texto);
  await page.locator('[data-paciente]').first().click();
  await expect(page.locator('#paciente-nuevo')).toBeHidden();
}

test('H4-E2 escenario 1: sin sesión se pide la clave, y una clave incorrecta no muestra datos', async ({ page }) => {
  await page.goto('/agenda');
  await expect(page).toHaveURL(/\/acceso$/);
  await page.getByLabel('Clave de la clínica').fill('no-es-esta');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('La clave no es correcta. Revísala e inténtalo de nuevo.');
  await expect(page.getByText('María')).toHaveCount(0);
});

test('H4-E4 al salir hace falta de nuevo la clave', async ({ page }) => {
  await entrar(page);
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/acceso$/);
  await page.goto('/agenda');
  await expect(page).toHaveURL(/\/acceso$/);
});

test('H2-E1 escenario 2: agenda de María, cambio a Jorge y a otro día, con la hora local indicada', async ({ page }) => {
  await entrar(page);
  await expect(page.getByRole('heading', { name: 'Agenda de María' })).toBeVisible();
  await expect(page.getByText('Miércoles 04/11/2026', { exact: true })).toBeVisible();
  await expect(page.getByText('Horas en hora peninsular')).toBeVisible();
  await page.getByRole('link', { name: 'Jorge' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda de Jorge' })).toBeVisible();
  await page.getByLabel('Ir a otro día').fill('14/10/2026');
  await page.getByRole('button', { name: 'Ver día' }).click();
  await expect(page.getByText('Miércoles 14/10/2026')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agenda de Jorge' })).toBeVisible();
});

test('H1-E1 FR-006 FR-009 escenario 3: desde un hueco se reserva una sesión con fin 45 minutos después', async ({ page }, testInfo) => {
  await entrar(page);
  await page.goto(`/agenda?dia=${diaDe(testInfo, '2026-11-05', '2026-11-06')}`);
  const { enlace, inicio } = await huecoLargo(page);
  await enlace.click();

  const fin = sumarAHora(inicio, 45);
  await expect(page.getByLabel('Hora')).toHaveValue(inicio);
  await page.getByLabel('Servicio').selectOption({ label: 'Sesión de fisioterapia · 45 min · 40,00 €' });
  await expect(page.locator('#resumen')).toContainText('Duración: 45 min');
  await expect(page.locator('#resumen')).toContainText('Precio: 40,00 €');
  await expect(page.locator('#resumen')).toContainText(`Fin: ${fin}`);

  await elegirPacienteBuscando(page, '000 100 001');
  await page.getByRole('button', { name: 'Reservar cita' }).click();

  await expect(page).toHaveURL(/\/agenda/);
  await expect(page.locator('.cita', { hasText: `${inicio} a ${fin}` })).toContainText('Reservada');
});

test('FR-009 el resumen se actualiza al cambiar de servicio y de hora', async ({ page }) => {
  await entrar(page);
  await page.goto('/citas/nueva?dia=2026-11-12&hora=10:00');
  await expect(page.locator('#resumen')).toContainText('Fin: 10:45');
  await page.getByLabel('Servicio').selectOption({ label: 'Primera visita de fisioterapia · 60 min · 50,00 €' });
  await expect(page.locator('#resumen')).toContainText('Fin: 11:00');
  await expect(page.locator('#resumen')).toContainText('50,00 €');
  await page.getByLabel('Hora').selectOption('12:15');
  await expect(page.locator('#resumen')).toContainText('Fin: 13:15');
});

test('H1-E9 FR-008 al elegir a Lucía solo se ofrecen servicios de nutrición', async ({ page }) => {
  await entrar(page);
  await page.goto('/citas/nueva?dia=2026-11-12&hora=10:00');
  await page.getByLabel('Profesional').selectOption({ label: 'Lucía' });
  await expect(page.getByLabel('Servicio')).toContainText('Consulta de nutrición');
  await expect(page.getByLabel('Servicio')).not.toContainText('fisioterapia');
  await expect(page.getByLabel('Hora')).toHaveValue('10:00');
});

test('FR-019 tras un rechazo, cambiar de profesional conserva el paciente nuevo escrito', async ({ page }) => {
  await entrar(page);
  await page.goto(`/citas/nueva?dia=${HOY}&hora=09:00`);
  await page.locator('[name="paciente_nombre"]').fill('Rosa Prieto');
  await page.locator('[name="paciente_telefono"]').fill('000 100 999');
  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Profesional').selectOption({ label: 'Lucía' });
  await expect(page.getByLabel('Servicio')).toContainText('Consulta de nutrición');
  await expect(page.locator('[name="paciente_nombre"]')).toHaveValue('Rosa Prieto');
  await expect(page.locator('[name="paciente_telefono"]')).toHaveValue('000 100 999');
  await expect(page).not.toHaveURL(/Rosa/);
});

test('FR-007 la búsqueda encuentra al paciente sin distinguir acentos ni mayúsculas', async ({ page }) => {
  await entrar(page);
  await page.goto('/citas/nueva');
  const elegible = await page.locator('#paciente option').nth(1).innerText();
  const [apellido] = elegible.split(' · ')[0].split(' ').slice(-1);
  const sinAcentos = apellido.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
  await page.getByLabel('Buscar por nombre o teléfono').fill(sinAcentos);
  await expect(page.locator('[data-paciente]', { hasText: elegible })).toBeVisible();
});

test('RN1 CL agenda desactualizada escenario 4: con dos pestañas la segunda se rechaza y ve los huecos actuales', async ({ page, context }, testInfo) => {
  await entrar(page);
  const dia = diaDe(testInfo, '2026-11-09', '2026-11-10');
  await page.goto(`/agenda?dia=${dia}`);
  const { enlace, inicio } = await huecoLargo(page);
  await enlace.click();

  const otra = await context.newPage();
  await otra.goto(page.url());
  for (const pestana of [page, otra]) await elegirPacienteBuscando(pestana, '000 100 00');

  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page).toHaveURL(/\/agenda/);

  await otra.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(otra.getByRole('alert')).toContainText(`María ya tiene una cita de ${inicio} a ${sumarAHora(inicio, 45)} con`);
  await expect(otra.getByRole('alert')).toContainText('Elige otra hora.');
  await expect(otra.getByRole('heading', { name: /Huecos libres de María/ })).toBeVisible();
});

test('RN2 escenario 5: reservar hoy a una hora pasada se rechaza', async ({ page }) => {
  await entrar(page);
  await page.goto(`/citas/nueva?dia=${HOY}&hora=09:00`);
  await elegirPacienteBuscando(page, '000 100 002');
  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page.getByRole('alert')).toHaveText('Esa hora ya ha pasado. Elige una hora a partir de ahora.');
});

test('H1-E10 FR-013 escenario 6: un paciente nuevo con nombre y teléfono queda con ficha y cita', async ({ page }, testInfo) => {
  await entrar(page);
  await page.goto(`/agenda?dia=${diaDe(testInfo, '2026-11-11', '2026-11-12')}`);
  const nombre = `Paciente Nuevo ${testInfo.project.name}`;
  await (await huecoLargo(page)).enlace.click();
  await page.getByLabel('Nombre', { exact: true }).fill(nombre);
  await page.getByLabel('Teléfono', { exact: true }).fill('000 900 001');
  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page).toHaveURL(/\/agenda/);
  await expect(page.locator('.cita', { hasText: nombre })).toContainText('Reservada');

  await page.goto('/citas/nueva');
  await page.getByLabel('Buscar por nombre o teléfono').fill(nombre);
  await expect(page.locator('[data-paciente]')).toHaveCount(1);
});

test('H3-E4 CL hueco liberado y vuelto a ocupar escenario 7: se ven las dos citas sin confundirlas', async ({ page }, testInfo) => {
  await entrar(page);
  await page.goto(`/agenda?dia=${diaDe(testInfo, '2026-11-13', '2026-11-13')}&profesional=${diaDe(testInfo, 1, 2)}`);
  const agenda = page.url();
  const { enlace, inicio } = await huecoLargo(page);
  await enlace.click();
  await elegirPacienteBuscando(page, '000 100 003');
  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page).toHaveURL(/\/agenda/);

  const tramo = `${inicio} a ${sumarAHora(inicio, 45)}`;
  await page.locator('.cita', { hasText: tramo }).getByRole('link', { name: 'Cancelar' }).click();
  await expect(page.getByText('Esta acción no se puede deshacer.')).toBeVisible();
  await page.getByRole('button', { name: 'Sí, confirmar' }).click();
  await expect(page.locator('.cita', { hasText: tramo })).toContainText('Cancelada');

  await page.goto(agenda);
  await page.locator('.hueco', { hasText: `Libre ${inicio}` }).getByRole('link', { name: 'Reservar' }).click();
  await elegirPacienteBuscando(page, '000 100 004');
  await page.getByRole('button', { name: 'Reservar cita' }).click();

  const citas = page.locator('.cita', { hasText: tramo });
  await expect(citas).toHaveCount(2);
  await expect(citas.filter({ hasText: 'Cancelada' })).toHaveCount(1);
  await expect(citas.filter({ hasText: 'Reservada' })).toHaveCount(1);
  // H6-E7: la cancelada por recepción pone «Cancelada», sin fecha ni hora de la cancelación.
  await expect(citas.filter({ hasText: 'Cancelada' }).locator('.estado')).toHaveText('Cancelada');
});

test('RN4 H3-E6 escenario 8: una cita pasada se marca como no asistida con confirmación y queda definitiva', async ({ page }, testInfo) => {
  await entrar(page);
  await page.goto('/agenda?dia=2026-11-02');
  await page.getByRole('link', { name: diaDe(testInfo, 'María', 'Jorge') }).click();
  const cita = page.locator('.cita', { has: page.getByRole('link', { name: 'No asistió' }) }).first();
  const tramo = await cita.locator('.cita__hora').innerText();
  await cita.getByRole('link', { name: 'No asistió' }).click();

  await expect(page.getByText('Esta acción no se puede deshacer.')).toBeVisible();
  const id = new URL(page.url()).pathname.split('/')[2];
  await page.getByRole('button', { name: 'Sí, confirmar' }).click();

  const cerrada = page.locator('.cita', { hasText: tramo });
  await expect(cerrada).toContainText('No asistida');
  // RN4: ya no tiene acciones de estado. Solo queda el correo de la ficha, que FR-041 ofrece en cualquier estado.
  await expect(cerrada.getByRole('link')).toHaveText([/^(Añadir|Cambiar) correo$/]);

  const respuesta = await page.request.post(`/citas/${id}/estado`, { form: { accion: 'completar' } });
  expect(respuesta.status()).toBe(409);
  expect(await respuesta.text()).toContain('Esta cita ya está no asistida y no se puede cambiar.');
});

test('H2-E4 FR-018 hoy no se ofrece reservar antes de las 10:00', async ({ page }) => {
  await entrar(page);
  const horas = await page.locator('a[href^="/citas/nueva?profesional"]').evaluateAll(
    (enlaces) => enlaces.map((a) => new URL(a.href).searchParams.get('hora')),
  );
  expect(horas.length).toBeGreaterThan(0);
  for (const hora of horas) expect(hora >= '10:00').toBe(true);
});

const AVISO_RELOJ = 'Reloj de demostración: la hora está fijada en el miércoles 04/11/2026 a las 10:00 y no avanza.';

test('H5-E5 FR-043 escenario 10: con el reloj fijado, el aviso se ve en todas las pantallas, también en el acceso', async ({ page }) => {
  await page.goto('/acceso');
  await expect(page.getByRole('status')).toHaveText(AVISO_RELOJ);
  await entrar(page);
  await expect(page.getByRole('status')).toHaveText(AVISO_RELOJ);
  await expect(page.getByText('Miércoles 04/11/2026', { exact: true })).toBeVisible();
  for (const ruta of ['/citas/nueva', '/no-existe']) {
    await page.goto(ruta);
    await expect(page.getByRole('status')).toHaveText(AVISO_RELOJ);
  }
});

test('H2-E6 FR-041 escenarios 11 y 12: añadir un correo mal escrito, después uno bien, y quitarlo', async ({ page }, testInfo) => {
  await entrar(page);
  // Cada proyecto busca en días propios una cita cuyo paciente aún no tiene correo.
  const dias = diaDe(testInfo, ['2026-10-19', '2026-10-20', '2026-10-21'], ['2026-10-26', '2026-10-27', '2026-10-28']);
  const enlace = page.locator('.cita').getByRole('link', { name: 'Añadir correo' }).first();
  for (const dia of dias) {
    await page.goto(`/agenda?dia=${dia}`);
    if (await enlace.count() > 0) break;
  }
  const destino = await enlace.getAttribute('href');
  const cita = page.locator('.cita', { has: page.locator(`a[href="${destino}"]`) });
  const antes = await cita.locator('.cita__hora, .cita__paciente, .cita__servicio, .estado').allInnerTexts();
  const agenda = page.url();
  await enlace.click();

  // Escenario 11: primero mal, conservando lo escrito; después bien.
  await expect(page.getByRole('heading', { name: /^Correo de / })).toBeVisible();
  await page.getByLabel('Correo electrónico').fill('paciente@ejemplo');
  await page.getByRole('button', { name: 'Guardar correo' }).click();
  await expect(page.getByRole('alert')).toHaveText('Ese correo no parece válido. Revísalo o déjalo en blanco.');
  await expect(page.getByLabel('Correo electrónico')).toHaveValue('paciente@ejemplo');
  await page.getByLabel('Correo electrónico').fill('paciente@example.com');
  await page.getByRole('button', { name: 'Guardar correo' }).click();
  await expect(page).toHaveURL(/\/agenda/);
  await expect(page.locator(`a[href="${destino}"]`)).toHaveText('Cambiar correo');

  // Escenario 12: dejarlo en blanco lo quita, y la cita no cambia.
  await page.locator(`a[href="${destino}"]`).click();
  await expect(page.getByLabel('Correo electrónico')).toHaveValue('paciente@example.com');
  await page.getByLabel('Correo electrónico').fill('');
  await page.getByRole('button', { name: 'Guardar correo' }).click();
  await expect(page).toHaveURL(/\/agenda/);
  await expect(page.locator(`a[href="${destino}"]`)).toHaveText('Añadir correo');
  await page.goto(agenda);
  expect(await cita.locator('.cita__hora, .cita__paciente, .cita__servicio, .estado').allInnerTexts()).toEqual(antes);
});

test('H3-E5 FR-038 escenario 13: cancelar desde dos pestañas una cita ya cancelada da el mensaje de su estado', async ({ page, context }, testInfo) => {
  await entrar(page);
  await page.goto(`/agenda?profesional=3&dia=${diaDe(testInfo, '2026-11-05', '2026-11-06')}`);
  await expect(page.getByRole('heading', { name: 'Agenda de Lucía' })).toBeVisible();
  await page.locator('.cita').getByRole('link', { name: 'Cancelar' }).first().click();
  await expect(page.getByText('Esta acción no se puede deshacer.')).toBeVisible();

  const otra = await context.newPage();
  await otra.goto(page.url());
  await expect(otra.getByText('Esta acción no se puede deshacer.')).toBeVisible();

  await page.getByRole('button', { name: 'Sí, confirmar' }).click();
  await expect(page).toHaveURL(/\/agenda/);
  await otra.getByRole('button', { name: 'Sí, confirmar' }).click();
  await expect(otra.getByRole('alert')).toHaveText('Esta cita ya está cancelada y no se puede cambiar.');
});
