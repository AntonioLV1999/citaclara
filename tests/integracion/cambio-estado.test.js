import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { citaDirecta, crearEscenario, relojFijo } from '../ayudas/escenario.js';
import { abrirBd } from '../../src/datos/bd.js';
import { citasDelDia } from '../../src/datos/citas.js';
import { calcularHuecos } from '../../src/dominio/huecos.js';
import { aplicarAccion } from '../../src/servicios/cambio-estado.js';

const DIA = '2026-11-11';
const DESPUES = `${DIA}T12:00:00+01:00`;
const ANTES = `${DIA}T09:00:00+01:00`;
let e;
let id;

beforeEach(() => {
  e = crearEscenario();
  id = citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: `${DIA}T10:00`,
  });
});
afterEach(() => e.cerrar());

const contexto = (reloj = DESPUES, clinica = e.a) => ({ bd: e.bd, clinica, ahora: relojFijo(reloj) });
const estado = () => e.bd.prepare('SELECT estado FROM cita WHERE id = ?').get(id).estado;
const huecos = () => calcularHuecos({
  dia: DIA, citas: citasDelDia(e.bd, e.a.id, e.a.fisio, DIA), ahora: '2026-11-01T00:00',
}).map(({ inicio, fin }) => [inicio.slice(11), fin.slice(11)]);

test('H3-E1 una cita empezada se marca como completada y sigue ocupando su tramo', () => {
  assert.equal(aplicarAccion(contexto(), id, 'completar').ok, true);
  assert.equal(estado(), 'completada');
  assert.deepEqual(huecos(), [['09:00', '10:00'], ['10:45', '20:00']]);
});

test('H3-E2 una cita empezada se marca como no asistida y deja de ocupar su tramo', () => {
  assert.equal(aplicarAccion(contexto(), id, 'no-asistio').ok, true);
  assert.equal(estado(), 'no_asistida');
  assert.deepEqual(huecos(), [['09:00', '20:00']]);
});

test('H3-E3 RN5 antes de la hora de inicio no se puede completar ni marcar como no asistida', () => {
  for (const accion of ['completar', 'no-asistio']) {
    const r = aplicarAccion(contexto(ANTES), id, accion);
    assert.equal(r.ok, false);
    assert.equal(r.mensaje, 'Esta cita todavía no ha empezado. Hasta entonces solo se puede cancelar.');
  }
  assert.equal(estado(), 'reservada');
});

test('RN5 justo a la hora de inicio ya se puede completar', () => {
  assert.equal(aplicarAccion(contexto(`${DIA}T10:00:00+01:00`), id, 'completar').ok, true);
});

test('RN5 la hora de inicio se mira en la zona de la clínica', () => {
  const canaria = citaDirecta(e.bd, {
    clinica: e.b.id, profesional: e.b.fisio, servicio: e.b.sesion, paciente: e.b.pacientes[0], inicio: `${DIA}T10:00`,
  });
  // 09:30 UTC son las 09:30 en Canarias: la cita de las 10:00 no ha empezado.
  assert.equal(aplicarAccion(contexto(`${DIA}T09:30:00Z`, e.b), canaria, 'completar').ok, false);
  assert.equal(aplicarAccion(contexto(`${DIA}T10:00:00Z`, e.b), canaria, 'completar').ok, true);
});

test('H3-E4 una cita reservada se cancela y su tramo vuelve a estar libre', () => {
  assert.equal(aplicarAccion(contexto(ANTES), id, 'cancelar').ok, true);
  assert.equal(estado(), 'cancelada');
  assert.deepEqual(huecos(), [['09:00', '20:00']]);
});

const MENSAJES = [
  ['completar', 'completada'],
  ['cancelar', 'cancelada'],
  ['no-asistio', 'no asistida'],
];

for (const [accion, etiqueta] of MENSAJES) {
  test(`H3-E5 RN4 una cita ${etiqueta} no cambia y el mensaje dice en qué estado está`, () => {
    aplicarAccion(contexto(), id, accion);
    const anterior = estado();
    for (const otra of ['completar', 'cancelar', 'no-asistio']) {
      const r = aplicarAccion(contexto(), id, otra);
      assert.equal(r.ok, false);
      assert.equal(r.mensaje, `Esta cita ya está ${etiqueta} y no se puede cambiar.`);
    }
    assert.equal(estado(), anterior);
  });
}

test('RN6 una cita cancelada no se puede marcar como no asistida', () => {
  aplicarAccion(contexto(), id, 'cancelar');
  assert.equal(aplicarAccion(contexto(), id, 'no-asistio').ok, false);
  assert.equal(estado(), 'cancelada');
});

test('FR-020 una acción desconocida no cambia nada', () => {
  assert.equal(aplicarAccion(contexto(), id, 'borrar').motivo, 'no_encontrado');
  assert.equal(estado(), 'reservada');
});

test('FR-022 ningún estado cambia sin una acción, aunque la cita ya haya pasado', () => {
  aplicarAccion(contexto('2027-06-01T12:00:00+02:00'), id, 'borrar');
  assert.equal(estado(), 'reservada');
  assert.equal(citasDelDia(e.bd, e.a.id, e.a.fisio, DIA)[0].estado, 'reservada');
});

test('CL cita reservada ya pasada sin cerrar: sigue reservada, ocupa y se puede cerrar', () => {
  assert.deepEqual(huecos(), [['09:00', '10:00'], ['10:45', '20:00']]);
  assert.equal(aplicarAccion(contexto('2026-12-01T12:00:00+01:00'), id, 'completar').ok, true);
});

test('CL cancelación registrada tarde: tras la hora se puede cancelar, y queda cancelada', () => {
  assert.equal(aplicarAccion(contexto('2026-11-20T12:00:00+01:00'), id, 'cancelar').ok, true);
  assert.equal(estado(), 'cancelada');
});

test('CL dos acciones de estado a la vez: solo una prospera y la otra recibe el estado resultante', () => {
  const otraConexion = abrirBd(e.ruta);
  try {
    const primera = aplicarAccion(contexto(), id, 'cancelar');
    const segunda = aplicarAccion({ ...contexto(), bd: otraConexion }, id, 'completar');
    assert.equal(primera.ok, true);
    assert.equal(segunda.ok, false);
    assert.equal(segunda.mensaje, 'Esta cita ya está cancelada y no se puede cambiar.');
    assert.equal(estado(), 'cancelada');
  } finally {
    otraConexion.close();
  }
});

test('FR-004 una cita de otra clínica no se puede tocar', () => {
  assert.equal(aplicarAccion(contexto(DESPUES, e.b), id, 'cancelar').motivo, 'no_encontrado');
  assert.equal(estado(), 'reservada');
});

const fila = () => e.bd.prepare('SELECT estado, origen_cancelacion, momento_cancelacion FROM cita WHERE id = ?').get(id);

test('H3-E5 FR-038 cancelar desde recepción una cita ya cancelada o completada da el mensaje de su estado', () => {
  aplicarAccion(contexto(ANTES), id, 'cancelar');
  const antes = { ...fila() };
  const r = aplicarAccion(contexto(), id, 'cancelar');
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'rechazo');
  assert.equal(r.mensaje, 'Esta cita ya está cancelada y no se puede cambiar.');
  assert.deepEqual({ ...fila() }, antes);

  const otra = citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: `${DIA}T11:00`,
  });
  aplicarAccion(contexto(), otra, 'completar');
  const completada = aplicarAccion(contexto(), otra, 'cancelar');
  assert.equal(completada.mensaje, 'Esta cita ya está completada y no se puede cambiar.');
});

test('FR-036 la cancelación de recepción guarda el origen recepcion y el «ahora» local como momento', () => {
  assert.equal(aplicarAccion(contexto(ANTES), id, 'cancelar').ok, true);
  assert.deepEqual({ ...fila() }, { estado: 'cancelada', origen_cancelacion: 'recepcion', momento_cancelacion: `${DIA}T09:00` });
});

test('FR-036 FR-043 con el reloj fijado, la cancelación de recepción guarda el momento fijado', () => {
  const r = aplicarAccion({ ...contexto(ANTES), momentoFijado: '2026-11-04T12:00' }, id, 'cancelar');
  assert.equal(r.ok, true);
  assert.equal(fila().momento_cancelacion, '2026-11-04T12:00');
});

test('FR-036 completar o marcar como no asistida no deja origen ni momento', () => {
  aplicarAccion(contexto(), id, 'completar');
  assert.deepEqual({ ...fila() }, { estado: 'completada', origen_cancelacion: null, momento_cancelacion: null });
});

test('CL dos acciones de estado a la vez: completar gana y la cancelación, por la operación única, recibe el estado', () => {
  const otraConexion = abrirBd(e.ruta);
  try {
    const primera = aplicarAccion(contexto(), id, 'completar');
    const segunda = aplicarAccion({ ...contexto(), bd: otraConexion }, id, 'cancelar');
    assert.equal(primera.ok, true);
    assert.equal(segunda.ok, false);
    assert.equal(segunda.mensaje, 'Esta cita ya está completada y no se puede cambiar.');
    assert.deepEqual({ ...fila() }, { estado: 'completada', origen_cancelacion: null, momento_cancelacion: null });
  } finally {
    otraConexion.close();
  }
});
