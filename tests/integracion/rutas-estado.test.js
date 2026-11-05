import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { crearServidor } from '../../src/web/servidor.js';

const DIA = '2026-11-11';
let e;
let servidor;
let cookie;
let empezada;
let futura;

beforeEach(async () => {
  e = crearEscenario();
  servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo(`${DIA}T12:00:00+01:00`) }));
  cookie = sesionDePrueba(e.bd, e.a.id);
  const base = { clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0] };
  empezada = citaDirecta(e.bd, { ...base, inicio: `${DIA}T10:00` });
  futura = citaDirecta(e.bd, { ...base, inicio: `${DIA}T16:00` });
});
afterEach(async () => {
  await detener(servidor);
  e.cerrar();
});

const confirmar = (id, accion, c = cookie) => peticion(servidor, { ruta: `/citas/${id}/confirmar?accion=${accion}`, cookie: c });
const aplicar = (id, accion, c = cookie) => peticion(servidor, {
  metodo: 'POST', ruta: `/citas/${id}/estado`, cookie: c, formulario: { accion },
});
const estado = (id) => e.bd.prepare('SELECT estado FROM cita WHERE id = ?').get(id).estado;

for (const [accion, texto] of [['completar', 'Completada'], ['cancelar', 'Cancelar'], ['no-asistio', 'No asistió']]) {
  test(`H3-E6 FR-021 la acción ${accion} pide confirmación y avisa de que no se puede deshacer`, async () => {
    const r = await confirmar(empezada, accion);
    assert.equal(r.estado, 200);
    const visible = textoVisible(r.texto);
    assert.match(visible, /no se puede deshacer/);
    assert.match(visible, /10:00 a 10:45/);
    assert.match(visible, /Ana Núñez/);
    assert.match(visible, new RegExp(texto, 'i'));
    assert.match(r.texto, new RegExp(`action="/citas/${empezada}/estado"`));
    assert.match(r.texto, new RegExp(`name="accion" value="${accion}"`));
  });
}

test('FR-021 GET no cambia nada: abrir la confirmación no aplica la acción', async () => {
  await confirmar(empezada, 'cancelar');
  assert.equal(estado(empezada), 'reservada');
});

test('FR-021 la confirmación permite volver sin hacer nada', async () => {
  const r = await confirmar(empezada, 'cancelar');
  assert.match(r.texto, new RegExp(`href="/agenda\\?profesional=${e.a.fisio}&amp;dia=${DIA}"`));
});

test('FR-022 ver la agenda con citas ya pasadas no cambia su estado', async () => {
  await peticion(servidor, { ruta: `/agenda?profesional=${e.a.fisio}&dia=${DIA}`, cookie });
  assert.equal(estado(empezada), 'reservada');
});

test('FR-020 POST /citas/:id/estado aplica la acción y redirige con 303 a la agenda', async () => {
  const r = await aplicar(empezada, 'completar');
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, `/agenda?profesional=${e.a.fisio}&dia=${DIA}`);
  assert.equal(estado(empezada), 'completada');
});

test('H3-E3 RN5 fuera de la interfaz, cerrar antes de hora da 409 con el mensaje literal', async () => {
  const r = await aplicar(futura, 'completar');
  assert.equal(r.estado, 409);
  assert.ok(textoVisible(r.texto).includes('Esta cita todavía no ha empezado. Hasta entonces solo se puede cancelar.'));
  assert.equal(estado(futura), 'reservada');
});

test('H3-E5 RN4 cambiar un estado definitivo da 409 con el mensaje literal', async () => {
  await aplicar(empezada, 'no-asistio');
  const r = await aplicar(empezada, 'completar');
  assert.equal(r.estado, 409);
  assert.ok(textoVisible(r.texto).includes('Esta cita ya está no asistida y no se puede cambiar.'));
  assert.equal(estado(empezada), 'no_asistida');
});

test('CL dos acciones de estado a la vez por HTTP: un 303 y un 409', async () => {
  const respuestas = await Promise.all([aplicar(empezada, 'cancelar'), aplicar(empezada, 'completar')]);
  assert.deepEqual(respuestas.map((r) => r.estado).sort(), [303, 409]);
  assert.match(textoVisible(respuestas.find((r) => r.estado === 409).texto), /Esta cita ya está (cancelada|completada)/);
});

test('FR-004 las citas de otra clínica responden 404 y no cambian', async () => {
  const ajena = sesionDePrueba(e.bd, e.b.id);
  assert.equal((await confirmar(empezada, 'cancelar', ajena)).estado, 404);
  assert.equal((await aplicar(empezada, 'cancelar', ajena)).estado, 404);
  assert.equal(estado(empezada), 'reservada');
});

test('FR-020 una cita inexistente o una acción desconocida responden 404', async () => {
  assert.equal((await confirmar(99999, 'cancelar')).estado, 404);
  assert.equal((await confirmar('abc', 'cancelar')).estado, 404);
  assert.equal((await confirmar(empezada, 'borrar')).estado, 404);
  assert.equal((await aplicar(99999, 'cancelar')).estado, 404);
  assert.equal((await aplicar(empezada, 'borrar')).estado, 404);
});

test('H3-E3 la agenda solo ofrece cancelar en una cita que aún no ha empezado', async () => {
  const r = await peticion(servidor, { ruta: `/agenda?profesional=${e.a.fisio}&dia=${DIA}`, cookie });
  assert.match(r.texto, new RegExp(`/citas/${futura}/confirmar\\?accion=cancelar`));
  assert.doesNotMatch(r.texto, new RegExp(`/citas/${futura}/confirmar\\?accion=completar`));
  assert.doesNotMatch(r.texto, new RegExp(`/citas/${futura}/confirmar\\?accion=no-asistio`));
});

test('FR-020 la agenda ofrece las tres acciones en una cita empezada', async () => {
  const r = await peticion(servidor, { ruta: `/agenda?profesional=${e.a.fisio}&dia=${DIA}`, cookie });
  for (const accion of ['completar', 'cancelar', 'no-asistio']) {
    assert.match(r.texto, new RegExp(`/citas/${empezada}/confirmar\\?accion=${accion}`));
  }
});

test('RN4 la agenda no ofrece acciones en una cita con estado definitivo', async () => {
  await aplicar(empezada, 'completar');
  const r = await peticion(servidor, { ruta: `/agenda?profesional=${e.a.fisio}&dia=${DIA}`, cookie });
  assert.doesNotMatch(r.texto, new RegExp(`/citas/${empezada}/confirmar`));
});
