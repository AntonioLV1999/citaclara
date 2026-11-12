import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { clinicaPorId } from '../../src/datos/catalogo.js';
import { cancelarCita } from '../../src/servicios/cancelar.js';
import { detener, peticion, textoVisible } from '../ayudas/escenario.js';
import {
  AHORA, citaDe, entrarComoPaciente, escenarioSemilla, fichaPorNombre, filaCita, servidorSobre,
} from '../ayudas/portal.js';

const DIA = '2026-11-11';
let s;
let recepcion;
let lucia;
let cita;
const otros = [];

beforeEach(async () => {
  s = await escenarioSemilla();
  recepcion = s.recepcion();
  lucia = s.bd.prepare("SELECT * FROM profesional WHERE nombre = 'Lucía'").get();
  cita = citaDe(s.bd, fichaPorNombre(s.bd, 'Cristina Ortega').id, `${DIA}T11:15`);
});
afterEach(async () => {
  await Promise.all(otros.splice(0).map(detener));
  await s.cerrar();
});

const profesional = (nombre) => s.bd.prepare('SELECT * FROM profesional WHERE nombre = ?').get(nombre);
const servicio = (nombre) => s.bd.prepare('SELECT * FROM servicio WHERE nombre = ?').get(nombre);
const contexto = (momentoFijado = AHORA) => ({
  bd: s.bd, clinica: clinicaPorId(s.bd, s.clinica.id), ahora: () => new Date(), momentoFijado,
});
const LISTA = /<section[^>]*class="huecos-liberados"[\s\S]*?<\/section>/;

async function agenda(id, dia, servidor = s.servidor) {
  const r = await peticion(servidor, { ruta: `/agenda?profesional=${id}&dia=${dia}`, cookie: recepcion });
  assert.equal(r.estado, 200);
  return r.texto;
}

async function lista(id = profesional('María').id, dia = '2026-11-05', servidor) {
  const html = (await agenda(id, dia, servidor)).match(LISTA)?.[0] ?? '';
  return { html, huecos: [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map((m) => ({ href: m[1].replaceAll('&amp;', '&'), texto: m[2] })) };
}

async function cancelarDesdeElPortal(nombre, id) {
  const cookie = await entrarComoPaciente(s.servidor, fichaPorNombre(s.bd, nombre).enlace);
  const r = await peticion(s.servidor, { metodo: 'POST', ruta: `/portal/citas/${id}/cancelar`, cookie, formulario: {} });
  assert.equal(r.estado, 200);
}

function reservar(profesionalId, servicioNombre, hora, paciente = fichaPorNombre(s.bd, 'David Gil').id) {
  return peticion(s.servidor, {
    metodo: 'POST',
    ruta: '/citas',
    cookie: recepcion,
    formulario: { profesional: profesionalId, servicio: servicio(servicioNombre).id, paciente, dia: '11/11/2026', hora },
  });
}

test('002/H4-E1 002/FR-018 tras cancelar Cristina Ortega desde el portal, la agenda de Lucía muestra libre de 10:00 a 13:15', async () => {
  const antes = textoVisible(await agenda(lucia.id, DIA));
  assert.doesNotMatch(antes, /Libre 10:00 a 13:15/);
  await cancelarDesdeElPortal('Cristina Ortega', cita.id);
  const texto = textoVisible(await agenda(lucia.id, DIA));
  assert.match(texto, /Libre 10:00 a 13:15/);
  assert.match(texto, /11:15 a 12:00 Cristina Ortega/);
});

test('002/H4-E2 recepción reserva una consulta a las 11:15 en ese hueco, y la agenda muestra las dos citas sin confundirlas', async () => {
  await cancelarDesdeElPortal('Cristina Ortega', cita.id);
  const r = await reservar(lucia.id, 'Consulta de nutrición', '11:15');
  assert.equal(r.estado, 303, r.texto);
  const html = await agenda(lucia.id, DIA);
  const filas = [...html.matchAll(/<li class="(cita[^"]*)">([\s\S]*?)<\/li>/g)].map((m) => [m[1], textoVisible(m[2])]);
  const cancelada = filas.find(([, t]) => t.includes('Cristina Ortega'));
  const nueva = filas.find(([, t]) => t.startsWith('11:15 a 11:45') && t.includes('David Gil'));
  assert.equal(cancelada[0], 'cita cita--libera');
  assert.match(cancelada[1], /Cancelada por el paciente/);
  assert.equal(nueva[0], 'cita');
  assert.match(nueva[1], /Reservada/);
});

test('002/H4-E5 002/FR-019 en la agenda de cualquier profesional y día se ve el hueco de Lucía, que lleva a su agenda', async () => {
  await cancelarDesdeElPortal('Cristina Ortega', cita.id);
  for (const [nombre, dia] of [['María', '2026-11-05'], ['Jorge', '2026-11-12'], ['Jorge', '2026-10-20']]) {
    const { html, huecos } = await lista(profesional(nombre).id, dia);
    assert.match(textoVisible(html), /^Huecos liberados por pacientes/);
    assert.deepEqual(huecos, [{ texto: 'mié 11/11/2026, 11:15–12:00, Lucía', href: `/agenda?profesional=${lucia.id}&dia=${DIA}` }], `${nombre} ${dia}`);
  }
  // La lista va encima de la agenda del día.
  const html = await agenda(profesional('María').id, '2026-11-05');
  assert.ok(html.search(LISTA) < html.indexOf('<ul class="agenda'));
});

test('002/H4-E6 en la agenda de Lucía, la cita lleva la etiqueta de la cancelación del paciente', async () => {
  await cancelarDesdeElPortal('Cristina Ortega', cita.id);
  assert.match(textoVisible(await agenda(lucia.id, DIA)), /11:15 a 12:00 Cristina Ortega Primera consulta de nutrición Cancelada por el paciente el 04\/11\/2026 a las 12:00/);
});

test('002/H4-E7 el hueco sale de la lista al reservar todo su tramo, al reservar una parte o al llegar su hora', async () => {
  await cancelarDesdeElPortal('Cristina Ortega', cita.id);
  assert.equal((await lista()).huecos.length, 1);

  const llegaLaHora = await servidorSobre(s.bd, { momentoFijado: `${DIA}T11:15` });
  otros.push(llegaLaHora);
  assert.deepEqual((await lista(undefined, undefined, llegaLaHora)).huecos, []);

  assert.equal((await reservar(lucia.id, 'Consulta de nutrición', '11:30')).estado, 303);
  assert.deepEqual((await lista()).huecos, []);
});

test('002/H4-E7 el hueco sale de la lista al reservar todo su tramo', async () => {
  await cancelarDesdeElPortal('Cristina Ortega', cita.id);
  assert.equal((await reservar(lucia.id, 'Primera consulta de nutrición', '11:15')).estado, 303);
  assert.deepEqual((await lista()).huecos, []);
});

test('002/H4-E8 una cita cancelada por recepción se muestra «Cancelada» y no entra en la lista', async () => {
  assert.equal(cancelarCita(contexto(), cita.id, 'recepcion').resultado, 'cancelada_ahora');
  assert.match(textoVisible(await agenda(lucia.id, DIA)), /11:15 a 12:00 Cristina Ortega Primera consulta de nutrición Cancelada(?! por)/);
  assert.deepEqual((await lista()).huecos, []);
});

test('002/FR-019 entran los huecos liberados por el correo, en orden, una vez por tramo, y no los de recepción', async () => {
  const { html: vacia, huecos: ninguno } = await lista();
  assert.deepEqual(ninguno, []);
  assert.match(textoVisible(vacia), /Ningún paciente ha liberado huecos próximos\./);

  const isabel = citaDe(s.bd, fichaPorNombre(s.bd, 'Isabel Navarro').id, '2026-11-10T18:00');
  const david = citaDe(s.bd, fichaPorNombre(s.bd, 'David Gil').id, '2026-11-09T19:00');
  assert.equal(cancelarCita(contexto(), cita.id, 'correo').resultado, 'cancelada_ahora');
  assert.equal(cancelarCita(contexto(), isabel.id, 'portal').resultado, 'cancelada_ahora');
  assert.equal(cancelarCita(contexto(), david.id, 'portal').resultado, 'cancelada_ahora');

  // El mismo tramo, reservado otra vez y cancelado de nuevo por el paciente.
  assert.equal((await reservar(lucia.id, 'Primera consulta de nutrición', '11:15')).estado, 303);
  const otra = s.bd.prepare("SELECT id FROM cita WHERE profesional_id = ? AND inicio = ? AND estado = 'reservada'").get(lucia.id, `${DIA}T11:15`);
  assert.equal(cancelarCita(contexto(), otra.id, 'portal').resultado, 'cancelada_ahora');

  assert.deepEqual((await lista()).huecos.map((h) => h.texto), [
    'lun 09/11/2026, 19:00–19:30, Lucía',
    'mar 10/11/2026, 18:00–18:45, Jorge',
    'mié 11/11/2026, 11:15–12:00, Lucía',
  ]);
  const deRecepcion = s.bd.prepare("SELECT count(*) AS n FROM cita WHERE estado = 'cancelada' AND origen_cancelacion = 'recepcion'").get().n;
  assert.equal(deRecepcion, 37);
});

test('002/FR-020 cargar la agenda no crea, mueve ni cambia ninguna cita', async () => {
  await cancelarDesdeElPortal('Cristina Ortega', cita.id);
  const antes = JSON.stringify(s.bd.prepare('SELECT * FROM cita ORDER BY id').all());
  for (const nombre of ['María', 'Jorge', 'Lucía']) await agenda(profesional(nombre).id, DIA);
  assert.equal(JSON.stringify(s.bd.prepare('SELECT * FROM cita ORDER BY id').all()), antes);
  assert.equal(filaCita(s.bd, cita.id).estado, 'cancelada');
});

test('002/CL Huecos con poco margen: un hueco que empieza a las 12:15 sale con el reloj a las 12:00 y ya no a las 12:15', async () => {
  const javier = citaDe(s.bd, fichaPorNombre(s.bd, 'Javier Peña').id, '2026-11-04T12:15');
  assert.equal(cancelarCita(contexto('2026-11-04T10:15'), javier.id, 'portal').resultado, 'cancelada_ahora');
  assert.deepEqual((await lista()).huecos.map((h) => h.texto), ['mié 04/11/2026, 12:15–13:00, Jorge']);
  const alas1215 = await servidorSobre(s.bd, { momentoFijado: '2026-11-04T12:15' });
  otros.push(alas1215);
  assert.deepEqual((await lista(undefined, undefined, alas1215)).huecos, []);
});
