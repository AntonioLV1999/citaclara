import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularHuecos } from '../../src/dominio/huecos.js';

const DIA = '2026-11-11'; // miércoles
const ANTES = '2026-11-01T08:00';
const t = (hhmm) => `${DIA}T${hhmm}`;
const cita = (inicio, fin, estado = 'reservada') => ({ inicio: t(inicio), fin: t(fin), estado });
const tramo = (inicio, fin, reservable = true) => ({ inicio: t(inicio), fin: t(fin), reservable });

test('FR-016 un día vacío es un único hueco de 09:00 a 20:00', () => {
  assert.deepEqual(calcularHuecos({ dia: DIA, citas: [], ahora: ANTES }), [tramo('09:00', '20:00')]);
});

test('FR-016 una cita parte el día en dos huecos', () => {
  assert.deepEqual(
    calcularHuecos({ dia: DIA, citas: [cita('10:00', '10:45')], ahora: ANTES }),
    [tramo('09:00', '10:00'), tramo('10:45', '20:00')],
  );
});

test('FR-016 entre citas contiguas no hay hueco', () => {
  assert.deepEqual(
    calcularHuecos({ dia: DIA, citas: [cita('10:45', '11:30'), cita('10:00', '10:45')], ahora: ANTES }),
    [tramo('09:00', '10:00'), tramo('11:30', '20:00')],
  );
});

test('FR-016 las citas que tocan la apertura o el cierre no dejan hueco en ese extremo', () => {
  assert.deepEqual(
    calcularHuecos({ dia: DIA, citas: [cita('09:00', '09:45'), cita('19:15', '20:00')], ahora: ANTES }),
    [tramo('09:45', '19:15')],
  );
});

test('FR-016 un día lleno no tiene huecos', () => {
  assert.deepEqual(calcularHuecos({ dia: DIA, citas: [cita('09:00', '20:00')], ahora: ANTES }), []);
});

test('FR-016 las citas completadas ocupan', () => {
  assert.deepEqual(
    calcularHuecos({ dia: DIA, citas: [cita('10:00', '11:00', 'completada')], ahora: ANTES }),
    [tramo('09:00', '10:00'), tramo('11:00', '20:00')],
  );
});

test('FR-016 las citas canceladas y no asistidas no ocupan', () => {
  assert.deepEqual(
    calcularHuecos({
      dia: DIA,
      citas: [cita('10:00', '11:00', 'cancelada'), cita('12:00', '13:00', 'no_asistida')],
      ahora: ANTES,
    }),
    [tramo('09:00', '20:00')],
  );
});

test('FR-012 un fin de semana no tiene huecos, porque la clínica no abre', () => {
  assert.deepEqual(calcularHuecos({ dia: '2026-11-07', citas: [], ahora: ANTES }), []);
  assert.deepEqual(calcularHuecos({ dia: '2026-11-08', citas: [], ahora: ANTES }), []);
});

test('FR-018 hoy, el tramo ya pasado no es reservable', () => {
  assert.deepEqual(
    calcularHuecos({ dia: DIA, citas: [], ahora: t('12:00') }),
    [tramo('09:00', '12:00', false), tramo('12:00', '20:00')],
  );
});

test('FR-018 hoy, lo reservable empieza en el siguiente cuarto de hora', () => {
  assert.deepEqual(
    calcularHuecos({ dia: DIA, citas: [], ahora: t('12:07') }),
    [tramo('09:00', '12:15', false), tramo('12:15', '20:00')],
  );
});

test('FR-018 hoy, un hueco entero en el pasado no es reservable', () => {
  assert.deepEqual(
    calcularHuecos({ dia: DIA, citas: [cita('10:00', '10:45')], ahora: t('12:00') }),
    [tramo('09:00', '10:00', false), tramo('10:45', '12:00', false), tramo('12:00', '20:00')],
  );
});

test('FR-018 después del último cuarto de hora de hoy ya no hay nada reservable', () => {
  assert.deepEqual(
    calcularHuecos({ dia: DIA, citas: [], ahora: t('19:50') }),
    [tramo('09:00', '20:00', false)],
  );
});

test('FR-018 un día pasado no tiene nada reservable', () => {
  assert.deepEqual(
    calcularHuecos({ dia: DIA, citas: [cita('10:00', '10:45')], ahora: '2026-11-12T09:00' }),
    [tramo('09:00', '10:00', false), tramo('10:45', '20:00', false)],
  );
});
