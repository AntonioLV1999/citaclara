import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accionesPermitidas, ACCIONES, dentroDePlazo, estadoDeAccion, limiteCancelacion, sinCerrar,
} from '../../src/dominio/estados.js';

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

test('FR-040 sinCerrar: reservada con inicio igual o anterior a «ahora»', () => {
  assert.equal(sinCerrar(cita(), '2026-11-11T10:00'), true);
  assert.equal(sinCerrar(cita(), '2026-11-20T18:00'), true);
  assert.equal(sinCerrar(cita(), '2026-11-11T09:59'), false);
});

test('FR-040 sinCerrar es falso en completadas, canceladas y no asistidas pasadas', () => {
  for (const estado of ['completada', 'cancelada', 'no_asistida']) {
    assert.equal(sinCerrar(cita(estado), '2026-11-20T18:00'), false, estado);
  }
});

test('RN5 accionesPermitidas usa la misma frontera que sinCerrar', () => {
  for (const ahora of ['2026-11-11T09:59', '2026-11-11T10:00', '2026-11-11T10:01']) {
    const cerrables = accionesPermitidas(cita(), ahora).includes('completar');
    assert.equal(cerrables, sinCerrar(cita(), ahora), ahora);
  }
});

test('RN8 limiteCancelacion es el inicio menos 2 horas en hora local', () => {
  assert.equal(limiteCancelacion('2026-11-16T18:00'), '2026-11-16T16:00');
  assert.equal(limiteCancelacion('2027-03-29T09:00'), '2027-03-29T07:00');
  assert.equal(limiteCancelacion('2026-10-26T09:00'), '2026-10-26T07:00');
});

test('RN8 dentroDePlazo incluye el minuto límite y excluye el siguiente', () => {
  assert.equal(dentroDePlazo('2026-11-16T18:00', '2026-11-16T15:59'), true);
  assert.equal(dentroDePlazo('2026-11-16T18:00', '2026-11-16T16:00'), true);
  assert.equal(dentroDePlazo('2026-11-16T18:00', '2026-11-16T16:01'), false);
  assert.equal(dentroDePlazo('2026-11-16T18:00', '2026-11-16T18:30'), false);
});
