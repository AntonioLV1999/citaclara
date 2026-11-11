import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularPanel, capacidadSemanal, clasificar, periodoDe, semanaDe,
} from '../../src/dominio/analitica.js';

const PROFESIONALES = [{ id: 1, nombre: 'María' }, { id: 2, nombre: 'Jorge' }];
const SERVICIOS = [
  { id: 10, nombre: 'Sesión', duracion_min: 45, precio_centimos: 4000 },
  { id: 11, nombre: 'Primera visita', duracion_min: 60, precio_centimos: 5000 },
];
const HOY = '2026-11-04';
const AHORA = `${HOY}T12:00`;

/** Cita del periodo del 07/09/2026 al 01/11/2026, con el servicio y su duración y precio. */
function cita(estado, { profesional = 1, servicio = 10, inicio = '2026-09-08T10:00' } = {}) {
  const { duracion_min, precio_centimos } = SERVICIOS.find((s) => s.id === servicio);
  return { profesional_id: profesional, servicio_id: servicio, estado, inicio, duracion_min, precio_centimos };
}

const panel = (citas, { hoy = HOY, ahora = AHORA } = {}) =>
  calcularPanel({ hoy, ahora, profesionales: PROFESIONALES, servicios: SERVICIOS, citas });

test('RA1 con «hoy» en miércoles, el periodo son las 8 semanas completas anteriores', () => {
  const periodo = periodoDe('2026-11-04');
  assert.equal(periodo.inicio, '2026-09-07');
  assert.equal(periodo.fin, '2026-11-01');
  assert.equal(periodo.semanas.length, 8);
  assert.deepEqual(periodo.semanas[0], { inicio: '2026-09-07', fin: '2026-09-13' });
  assert.deepEqual(periodo.semanas[7], { inicio: '2026-10-26', fin: '2026-11-01' });
});

test('RA1 el periodo es el mismo todo el lunes y todo el domingo de la semana en curso', () => {
  for (const hoy of ['2026-11-09', '2026-11-15']) {
    const periodo = periodoDe(hoy);
    assert.equal(periodo.inicio, '2026-09-14', hoy);
    assert.equal(periodo.fin, '2026-11-08', hoy);
  }
});

test('RA1 la semana en curso nunca está en el periodo', () => {
  const periodo = periodoDe('2026-11-04');
  assert.ok(periodo.semanas.every((s) => s.fin < '2026-11-02'));
  assert.equal(periodo.lunesEnCurso, '2026-11-02');
});

test('RA2 una cita pertenece a la semana de su fecha local de inicio', () => {
  const periodo = periodoDe('2026-11-04');
  assert.equal(semanaDe(periodo, '2026-09-07T00:00'), 0);
  assert.equal(semanaDe(periodo, '2026-09-13T23:45'), 0);
  assert.equal(semanaDe(periodo, '2026-09-14T00:00'), 1);
  assert.equal(semanaDe(periodo, '2026-11-01T23:45'), 7);
  assert.equal(semanaDe(periodo, '2026-11-02T00:00'), -1);
  assert.equal(semanaDe(periodo, '2026-09-06T23:45'), -1);
});

test('004/CL días de cambio de hora: las semanas siguen siendo de lunes a domingo', () => {
  const periodo = periodoDe('2027-04-07');
  assert.equal(periodo.inicio, '2027-02-08');
  assert.equal(periodo.fin, '2027-04-04');
  const conCambio = periodo.semanas.find((s) => s.inicio <= '2027-03-28' && '2027-03-28' <= s.fin);
  assert.deepEqual(conCambio, { inicio: '2027-03-22', fin: '2027-03-28' });
  assert.equal(semanaDe(periodo, '2027-03-29T09:00'), 7);
});

test('RA4 la capacidad semanal sale del horario de FR-012 de la 001: 55 horas', () => {
  assert.equal(capacidadSemanal(), 3300);
});

test('RA6 una cita reservada cuyo inicio ya ha llegado está sin cerrar', () => {
  assert.equal(clasificar(cita('reservada', { inicio: AHORA }), AHORA), 'sin_cerrar');
  assert.equal(clasificar(cita('reservada', { inicio: '2026-11-04T12:15' }), AHORA), 'fuera');
  assert.equal(clasificar(cita('completada'), AHORA), 'completada');
  assert.equal(clasificar(cita('no_asistida'), AHORA), 'no_asistida');
  assert.equal(clasificar(cita('cancelada'), AHORA), 'cancelada');
});

test('RA6 las citas sin cerrar del periodo se cuentan para el aviso', () => {
  const resultado = panel([cita('reservada'), cita('reservada', { inicio: '2026-10-30T18:00' }), cita('completada')]);
  assert.equal(resultado.sinCerrar, 2);
  assert.equal(resultado.capacidadSemanal, 3300);
  assert.equal(resultado.periodo.inicio, '2026-09-07');
});

test('RA5 los ingresos suman en céntimos el precio de cada cita completada', () => {
  const { ingresos } = panel([
    cita('completada'), cita('completada'), cita('completada', { servicio: 11 }),
    cita('no_asistida'), cita('cancelada'), cita('reservada'), cita('no_asistida', { servicio: 11 }),
  ]);
  assert.deepEqual(ingresos.servicios.map(({ servicio, completadas, centimos }) => [servicio.nombre, completadas, centimos]), [
    ['Sesión', 2, 8000],
    ['Primera visita', 1, 5000],
  ]);
  assert.equal(ingresos.total, 13000);
});

test('RA5 un servicio sin completadas aparece con 0 citas y 0 céntimos, en orden de servicio', () => {
  const { ingresos } = panel([cita('completada', { servicio: 11 }), cita('cancelada')]);
  assert.deepEqual(ingresos.servicios.map((s) => [s.servicio.id, s.completadas, s.centimos]), [[10, 0, 0], [11, 1, 5000]]);
});

test('RA5 las citas de fuera del periodo no suman', () => {
  const { ingresos } = panel([cita('completada', { inicio: '2026-11-02T10:00' }), cita('completada', { inicio: '2026-09-04T10:00' })]);
  assert.equal(ingresos.total, 0);
});

test('004/FR-013 el total de ingresos es la suma exacta de los servicios', () => {
  const citas = Array.from({ length: 37 }, (_, i) => cita('completada', { servicio: i % 3 ? 10 : 11, inicio: `2026-09-${String(8 + (i % 20)).padStart(2, '0')}T10:00` }));
  const { ingresos } = panel(citas);
  assert.equal(ingresos.total, ingresos.servicios.reduce((suma, s) => suma + s.centimos, 0));
  assert.equal(ingresos.total, 13 * 5000 + 24 * 4000);
});

test('RA3 la tasa es no asistidas entre completadas y no asistidas, sin las canceladas', () => {
  const canceladas = ['recepcion', 'portal', 'correo'].map((origen) => ({ ...cita('cancelada'), origen_cancelacion: origen }));
  const { noAsistencia } = panel([cita('completada'), cita('completada'), cita('completada'), cita('no_asistida'), ...canceladas]);
  const [maria, jorge] = noAsistencia.profesionales;
  assert.equal(maria.profesional.nombre, 'María');
  assert.deepEqual([maria.completadas, maria.noAsistidas, maria.canceladas], [3, 1, 3]);
  assert.deepEqual(maria.tasa, { numerador: 1, denominador: 4 });
  assert.deepEqual(jorge.tasa, { numerador: 0, denominador: 0 });
});

test('RA3 un profesional con citas y ninguna no asistida tiene una tasa real de cero', () => {
  const { noAsistencia } = panel([cita('completada', { profesional: 2 }), cita('cancelada', { profesional: 2 })]);
  assert.deepEqual(noAsistencia.profesionales[1].tasa, { numerador: 0, denominador: 1 });
});

test('RA7 la tasa de la clínica sale de los recuentos totales, no de promediar tasas', () => {
  const citas = [
    cita('completada'), cita('no_asistida'),
    ...Array.from({ length: 8 }, () => cita('completada', { profesional: 2 })),
  ];
  const { noAsistencia } = panel(citas);
  assert.deepEqual(noAsistencia.clinica, {
    completadas: 9, noAsistidas: 1, canceladas: 0, tasa: { numerador: 1, denominador: 10 },
  });
});

test('RA4 la ocupación es el tiempo de las completadas, por la duración de su servicio, entre la capacidad', () => {
  const { ocupacion } = panel([
    cita('completada'), cita('completada', { servicio: 11, inicio: '2026-09-15T10:00' }),
    cita('no_asistida'), cita('cancelada'), cita('reservada'),
  ]);
  const [maria] = ocupacion.profesionales;
  assert.deepEqual(maria.semanas[0], { minutos: 45, ocupacion: { numerador: 45, denominador: 3300 } });
  assert.deepEqual(maria.semanas[1], { minutos: 60, ocupacion: { numerador: 60, denominador: 3300 } });
  assert.deepEqual(maria.periodo, { capacidad: 26400, minutos: 105, ocupacion: { numerador: 105, denominador: 26400 } });
});

test('RA4 el tiempo de una cita es la duración de su servicio, no la resta de sus horas', () => {
  const { ocupacion } = panel([{ ...cita('completada'), fin: '2026-09-08T12:00' }]);
  assert.equal(ocupacion.profesionales[0].periodo.minutos, 45);
});

test('RA4 la capacidad de la clínica es la de un profesional por el número de profesionales', () => {
  const { ocupacion } = panel([cita('completada'), cita('completada', { profesional: 2 })]);
  assert.deepEqual(ocupacion.clinica, { capacidad: 52800, minutos: 90, ocupacion: { numerador: 90, denominador: 52800 } });
});

test('004/CL profesional sin citas en una semana: ocupación 0,0 % y no asistencia sin datos', () => {
  const { ocupacion, noAsistencia } = panel([cita('completada')]);
  assert.deepEqual(ocupacion.profesionales[1].semanas[0], { minutos: 0, ocupacion: { numerador: 0, denominador: 3300 } });
  assert.deepEqual(noAsistencia.profesionales[1].tasa, { numerador: 0, denominador: 0 });
});

test('004/CL festivos: un lunes festivo cuenta como un día normal y no reduce la capacidad', () => {
  const { ocupacion } = panel([cita('completada', { inicio: '2026-10-12T10:00' })]);
  assert.deepEqual(ocupacion.profesionales[0].semanas[5].ocupacion, { numerador: 45, denominador: 3300 });
});

test('RA7 la ocupación del periodo sale de los minutos del periodo, no de promediar semanas', () => {
  const { ocupacion } = panel([cita('completada'), cita('completada'), cita('completada', { inicio: '2026-09-15T10:00' })]);
  assert.deepEqual(ocupacion.profesionales[0].periodo.ocupacion, { numerador: 135, denominador: 26400 });
});
