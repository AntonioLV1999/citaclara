import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { crearServidor } from '../../src/web/servidor.js';

const DIA = '2026-11-11';
const NO_VALIDO = 'Ese correo no parece válido. Revísalo o déjalo en blanco.';
let e;
let servidor;
let cookie;
let id;
let paciente;

beforeEach(async () => {
  e = crearEscenario();
  servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo(`${DIA}T12:00:00+01:00`) }));
  cookie = sesionDePrueba(e.bd, e.a.id);
  [paciente] = e.a.pacientes;
  id = cita(`${DIA}T16:00`);
});
afterEach(async () => {
  await detener(servidor);
  e.cerrar();
});

function cita(inicio, estado = 'reservada', pacienteId = paciente) {
  return citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: pacienteId, inicio, estado,
  });
}

const abrir = (citaId = id, c = cookie) => peticion(servidor, { ruta: `/citas/${citaId}/correo`, cookie: c });
const guardar = (email, citaId = id, c = cookie) => peticion(servidor, {
  metodo: 'POST', ruta: `/citas/${citaId}/correo`, cookie: c, formulario: { email },
});
const ficha = (pacienteId = paciente) => ({ ...e.bd.prepare('SELECT * FROM paciente WHERE id = ?').get(pacienteId) });
const filaCita = (citaId = id) => ({ ...e.bd.prepare('SELECT * FROM cita WHERE id = ?').get(citaId) });
const agendaDelDia = () => `/agenda?profesional=${e.a.fisio}&dia=11/11/2026`;

test('H2-E6 FR-041 en una ficha sin correo, guardar uno válido lo añade y vuelve a la agenda del día de la cita', async () => {
  assert.equal(ficha().email, null);
  const r = await guardar('ana.nunez@example.com');
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, agendaDelDia());
  assert.equal(ficha().email, 'ana.nunez@example.com');
});

test('H2-E6 FR-041 un correo mal escrito se corrige desde la cita', async () => {
  e.bd.prepare("UPDATE paciente SET email = 'ana.nunez@exmaple' WHERE id = ?").run(paciente);
  const r = await guardar('  ana.nunez@example.com  ');
  assert.equal(r.estado, 303);
  assert.equal(ficha().email, 'ana.nunez@example.com');
});

test('FR-041 dejar el campo vacío o con espacios quita el correo', async () => {
  for (const vacio of ['', '   ']) {
    e.bd.prepare("UPDATE paciente SET email = 'ana@example.com' WHERE id = ?").run(paciente);
    const r = await guardar(vacio);
    assert.equal(r.estado, 303);
    assert.equal(ficha().email, null);
  }
});

test('FR-013 FR-041 un correo no válido da 422 con el mensaje, conserva lo escrito y no cambia la ficha', async () => {
  e.bd.prepare("UPDATE paciente SET email = 'ana@example.com' WHERE id = ?").run(paciente);
  for (const malo of ['ana.nunez@', 'ana nunez@example.com', 'sin-arroba']) {
    const r = await guardar(malo);
    assert.equal(r.estado, 422, malo);
    assert.ok(textoVisible(r.texto).includes(NO_VALIDO), malo);
    assert.match(r.texto, new RegExp(`value="${malo}"`));
    assert.equal(ficha().email, 'ana@example.com');
  }
});

test('FR-041 nombre, teléfono y la cita quedan idénticos al guardar el correo', async () => {
  const fichaAntes = ficha();
  const citaAntes = filaCita();
  await guardar('ana.nunez@example.com');
  assert.deepEqual({ ...ficha(), email: fichaAntes.email }, fichaAntes);
  assert.deepEqual(filaCita(), citaAntes);
  await guardar('');
  assert.deepEqual(ficha(), fichaAntes);
  assert.deepEqual(filaCita(), citaAntes);
});

test('FR-041 la página tiene los textos del contrato, y nombre y teléfono solo como texto', async () => {
  e.bd.prepare("UPDATE paciente SET email = 'ana@example.com' WHERE id = ?").run(paciente);
  const r = await abrir();
  assert.equal(r.estado, 200);
  const visible = textoVisible(r.texto);
  assert.match(visible, /Correo de Ana Núñez/);
  assert.match(visible, /Correo electrónico/);
  assert.ok(visible.includes('Déjalo en blanco para quitarlo. Guardarlo no envía ningún mensaje.'));
  assert.match(visible, /Guardar correo/);
  assert.match(visible, /Volver a la agenda/);
  assert.match(visible, /600 000 001/);
  assert.match(r.texto, /name="email"[^>]*value="ana@example.com"|value="ana@example.com"[^>]*name="email"/);
  assert.match(r.texto, /<form[^>]*novalidate/);
  const campos = [...r.texto.matchAll(/<(input|textarea|select)\b[^>]*>/g)].map((m) => m[0]);
  assert.deepEqual(campos.filter((c) => !/type="hidden"/.test(c)).length, 1, JSON.stringify(campos));
  assert.match(r.texto, new RegExp(`href="/agenda\\?profesional=${e.a.fisio}&amp;dia=11/11/2026"`));
});

test('FR-041 FR-023 la página indica la hora local de la cita', async () => {
  const visible = textoVisible((await abrir()).texto);
  assert.match(visible, /Horas en hora peninsular/);
  assert.match(visible, /11\/11\/2026, de 16:00 a 16:45/);
});

test('FR-041 se puede cambiar el correo desde citas en cualquier estado', async () => {
  const estados = [['10:00', 'completada'], ['12:00', 'cancelada'], ['14:00', 'no_asistida'], ['18:00', 'reservada']];
  for (const [horaInicio, estado] of estados) {
    const otra = cita(`${DIA}T${horaInicio}`, estado);
    assert.equal((await abrir(otra)).estado, 200, estado);
    const direccion = `${estado.replace('_', '')}@example.com`;
    assert.equal((await guardar(direccion, otra)).estado, 303, estado);
    assert.equal(ficha().email, direccion);
  }
});

test('FR-004 FR-041 una cita de otra clínica o inexistente da 404 y no cambia nada', async () => {
  const ajena = sesionDePrueba(e.bd, e.b.id);
  const antes = ficha();
  assert.equal((await abrir(id, ajena)).estado, 404);
  assert.equal((await guardar('x@example.com', id, ajena)).estado, 404);
  assert.equal((await abrir(999_999)).estado, 404);
  assert.equal((await guardar('x@example.com', 999_999)).estado, 404);
  assert.equal((await abrir('abc')).estado, 404);
  assert.deepEqual(ficha(), antes);
});

test('FR-041 el nombre del paciente se escapa', async () => {
  const raro = Number(e.bd.prepare("INSERT INTO paciente (clinica_id, nombre, telefono) VALUES (?, '<b>Raro</b> & Cía', '600 000 009')")
    .run(e.a.id).lastInsertRowid);
  const r = await abrir(cita(`${DIA}T18:00`, 'reservada', raro));
  assert.doesNotMatch(r.texto, /<b>Raro<\/b>/);
  assert.match(r.texto, /&lt;b&gt;Raro&lt;\/b&gt; &amp; Cía/);
});
