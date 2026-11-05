import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etiquetaEstado, etiquetaZona, euros, fecha, hora } from '../../src/dominio/formato.js';

test('FR-024 las fechas se muestran como dd/mm/aaaa', () => {
  assert.equal(fecha('2026-11-05'), '05/11/2026');
  assert.equal(fecha('2026-11-05T09:05'), '05/11/2026');
});

test('FR-024 las horas se muestran en formato de 24 horas', () => {
  assert.equal(hora('2026-11-05T09:05'), '09:05');
  assert.equal(hora('2026-11-05T19:45'), '19:45');
});

test('FR-026 los importes se muestran al céntimo con formato español', () => {
  assert.equal(euros(4000), '40,00 €');
  assert.equal(euros(5), '0,05 €');
  assert.equal(euros(0), '0,00 €');
  assert.equal(euros(50), '0,50 €');
});

test('FR-026 los importes llevan punto de millares desde cuatro cifras', () => {
  assert.equal(euros(123456), '1.234,56 €');
  assert.equal(euros(100000), '1.000,00 €');
  assert.equal(euros(123456789), '1.234.567,89 €');
});

test('FR-027 los estados se muestran con su etiqueta', () => {
  assert.equal(etiquetaEstado('reservada'), 'Reservada');
  assert.equal(etiquetaEstado('completada'), 'Completada');
  assert.equal(etiquetaEstado('cancelada'), 'Cancelada');
  assert.equal(etiquetaEstado('no_asistida'), 'No asistida');
});

test('FR-023 cada zona tiene su aviso de hora local', () => {
  assert.equal(etiquetaZona('Europe/Madrid'), 'Horas en hora peninsular');
  assert.equal(etiquetaZona('Atlantic/Canary'), 'Horas en hora de Canarias');
});
