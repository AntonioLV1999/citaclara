import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accionesPermitidas, ACCIONES, estadoDeAccion } from '../../src/dominio/estados.js';

const cita = (estado = 'reservada', inicio = '2026-11-11T10:00') => ({ estado, inicio });

test('RN5 antes de la hora de inicio solo se puede cancelar', () => {
  assert.deepEqual(accionesPermitidas(cita(), '2026-11-11T09:59'), ['cancelar']);
});

test('RN5 en la hora de inicio ya se puede completar y marcar como no asistida', () => {
  assert.deepEqual(accionesPermitidas(cita(), '2026-11-11T10:00'), ['completar', 'no-asistio', 'cancelar']);
});

test('RN5 después de la hora de inicio se mantienen las tres acciones', () => {
  assert.deepEqual(accionesPermitidas(cita(), '2026-11-20T18:00'), ['completar', 'no-asistio', 'cancelar']);
});

test('RN4 los estados de llegada no tienen acciones', () => {
  for (const estado of ['completada', 'cancelada', 'no_asistida']) {
    assert.deepEqual(accionesPermitidas(cita(estado), '2026-11-20T18:00'), []);
  }
});

test('RN6 una cita cancelada no puede pasar a no asistida', () => {
  assert.equal(accionesPermitidas(cita('cancelada'), '2026-11-20T18:00').includes('no-asistio'), false);
});

test('RN6 «no asistida» solo se alcanza con su acción y desde una cita reservada', () => {
  assert.equal(estadoDeAccion('no-asistio'), 'no_asistida');
  assert.equal(estadoDeAccion('completar'), 'completada');
  assert.equal(estadoDeAccion('cancelar'), 'cancelada');
  assert.equal(estadoDeAccion('borrar'), undefined);
});

test('FR-027 cada acción tiene un nombre comprensible', () => {
  assert.deepEqual(Object.keys(ACCIONES).sort(), ['cancelar', 'completar', 'no-asistio']);
  assert.equal(ACCIONES['no-asistio'].texto, 'No asistió');
});
