import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { crearServidor } from '../../src/web/servidor.js';

const DIA = '2026-11-11'; // miércoles
let e;
let servidor;
let cookie;

beforeEach(async () => {
  e = crearEscenario();
  servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-09T12:00:00+01:00') }));
  cookie = sesionDePrueba(e.bd, e.a.id);
});
afterEach(async () => {
  await detener(servidor);
  e.cerrar();
});

const nueva = (consulta = '') => peticion(servidor, { ruta: `/citas/nueva${consulta}`, cookie });
const enviar = (extra = {}) => peticion(servidor, {
  metodo: 'POST',
  ruta: '/citas',
  cookie,
  formulario: {
    profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], dia: DIA, hora: '10:00', ...extra,
  },
});
const contar = (tabla) => e.bd.prepare(`SELECT count(*) AS n FROM ${tabla}`).get().n;
const buscar = (q) => peticion(servidor, { ruta: `/pacientes/buscar?q=${encodeURIComponent(q)}`, cookie });

test('FR-005 el formulario sin datos ofrece todo lo necesario para crear una cita', async () => {
  const r = await nueva();
  assert.equal(r.estado, 200);
  for (const campo of ['profesional', 'servicio', 'paciente', 'dia', 'hora', 'paciente_nombre', 'paciente_telefono', 'paciente_email']) {
    assert.match(r.texto, new RegExp(`name="${campo}"`));
  }
});

test('FR-006 el formulario llega rellenado desde un hueco', async () => {
  const r = await nueva(`?profesional=${e.a.nutri}&dia=${DIA}&hora=10:30`);
  assert.match(r.texto, new RegExp(`<option value="${e.a.nutri}" selected>Lucía</option>`));
  assert.match(r.texto, new RegExp(`name="dia"[^>]*value="${DIA}"`));
  assert.match(r.texto, /<option value="10:30" selected>10:30<\/option>/);
});

test('FR-012 sin datos, el formulario propone el día de hoy según la clínica', async () => {
  const r = await nueva();
  assert.match(r.texto, /name="dia"[^>]*value="2026-11-09"/);
});

test('FR-011 el formulario solo ofrece horas en cuartos de hora dentro del horario', async () => {
  const r = await nueva();
  const horas = [...r.texto.matchAll(/<option value="(\d\d:\d\d)"/g)].map((m) => m[1]);
  assert.equal(horas[0], '09:00');
  assert.equal(horas.at(-1), '19:45');
  assert.equal(horas.length, 44);
});

test('H1-E9 FR-008 con una profesional de nutrición solo se ofrecen servicios de nutrición', async () => {
  const texto = textoVisible((await nueva(`?profesional=${e.a.nutri}`)).texto);
  assert.match(texto, /Consulta de nutrición/);
  assert.match(texto, /Primera consulta de nutrición/);
  assert.doesNotMatch(texto, /fisioterapia/i);
});

test('FR-008 con un profesional de fisioterapia solo se ofrecen servicios de fisioterapia', async () => {
  const texto = textoVisible((await nueva(`?profesional=${e.a.fisio}`)).texto);
  assert.match(texto, /Sesión de fisioterapia/);
  assert.doesNotMatch(texto, /nutrición/i);
});

test('FR-009 el alta muestra duración, precio y hora de fin antes de confirmar', async () => {
  const r = await nueva(`?profesional=${e.a.fisio}&dia=${DIA}&hora=10:00&servicio=${e.a.sesion}`);
  const texto = textoVisible(r.texto);
  assert.match(texto, /Duración: 45 min/);
  assert.match(texto, /Precio: 40,00 €/);
  assert.match(texto, /Fin: 10:45/);
});

test('FR-009 cada servicio lleva su duración y su precio en la lista', async () => {
  const texto = textoVisible((await nueva()).texto);
  assert.match(texto, /Primera visita de fisioterapia · 60 min · 50,00 €/);
});

test('FR-004 un profesional de otra clínica no abre el formulario', async () => {
  assert.equal((await nueva(`?profesional=${e.b.fisio}`)).estado, 404);
});

test('FR-010 POST /citas crea la cita y redirige con 303 a la agenda del día', async () => {
  const r = await enviar();
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, `/agenda?profesional=${e.a.fisio}&dia=${DIA}`);
  assert.equal(contar('cita'), 1);
});

test('RN1 POST /citas con solape da 409 con el mensaje literal', async () => {
  await enviar();
  const r = await enviar({ hora: '10:30', paciente: e.a.pacientes[1] });
  assert.equal(r.estado, 409);
  assert.match(textoVisible(r.texto), /María ya tiene una cita de 10:00 a 10:45 con Ana Núñez\. Elige otra hora\./);
  assert.equal(contar('cita'), 1);
});

test('FR-019 tras el rechazo por solape se ven los huecos actuales de ese día', async () => {
  citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[1], inicio: `${DIA}T10:00`,
  });
  const texto = textoVisible((await enviar({ hora: '10:30' })).texto);
  assert.match(texto, /Huecos libres de María el 11\/11\/2026/);
  assert.match(texto, /09:00 a 10:00/);
  assert.match(texto, /10:45 a 20:00/);
});

test('H1-E11 FR-019 tras el rechazo el formulario conserva lo escrito', async () => {
  await enviar();
  const r = await enviar({
    paciente: '', paciente_nombre: 'Marta Ruiz', paciente_telefono: '600 111 222', paciente_email: 'marta@example.com',
  });
  assert.equal(r.estado, 409);
  assert.match(r.texto, /name="paciente_nombre"[^>]*value="Marta Ruiz"/);
  assert.match(r.texto, /name="paciente_telefono"[^>]*value="600 111 222"/);
  assert.match(r.texto, /name="paciente_email"[^>]*value="marta@example.com"/);
  assert.match(r.texto, new RegExp(`name="dia"[^>]*value="${DIA}"`));
  assert.match(r.texto, /<option value="10:00" selected>/);
  assert.match(r.texto, new RegExp(`<option value="${e.a.sesion}" selected`));
  assert.equal(contar('paciente'), 4);
});

test('FR-019 tras el rechazo sigue elegido el paciente existente', async () => {
  const r = await enviar({ hora: '09:00', dia: '2026-11-09' });
  assert.equal(r.estado, 422);
  assert.match(r.texto, new RegExp(`<option value="${e.a.pacientes[0]}" selected>`));
});

const RECHAZOS = [
  ['RN2', { dia: '2026-11-09', hora: '11:30' }, 'Esa hora ya ha pasado. Elige una hora a partir de ahora.'],
  ['FR-012', { dia: '2026-11-14' }, 'La clínica abre de lunes a viernes, de 09:00 a 20:00. Elige una hora dentro de ese horario.'],
  ['FR-011', { hora: '10:07' }, 'Las citas empiezan en punto, y cuarto, y media o menos cuarto.'],
  ['FR-013', { paciente: '', paciente_nombre: 'Marta', paciente_telefono: '12' }, 'Escribe el nombre y un teléfono de al menos 9 dígitos.'],
];

for (const [regla, extra, mensaje] of RECHAZOS) {
  test(`${regla} POST /citas da 422 con el mensaje literal`, async () => {
    const r = await enviar(extra);
    assert.equal(r.estado, 422);
    assert.ok(textoVisible(r.texto).includes(mensaje));
    assert.equal(contar('cita'), 0);
  });
}

test('RN7 POST /citas con un servicio incompatible da 422 y ofrece los de la especialidad', async () => {
  const r = await enviar({ profesional: e.a.nutri });
  assert.equal(r.estado, 422);
  const texto = textoVisible(r.texto);
  assert.ok(texto.includes('Lucía no atiende ese servicio. Elige uno de nutrición.'));
  assert.match(texto, /Consulta de nutrición/);
});

test('FR-004 POST /citas con datos de otra clínica da 404', async () => {
  assert.equal((await enviar({ paciente: e.b.pacientes[0] })).estado, 404);
  assert.equal((await enviar({ profesional: e.b.fisio })).estado, 404);
  assert.equal(contar('cita'), 0);
});

test('CL doble pulsación: la misma alta dos veces deja una sola cita', async () => {
  const [a, b] = await Promise.all([enviar(), enviar()]);
  assert.deepEqual([a.estado, b.estado].sort(), [303, 409]);
  assert.equal(contar('cita'), 1);
});

test('CL agenda desactualizada: reservar un hueco que otra persona acaba de ocupar da 409 y agenda al día', async () => {
  await nueva(`?profesional=${e.a.fisio}&dia=${DIA}&hora=10:00`);
  await enviar();
  const r = await enviar({ paciente: e.a.pacientes[1] });
  assert.equal(r.estado, 409);
  assert.match(textoVisible(r.texto), /10:45 a 20:00/);
});

test('FR-007 se encuentra al paciente por parte del nombre', async () => {
  const r = await buscar('nuñ');
  assert.equal(r.estado, 200);
  assert.match(textoVisible(r.texto), /Ana Núñez/);
  assert.doesNotMatch(r.texto, /<html/);
});

test('FR-007 la búsqueda no distingue acentos ni mayúsculas', async () => {
  for (const q of ['NUNEZ', 'núñez', 'Nuñez', 'nunez']) {
    assert.match(textoVisible((await buscar(q)).texto), /Ana Núñez/);
  }
  assert.match(textoVisible((await buscar('oscar')).texto), /Óscar Peña/);
});

test('FR-007 se encuentra al paciente por parte del teléfono, con o sin espacios', async () => {
  assert.match(textoVisible((await buscar('000 002')).texto), /Óscar Peña/);
  assert.match(textoVisible((await buscar('600000003')).texto), /Luis Gómez/);
});

test('FR-007 sin coincidencias se dice en lenguaje llano', async () => {
  assert.match(textoVisible((await buscar('zzz')).texto), /No hay pacientes con ese nombre o teléfono/);
});

test('FR-007 una búsqueda vacía no devuelve a todos los pacientes', async () => {
  assert.doesNotMatch(textoVisible((await buscar('')).texto), /Ana Núñez/);
});

test('FR-004 la búsqueda no devuelve pacientes de otra clínica', async () => {
  assert.doesNotMatch(textoVisible((await buscar('Bruno')).texto), /Bruno Sanz/);
});

test('FR-027 el nombre del paciente se escapa en la búsqueda y en el formulario', async () => {
  const nombre = '<img src=x onerror=alert(1)>';
  e.bd.prepare('INSERT INTO paciente (clinica_id, nombre, telefono) VALUES (?, ?, ?)').run(e.a.id, nombre, '600000009');
  const busqueda = await buscar('onerror');
  assert.doesNotMatch(busqueda.texto, /<img/);
  assert.match(busqueda.texto, /&lt;img/);
  assert.doesNotMatch((await nueva()).texto, /<img/);
  const rechazo = await enviar({ paciente: '', paciente_nombre: nombre, paciente_telefono: '1' });
  assert.doesNotMatch(rechazo.texto, /<img/);
});
