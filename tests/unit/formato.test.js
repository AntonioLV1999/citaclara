import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  avisoRelojFijado, enlaceTelefono, etiquetaCita, etiquetaEstado, etiquetaZona, euros, fecha, hora, horas,
  nombreDiaCorto, porcentaje, tramoCita,
} from '../../src/dominio/formato.js';

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

const cancelada = (origen, momento = '2026-11-08T19:30') => ({
  estado: 'cancelada', inicio: '2026-11-16T18:00', origen_cancelacion: origen, momento_cancelacion: momento,
});

test('FR-027 una cancelada por el portal o por el correo muestra fecha y hora, sin distinguir el canal', () => {
  const esperada = 'Cancelada por el paciente el 08/11/2026 a las 19:30';
  assert.equal(etiquetaCita(cancelada('portal')), esperada);
  assert.equal(etiquetaCita(cancelada('correo')), esperada);
});

test('FR-027 una cancelada por recepción se muestra como «Cancelada», sin fecha', () => {
  assert.equal(etiquetaCita(cancelada('recepcion')), 'Cancelada');
});

test('FR-027 FR-040 las demás citas llevan la etiqueta de su estado, también la sin cerrar', () => {
  const sinOrigen = { origen_cancelacion: null, momento_cancelacion: null, inicio: '2026-11-02T10:00' };
  assert.equal(etiquetaCita({ ...sinOrigen, estado: 'reservada' }), 'Reservada');
  assert.equal(etiquetaCita({ ...sinOrigen, estado: 'completada' }), 'Completada');
  assert.equal(etiquetaCita({ ...sinOrigen, estado: 'no_asistida' }), 'No asistida');
});

test('FR-027 la etiqueta de una cita nunca es «Pendiente de confirmar por la clínica»', () => {
  const sinOrigen = { origen_cancelacion: null, momento_cancelacion: null, inicio: '2026-11-02T10:00' };
  const etiquetas = [
    ...['reservada', 'completada', 'no_asistida'].map((estado) => etiquetaCita({ ...sinOrigen, estado })),
    ...['recepcion', 'portal', 'correo'].map((origen) => etiquetaCita(cancelada(origen))),
  ];
  for (const etiqueta of etiquetas) assert.doesNotMatch(etiqueta, /Pendiente de confirmar/);
});

test('FR-043 el aviso del reloj fijado lleva el día de la semana en minúscula, la fecha y la hora', () => {
  assert.equal(
    avisoRelojFijado('2026-11-04T12:00'),
    'Reloj de demostración: la hora está fijada en el miércoles 04/11/2026 a las 12:00 y no avanza.',
  );
  assert.equal(
    avisoRelojFijado('2027-03-29T07:05'),
    'Reloj de demostración: la hora está fijada en el lunes 29/03/2027 a las 07:05 y no avanza.',
  );
});

test('002/FR-010 nombreDiaCorto da el nombre corto del día, de domingo a sábado', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(nombreDiaCorto), ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']);
});

test('002/FR-008 tramoCita da el día, la fecha y las horas de inicio y fin, con raya', () => {
  assert.equal(tramoCita({ inicio: '2026-11-09T18:00', fin: '2026-11-09T18:45' }), 'lun 09/11/2026, 18:00\u201318:45');
  assert.equal(tramoCita({ inicio: '2026-11-11T11:15', fin: '2026-11-11T12:00' }), 'mié 11/11/2026, 11:15–12:00');
});

test('002/FR-011 enlaceTelefono deja solo los dígitos y el + inicial', () => {
  assert.equal(enlaceTelefono('000 200 000'), 'tel:000200000');
  assert.equal(enlaceTelefono('+34 600 000 003'), 'tel:+34600000003');
});

test('RA7 un porcentaje se redondea una sola vez, a un decimal', () => {
  assert.equal(porcentaje(13, 142), '9,2 %');
  assert.equal(porcentaje(46, 426), '10,8 %');
  assert.equal(porcentaje(50, 50), '100,0 %');
});

test('RA7 la mitad exacta se redondea hacia arriba', () => {
  assert.equal(porcentaje(1, 16), '6,3 %');
  assert.equal(porcentaje(1, 80), '1,3 %');
  assert.equal(porcentaje(1, 8), '12,5 %');
});

test('RA7 un cero real es 0,0 % y un denominador cero es «Sin datos»', () => {
  assert.equal(porcentaje(0, 50), '0,0 %');
  assert.equal(porcentaje(3, 0), 'Sin datos');
  assert.equal(porcentaje(0, 0), 'Sin datos');
});

test('004/FR-014 las horas se escriben exactas, sin redondear y con formato español', () => {
  assert.equal(horas(6180), '103 h');
  assert.equal(horas(4170), '69,5 h');
  assert.equal(horas(79200), '1.320 h');
  assert.equal(horas(16470), '274,5 h');
  assert.equal(horas(735), '12,25 h');
  assert.equal(horas(45), '0,75 h');
  assert.equal(horas(0), '0 h');
});
