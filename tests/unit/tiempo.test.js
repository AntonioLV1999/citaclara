import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ahoraEnZona, ahoraLocal, diaDeSemana, esDiaLaborable, esFechaValida, esMomentoValido, leerDia, sumarDias,
  sumarMinutos,
} from '../../src/dominio/tiempo.js';

test('FR-023 ahoraEnZona da la hora local de Madrid en invierno y en verano', () => {
  assert.equal(ahoraEnZona(new Date('2026-01-15T11:30:00Z'), 'Europe/Madrid'), '2026-01-15T12:30');
  assert.equal(ahoraEnZona(new Date('2026-07-15T11:30:00Z'), 'Europe/Madrid'), '2026-07-15T13:30');
});

test('FR-023 ahoraEnZona da la hora local de Canarias en invierno y en verano', () => {
  assert.equal(ahoraEnZona(new Date('2026-01-15T11:30:00Z'), 'Atlantic/Canary'), '2026-01-15T11:30');
  assert.equal(ahoraEnZona(new Date('2026-07-15T11:30:00Z'), 'Atlantic/Canary'), '2026-07-15T12:30');
});

test('FR-023 ahoraEnZona escribe la medianoche como 00:00 y cambia de día según la zona', () => {
  assert.equal(ahoraEnZona(new Date('2026-11-05T23:00:00Z'), 'Europe/Madrid'), '2026-11-06T00:00');
  assert.equal(ahoraEnZona(new Date('2026-11-05T23:00:00Z'), 'Atlantic/Canary'), '2026-11-05T23:00');
});

test('FR-023 ahoraEnZona cruza el fin de año según la zona', () => {
  assert.equal(ahoraEnZona(new Date('2026-12-31T23:30:00Z'), 'Europe/Madrid'), '2027-01-01T00:30');
  assert.equal(ahoraEnZona(new Date('2026-12-31T23:30:00Z'), 'Atlantic/Canary'), '2026-12-31T23:30');
});

test('FR-025 ahoraEnZona acierta en la madrugada del cambio de hora del 25/10/2026', () => {
  assert.equal(ahoraEnZona(new Date('2026-10-25T00:30:00Z'), 'Europe/Madrid'), '2026-10-25T02:30');
  assert.equal(ahoraEnZona(new Date('2026-10-25T01:30:00Z'), 'Europe/Madrid'), '2026-10-25T02:30');
  assert.equal(ahoraEnZona(new Date('2026-10-25T02:30:00Z'), 'Europe/Madrid'), '2026-10-25T03:30');
  assert.equal(ahoraEnZona(new Date('2026-10-25T00:30:00Z'), 'Atlantic/Canary'), '2026-10-25T01:30');
  assert.equal(ahoraEnZona(new Date('2026-10-25T01:30:00Z'), 'Atlantic/Canary'), '2026-10-25T01:30');
});

test('RN3 sumarMinutos suma dentro del día', () => {
  assert.equal(sumarMinutos('2026-11-05T10:00', 45), '2026-11-05T10:45');
});

test('RN3 sumarMinutos pasa de día, de mes y de año', () => {
  assert.equal(sumarMinutos('2026-11-05T23:30', 45), '2026-11-06T00:15');
  assert.equal(sumarMinutos('2026-11-30T23:30', 60), '2026-12-01T00:30');
  assert.equal(sumarMinutos('2026-12-31T23:30', 60), '2027-01-01T00:30');
});

test('FR-025 sumarMinutos no conoce el cambio de hora: opera sobre la hora de pared', () => {
  assert.equal(sumarMinutos('2026-10-25T01:30', 120), '2026-10-25T03:30');
});

test('FR-025 sumarMinutos no depende de la zona del proceso', () => {
  const zona = process.env.TZ;
  try {
    for (const tz of ['Europe/Madrid', 'Atlantic/Canary', 'America/New_York', 'Asia/Tokyo']) {
      process.env.TZ = tz;
      assert.equal(sumarMinutos('2026-03-29T01:30', 60), '2026-03-29T02:30');
    }
  } finally {
    if (zona === undefined) delete process.env.TZ; else process.env.TZ = zona;
  }
});

test('FR-032 sumarDias mueve fechas sin mirar el reloj', () => {
  assert.equal(sumarDias('2026-11-02', -56), '2026-09-07');
  assert.equal(sumarDias('2026-12-28', 7), '2027-01-04');
});

test('FR-012 diaDeSemana devuelve 0 para el domingo y 1 para el lunes', () => {
  assert.equal(diaDeSemana('2026-11-01'), 0);
  assert.equal(diaDeSemana('2026-11-02'), 1);
  assert.equal(diaDeSemana('2026-11-07T10:00'), 6);
});

test('FR-012 esDiaLaborable solo acepta de lunes a viernes', () => {
  assert.equal(esDiaLaborable('2026-11-02'), true);
  assert.equal(esDiaLaborable('2026-11-06'), true);
  assert.equal(esDiaLaborable('2026-11-07'), false);
  assert.equal(esDiaLaborable('2026-11-08T12:00'), false);
});

test('FR-012 esFechaValida rechaza fechas que no existen en el calendario', () => {
  assert.equal(esFechaValida('2026-11-05'), true);
  assert.equal(esFechaValida('2028-02-29'), true);
  assert.equal(esFechaValida('2026-02-29'), false);
  assert.equal(esFechaValida('2026-13-01'), false);
  assert.equal(esFechaValida('05/11/2026'), false);
  assert.equal(esFechaValida(''), false);
  assert.equal(esFechaValida(undefined), false);
});

test('FR-024 leerDia convierte dd/mm/aaaa y deja igual lo demás', () => {
  assert.equal(leerDia('05/11/2026'), '2026-11-05');
  assert.equal(leerDia(' 5/1/2026 '), '2026-01-05');
  assert.equal(leerDia('2026-11-05'), '2026-11-05');
  assert.equal(leerDia('mañana'), 'mañana');
  assert.equal(leerDia(undefined), undefined);
});

test('FR-043 ahoraLocal devuelve el momento fijado, en las dos zonas, aunque el reloj avance', () => {
  let instante = Date.parse('2026-11-20T09:00:00Z');
  const contexto = { ahora: () => new Date(instante), momentoFijado: '2026-11-04T12:00' };
  for (const zona of ['Europe/Madrid', 'Atlantic/Canary']) {
    assert.equal(ahoraLocal(contexto, zona), '2026-11-04T12:00');
    instante += 3 * 3_600_000;
    assert.equal(ahoraLocal(contexto, zona), '2026-11-04T12:00');
  }
});

test('FR-043 sin momento fijado, ahoraLocal es la hora local del reloj', () => {
  const reloj = () => new Date('2026-11-05T09:30:00Z');
  for (const zona of ['Europe/Madrid', 'Atlantic/Canary']) {
    assert.equal(ahoraLocal({ ahora: reloj, momentoFijado: null }, zona), ahoraEnZona(reloj(), zona));
    assert.equal(ahoraLocal({ ahora: reloj }, zona), ahoraEnZona(reloj(), zona));
  }
});

test('FR-043 esMomentoValido solo acepta AAAA-MM-DDTHH:MM con fecha y hora posibles', () => {
  assert.equal(esMomentoValido('2026-11-04T12:00'), true);
  assert.equal(esMomentoValido('2028-02-29T00:00'), true);
  assert.equal(esMomentoValido('2026-11-04T23:59'), true);
  for (const malo of ['2026-11-04 12:00', '2026-02-30T12:00', '2026-11-04T24:00', '2026-11-04T12:00:00',
    '2026-11-04T12:5', '2026-11-04T12:60', '', undefined, null]) {
    assert.equal(esMomentoValido(malo), false, String(malo));
  }
});
