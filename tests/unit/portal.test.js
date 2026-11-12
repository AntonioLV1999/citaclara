import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citasDelPaciente } from '../../src/dominio/portal.js';
import { tramoCita } from '../../src/dominio/formato.js';

const AHORA = '2026-11-04T12:00';
let siguiente = 0;

function cita(inicio, estado = 'reservada', { origen = null, momento = null, fin } = {}) {
  siguiente += 1;
  return {
    id: siguiente,
    inicio,
    fin: fin ?? `${inicio.slice(0, 11)}${String(Number(inicio.slice(11, 13)) + 1).padStart(2, '0')}${inicio.slice(13)}`,
    estado,
    origen_cancelacion: estado === 'cancelada' ? (origen ?? 'recepcion') : null,
    momento_cancelacion: estado === 'cancelada' ? (momento ?? inicio) : null,
  };
}

const ids = (lista) => lista.map((c) => c.id);

test('RP2 solo las reservadas que aún no han empezado son próximas; el resto va al historial', () => {
  const futura = cita('2026-11-04T12:01');
  const empiezaAhora = cita('2026-11-04T12:00');
  const empezada = cita('2026-11-04T11:45');
  const completada = cita('2026-10-30T10:00', 'completada');
  const noAsistida = cita('2026-10-29T10:00', 'no_asistida');
  const canceladaPasada = cita('2026-10-28T10:00', 'cancelada');
  const canceladaFutura = cita('2026-11-09T10:00', 'cancelada', { origen: 'portal', momento: '2026-11-03T09:00' });
  const { proximas, historial } = citasDelPaciente(
    [futura, empiezaAhora, empezada, completada, noAsistida, canceladaPasada, canceladaFutura],
    AHORA,
  );
  assert.deepEqual(ids(proximas), [futura.id]);
  assert.deepEqual(new Set(ids(historial)), new Set([empiezaAhora, empezada, completada, noAsistida, canceladaPasada, canceladaFutura].map((c) => c.id)));
});

test('002/CL Cita cancelada de fecha futura: va al historial, no a próximas', () => {
  const cancelada = cita('2026-11-20T10:00', 'cancelada');
  const { proximas, historial } = citasDelPaciente([cancelada], AHORA);
  assert.deepEqual(proximas, []);
  assert.deepEqual(ids(historial), [cancelada.id]);
});

test('002/FR-007 próximas de la más cercana a la más lejana, e historial de la más reciente a la más antigua', () => {
  const lejana = cita('2026-11-20T10:00');
  const cercana = cita('2026-11-05T10:00');
  const media = cita('2026-11-10T10:00');
  const antigua = cita('2026-09-01T10:00', 'completada');
  const reciente = cita('2026-11-02T10:00', 'completada');
  const intermedia = cita('2026-10-15T10:00', 'no_asistida');
  const { proximas, historial } = citasDelPaciente([lejana, antigua, cercana, reciente, media, intermedia], AHORA);
  assert.deepEqual(ids(proximas), [cercana, media, lejana].map((c) => c.id));
  assert.deepEqual(ids(historial), [reciente, intermedia, antigua].map((c) => c.id));
});

test('002/FR-009 cada cita lleva la etiqueta de la agenda, y la sin cerrar «Pendiente de confirmar por la clínica»', () => {
  const sinCerrar = cita('2026-11-02T15:15');
  const porElPaciente = cita('2026-11-09T18:00', 'cancelada', { origen: 'portal', momento: '2026-11-04T12:00' });
  const porElCorreo = cita('2026-11-10T18:00', 'cancelada', { origen: 'correo', momento: '2026-11-04T12:00' });
  const porRecepcion = cita('2026-11-11T18:00', 'cancelada', { origen: 'recepcion', momento: '2026-11-04T09:00' });
  const reservada = cita('2026-11-12T18:00');
  const completada = cita('2026-10-12T18:00', 'completada');
  const noAsistida = cita('2026-09-23T18:00', 'no_asistida');
  const { proximas, historial } = citasDelPaciente(
    [sinCerrar, porElPaciente, porElCorreo, porRecepcion, reservada, completada, noAsistida],
    AHORA,
  );
  const etiqueta = (c) => [...proximas, ...historial].find((x) => x.id === c.id).etiqueta;
  assert.equal(etiqueta(sinCerrar), 'Pendiente de confirmar por la clínica');
  assert.equal(etiqueta(porElPaciente), 'Cancelada por el paciente el 04/11/2026 a las 12:00');
  assert.equal(etiqueta(porElCorreo), 'Cancelada por el paciente el 04/11/2026 a las 12:00');
  assert.equal(etiqueta(porRecepcion), 'Cancelada');
  assert.equal(etiqueta(reservada), 'Reservada');
  assert.equal(etiqueta(completada), 'Completada');
  assert.equal(etiqueta(noAsistida), 'No asistida');
});

test('RP3 002/FR-013 una próxima es cancelable dentro del plazo de RN8, y si no, lleva el límite de RN8', () => {
  const aTiempo = cita('2026-11-04T14:00');
  const tarde = cita('2026-11-04T13:59');
  const { proximas, historial } = citasDelPaciente([aTiempo, tarde], AHORA);
  const [primera, segunda] = proximas;
  assert.equal(segunda.id, aTiempo.id);
  assert.equal(segunda.cancelable, true);
  assert.equal(segunda.limite, undefined);
  assert.equal(primera.id, tarde.id);
  assert.equal(primera.cancelable, false);
  assert.equal(primera.limite, '2026-11-04T11:59');
  for (const c of historial) assert.equal(c.cancelable, false);
});

test('RP3 las citas del historial nunca son cancelables', () => {
  const { historial } = citasDelPaciente([cita('2026-11-04T11:45'), cita('2026-11-20T10:00', 'cancelada')], AHORA);
  assert.deepEqual(historial.map((c) => c.cancelable), [false, false]);
  assert.ok(historial.every((c) => c.limite === undefined));
});

test('002/CL Cita que empieza justo ahora: deja de ser próxima y queda sin cerrar', () => {
  const c = cita(AHORA);
  const { proximas, historial } = citasDelPaciente([c], AHORA);
  assert.deepEqual(proximas, []);
  assert.equal(historial[0].etiqueta, 'Pendiente de confirmar por la clínica');
  assert.deepEqual(citasDelPaciente([c], '2026-11-04T11:59').proximas.map((x) => x.id), [c.id]);
});

test('002/CL Días de cambio de hora: la cita conserva su hora local y su límite es el de RN8', () => {
  const c = cita('2027-03-29T09:00', 'reservada', { fin: '2027-03-29T09:45' });
  assert.equal(tramoCita(c), 'lun 29/03/2027, 09:00–09:45');
  const [proxima] = citasDelPaciente([c], '2027-03-29T07:01').proximas;
  assert.equal(proxima.cancelable, false);
  assert.equal(proxima.limite, '2027-03-29T07:00');
  assert.equal(citasDelPaciente([c], '2027-03-29T07:00').proximas[0].cancelable, true);
});
