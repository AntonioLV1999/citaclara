import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';
import {
  ejecutarEnMemoria, enlacesDe, ponerCorreo, recordatorioDe, sha256, tokenDe,
} from '../ayudas/recordatorios.js';
import { leerEml } from '../ayudas/correo.js';
import { cancelarCita } from '../../src/servicios/cancelar.js';
import { guardarCorreo } from '../../src/servicios/correo-ficha.js';

const HOY = '2026-11-02';
const AHORA = `${HOY}T08:00`;
const MANANA = '2026-11-03';
const PASADO = '2026-11-04';
let e;
let ana;
let oscar;
let luis;

beforeEach(() => {
  e = crearEscenario();
  [ana, oscar, luis] = e.a.pacientes;
  ponerCorreo(e.bd, ana, 'ana@example.com');
  ponerCorreo(e.bd, oscar, 'oscar@example.com');
});
afterEach(() => e.cerrar());

const cita = (paciente, inicio, extra = {}) => citaDirecta(e.bd, {
  clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente, inicio, ...extra,
});
const ejecutar = (momento = AHORA, opciones = {}) => ejecutarEnMemoria(e.bd, momento, { clinicas: [e.a], ...opciones });
const contar = (tabla) => e.bd.prepare(`SELECT count(*) AS n FROM ${tabla}`).get().n;

test('003/H1-E1 RR2 una cita reservada de mañana con correo recibe un recordatorio con su enlace de cancelación', () => {
  const id = cita(ana, `${MANANA}T12:00`);
  const { mensajes, resumenes } = ejecutar();

  assert.equal(mensajes.length, 1);
  const [mensaje] = mensajes;
  assert.equal(mensaje.citaId, id);
  assert.equal(mensaje.para, 'ana@example.com');
  const { cabeceras, cuerpo } = leerEml(mensaje.texto);
  assert.equal(cabeceras.to, 'ana@example.com');
  for (const dato of ['Clínica Norte', 'Ana Núñez', 'María', 'Sesión de fisioterapia', 'martes 03/11/2026', '12:00']) {
    assert.ok(cuerpo.includes(dato), dato);
  }
  assert.deepEqual({ ...recordatorioDe(e.bd, id) }, {
    cita_id: id, enviado_en: AHORA, direccion: 'ana@example.com', modo: 'simulado',
  });
  const token = tokenDe(mensaje);
  assert.ok(cuerpo.includes(`https://citas.example.com/e/${token}\r\n`));
  assert.deepEqual(enlacesDe(e.bd, id).map((f) => f.token_hash), [sha256(token)]);
  assert.deepEqual(resumenes.map(({ enviados, sinCorreo, fallidos }) => [enviados, sinCorreo, fallidos]), [[1, 0, 0]]);
});

test('003/H1-E2 RR1 003/FR-002 una segunda ejecución el mismo día y otra al día siguiente no envían nada más', () => {
  const id = cita(ana, `${MANANA}T12:00`);
  assert.equal(ejecutar().mensajes.length, 1);
  assert.equal(ejecutar(`${HOY}T08:00`).mensajes.length, 0);
  assert.equal(ejecutar(`${HOY}T15:30`).mensajes.length, 0);
  assert.equal(ejecutar(`${MANANA}T08:00`).mensajes.length, 0);
  assert.equal(contar('recordatorio'), 1);
  assert.equal(enlacesDe(e.bd, id).length, 1);
});

test('003/H1-E4 RR3 las citas de hoy y de pasado mañana no reciben nada', () => {
  cita(ana, `${HOY}T18:00`);
  cita(ana, `${PASADO}T09:00`);
  cita(oscar, `${PASADO}T10:00`);
  const { mensajes, resumenes } = ejecutar();
  assert.equal(mensajes.length, 0);
  assert.equal(contar('recordatorio'), 0);
  assert.equal(resumenes[0].ventana, MANANA);
});

test('003/H1-E5 RR2 las citas completadas, canceladas y no asistidas de mañana no reciben nada', () => {
  cita(ana, `${MANANA}T09:00`, { estado: 'completada' });
  cita(ana, `${MANANA}T10:00`, { estado: 'cancelada' });
  cita(oscar, `${MANANA}T11:00`, { estado: 'no_asistida' });
  const { mensajes, resumenes } = ejecutar();
  assert.equal(mensajes.length, 0);
  assert.equal(contar('recordatorio'), 0);
  assert.deepEqual([resumenes[0].enviados, resumenes[0].sinCorreo, resumenes[0].fallidos], [0, 0, 0]);
});

test('003/H1-E6 RR2 la cita de un paciente sin correo no recibe nada, las demás sí, y el resumen la cuenta', () => {
  const sinCorreo = cita(luis, `${MANANA}T09:00`);
  cita(ana, `${MANANA}T11:00`);
  const { mensajes, resumenes } = ejecutar();
  assert.equal(mensajes.length, 1);
  assert.equal(recordatorioDe(e.bd, sinCorreo), undefined);
  assert.equal(enlacesDe(e.bd, sinCorreo).length, 0);
  assert.equal(resumenes[0].sinCorreo, 1);
  assert.equal(resumenes[0].enviados, 1);
});

test('003/H1-E7 un paciente con dos citas mañana recibe un recordatorio por cada una, cada uno con su enlace', () => {
  const primera = cita(ana, `${MANANA}T09:00`);
  const segunda = cita(ana, `${MANANA}T17:00`, { profesional: e.a.nutri, servicio: e.a.consulta });
  const { mensajes } = ejecutar();
  assert.deepEqual(mensajes.map((m) => m.citaId), [primera, segunda]);
  const [t1, t2] = mensajes.map(tokenDe);
  assert.notEqual(t1, t2);
  assert.deepEqual(enlacesDe(e.bd, primera).map((f) => f.token_hash), [sha256(t1)]);
  assert.deepEqual(enlacesDe(e.bd, segunda).map((f) => f.token_hash), [sha256(t2)]);
});

test('003/H1-E9 RR5 una cita recordada y cancelada para crear otra de pasado mañana: la nueva recibe su recordatorio', () => {
  const antigua = cita(ana, `${MANANA}T12:00`);
  assert.equal(ejecutar().mensajes.length, 1);
  const r = cancelarCita({ bd: e.bd, clinica: e.a, ahora: () => new Date(), momentoFijado: `${HOY}T10:00` }, antigua, 'recepcion');
  assert.equal(r.resultado, 'cancelada_ahora');
  const nueva = cita(ana, `${PASADO}T12:00`);

  const { mensajes } = ejecutar(`${MANANA}T08:00`);
  assert.deepEqual(mensajes.map((m) => m.citaId), [nueva]);
  assert.ok(recordatorioDe(e.bd, antigua));
  assert.ok(recordatorioDe(e.bd, nueva));
});

test('RR2 el correo es el de la ficha al enviar: cambiado antes de ejecutar va a la dirección nueva, y quitado cuenta como sin correo', () => {
  const contexto = { bd: e.bd, clinica: e.a };
  const cambiada = cita(ana, `${MANANA}T09:00`);
  const quitada = cita(oscar, `${MANANA}T10:00`);
  assert.equal(guardarCorreo(contexto, cambiada, 'ana.nueva@example.com').ok, true);
  assert.equal(guardarCorreo(contexto, quitada, '').ok, true);

  const { mensajes, resumenes } = ejecutar();
  assert.deepEqual(mensajes.map((m) => [m.citaId, m.para]), [[cambiada, 'ana.nueva@example.com']]);
  assert.equal(leerEml(mensajes[0].texto).cabeceras.to, 'ana.nueva@example.com');
  assert.equal(recordatorioDe(e.bd, cambiada).direccion, 'ana.nueva@example.com');
  assert.equal(recordatorioDe(e.bd, quitada), undefined);
  assert.equal(resumenes[0].sinCorreo, 1);
});

test('003/CL Cita cancelada justo antes del envío: cancelada entre la consulta de la ventana y su reserva, no sale', () => {
  const primera = cita(ana, `${MANANA}T09:00`);
  const segunda = cita(oscar, `${MANANA}T10:00`);
  const recepcion = { bd: e.bd, clinica: e.a, ahora: () => new Date(), momentoFijado: AHORA };
  const { mensajes, resumenes } = ejecutar(AHORA, {
    // Mientras se envía la primera, recepción cancela la segunda.
    enviar: (mensaje) => {
      if (mensaje.citaId === primera) cancelarCita(recepcion, segunda, 'recepcion');
    },
  });
  assert.deepEqual(mensajes.map((m) => m.citaId), [primera]);
  assert.equal(recordatorioDe(e.bd, segunda), undefined);
  assert.equal(enlacesDe(e.bd, segunda).length, 0);
  assert.deepEqual([resumenes[0].enviados, resumenes[0].fallidos], [1, 0]);
});

test('003/CL Cita creada después de la ejecución: no se recuerda hasta que se lanza otra ejecución ese día', () => {
  ejecutar();
  const tardia = cita(ana, `${MANANA}T16:00`);
  const deHoy = cita(oscar, `${HOY}T19:00`);
  assert.equal(recordatorioDe(e.bd, tardia), undefined);
  // Nadie lanza el proceso: al día siguiente ya no está en la ventana.
  assert.equal(ejecutar(`${MANANA}T08:00`).mensajes.length, 0);
  assert.equal(recordatorioDe(e.bd, tardia), undefined);
  assert.equal(recordatorioDe(e.bd, deHoy), undefined);
});

test('003/CL Cita creada después de la ejecución: lanzado a mano ese mismo día, las de mañana sí se avisan', () => {
  ejecutar();
  const tardia = cita(ana, `${MANANA}T16:00`);
  const { mensajes } = ejecutar(`${HOY}T13:00`);
  assert.deepEqual(mensajes.map((m) => m.citaId), [tardia]);
});

test('003/CL Un día sin ejecución: la ejecución del día siguiente no recuerda las citas de ese día', () => {
  const olvidada = cita(ana, `${MANANA}T12:00`);
  const siguiente = cita(oscar, `${PASADO}T12:00`);
  const { mensajes } = ejecutar(`${MANANA}T08:00`);
  assert.deepEqual(mensajes.map((m) => m.citaId), [siguiente]);
  assert.equal(recordatorioDe(e.bd, olvidada), undefined);
});

test('003/CL Correo compartido en una familia: dos fichas con el mismo correo reciben dos mensajes con enlaces distintos', () => {
  ponerCorreo(e.bd, oscar, 'ana@example.com');
  const deAna = cita(ana, `${MANANA}T09:00`);
  const deOscar = cita(oscar, `${MANANA}T10:00`);
  const { mensajes } = ejecutar();
  assert.deepEqual(mensajes.map((m) => [m.citaId, m.para]), [[deAna, 'ana@example.com'], [deOscar, 'ana@example.com']]);
  assert.notEqual(tokenDe(mensajes[0]), tokenDe(mensajes[1]));
  assert.match(mensajes[0].texto, /Hola, Ana Núñez:/);
  assert.match(mensajes[1].texto, /Hola, Óscar Peña:/);
});
