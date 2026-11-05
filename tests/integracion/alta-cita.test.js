import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { citaDirecta, crearEscenario, relojFijo } from '../ayudas/escenario.js';
import { crearCita } from '../../src/servicios/alta-cita.js';
import { MENSAJES } from '../../src/dominio/reglas.js';

const DIA = '2026-11-11'; // miércoles
const LUNES_ANTERIOR = '2026-11-09T08:00:00+01:00';
let e;

beforeEach(() => { e = crearEscenario(); });
afterEach(() => e.cerrar());

const contexto = (reloj = LUNES_ANTERIOR, clinica = e.a) => ({ bd: e.bd, clinica, ahora: relojFijo(reloj) });
const formulario = (extra = {}) => ({
  profesional: e.a.fisio,
  servicio: e.a.sesion,
  paciente: e.a.pacientes[0],
  dia: DIA,
  hora: '10:00',
  ...extra,
});
const citas = () => e.bd.prepare('SELECT * FROM cita ORDER BY id').all();
const pacientes = () => e.bd.prepare('SELECT count(*) AS n FROM paciente').get().n;
const existente = (inicio, estado, extra = {}) => citaDirecta(e.bd, {
  clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[1], inicio, estado, ...extra,
});

test('H1-E1 una sesión de 45 minutos a las 10:00 queda reservada de 10:00 a 10:45', () => {
  const r = crearCita(contexto(), formulario());
  assert.equal(r.ok, true);
  const [cita] = citas();
  assert.equal(cita.inicio, `${DIA}T10:00`);
  assert.equal(cita.fin, `${DIA}T10:45`);
  assert.equal(cita.estado, 'reservada');
});

test('H1-E2 RN1 un solape se rechaza diciendo qué cita lo impide, y la agenda no cambia', () => {
  crearCita(contexto(), formulario());
  const antes = citas();
  const r = crearCita(contexto(), formulario({ hora: '10:30', paciente: e.a.pacientes[1] }));
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'solape');
  assert.equal(r.mensaje, 'María ya tiene una cita de 10:00 a 10:45 con Ana Núñez. Elige otra hora.');
  assert.deepEqual(citas(), antes);
});

test('H1-E3 una cita completada bloquea igual que una reservada', () => {
  existente(`${DIA}T10:00`, 'completada');
  const r = crearCita(contexto(), formulario({ hora: '10:15' }));
  assert.equal(r.motivo, 'solape');
  assert.equal(r.mensaje, 'María ya tiene una cita de 10:00 a 10:45 con Óscar Peña. Elige otra hora.');
});

test('H1-E4 una cita que empieza justo cuando acaba otra se acepta', () => {
  existente(`${DIA}T10:00`, 'reservada');
  assert.equal(crearCita(contexto(), formulario({ hora: '10:45' })).ok, true);
});

test('H1-E5 un tramo cancelado de un día futuro se puede reservar', () => {
  existente(`${DIA}T10:00`, 'cancelada');
  assert.equal(crearCita(contexto(), formulario()).ok, true);
  assert.equal(citas().length, 2);
});

test('H1-E6 lo que queda de una cita no asistida se puede aprovechar', () => {
  existente(`${DIA}T10:00`, 'no_asistida', { servicio: e.a.primeraFisio });
  const r = crearCita(contexto(`${DIA}T10:10:00+01:00`), formulario({ hora: '10:15' }));
  assert.equal(r.ok, true);
  assert.equal(citas()[1].fin, `${DIA}T11:00`);
});

test('H1-E7 RN1 dos altas seguidas del mismo hueco: una prospera y la otra se rechaza', () => {
  const primera = crearCita(contexto(), formulario());
  const segunda = crearCita(contexto(), formulario({ paciente: e.a.pacientes[1] }));
  assert.equal(primera.ok, true);
  assert.equal(segunda.motivo, 'solape');
  assert.equal(citas().length, 1);
});

test('H1-E8 RN2 a las 12:00 no se reserva hoy a las 11:30 ni un día anterior', () => {
  const reloj = `${DIA}T12:00:00+01:00`;
  for (const extra of [{ hora: '11:30' }, { dia: '2026-11-10', hora: '15:00' }]) {
    const r = crearCita(contexto(reloj), formulario(extra));
    assert.equal(r.motivo, 'invalido');
    assert.equal(r.mensaje, MENSAJES.pasado);
  }
  assert.equal(citas().length, 0);
});

test('RN2 usa la hora local de la clínica de Canarias', () => {
  const datos = { profesional: e.b.fisio, servicio: e.b.sesion, paciente: e.b.pacientes[0], dia: DIA, hora: '11:30' };
  const antes = crearCita(contexto(`${DIA}T11:30:00Z`, e.b), datos);
  assert.equal(antes.ok, true);
  const despues = crearCita(contexto(`${DIA}T11:31:00Z`, e.b), { ...datos, hora: '11:15' });
  assert.equal(despues.mensaje, MENSAJES.pasado);
});

test('H1-E9 RN7 con una profesional de nutrición se rechaza un servicio de fisioterapia', () => {
  const r = crearCita(contexto(), formulario({ profesional: e.a.nutri }));
  assert.equal(r.motivo, 'invalido');
  assert.equal(r.mensaje, 'Lucía no atiende ese servicio. Elige uno de nutrición.');
  assert.equal(citas().length, 0);
});

test('H1-E10 FR-013 un paciente sin ficha queda registrado junto con su cita', () => {
  const antes = pacientes();
  const r = crearCita(contexto(), formulario({
    paciente: '', paciente_nombre: '  Marta Ruiz ', paciente_telefono: '600 111 222', paciente_email: '',
  }));
  assert.equal(r.ok, true);
  assert.equal(pacientes(), antes + 1);
  const ficha = e.bd.prepare('SELECT * FROM paciente WHERE id = ?').get(citas()[0].paciente_id);
  assert.equal(ficha.nombre, 'Marta Ruiz');
  assert.equal(ficha.telefono, '600 111 222');
  assert.equal(ficha.email, null);
  assert.equal(ficha.clinica_id, e.a.id);
});

test('H1-E11 FR-013 si la cita se rechaza por solape no queda ficha', () => {
  existente(`${DIA}T10:00`, 'reservada');
  const antes = pacientes();
  const r = crearCita(contexto(), formulario({
    paciente: '', paciente_nombre: 'Marta Ruiz', paciente_telefono: '600111222',
  }));
  assert.equal(r.motivo, 'solape');
  assert.equal(pacientes(), antes);
});

test('FR-013 si la cita se rechaza por otra regla tampoco queda ficha', () => {
  const antes = pacientes();
  crearCita(contexto(`${DIA}T12:00:00+01:00`), formulario({
    paciente: '', paciente_nombre: 'Marta Ruiz', paciente_telefono: '600111222',
  }));
  assert.equal(pacientes(), antes);
});

test('FR-013 unos datos de paciente incorrectos se rechazan sin crear nada', () => {
  const r = crearCita(contexto(), formulario({ paciente: '', paciente_nombre: 'Marta', paciente_telefono: '123' }));
  assert.equal(r.mensaje, MENSAJES.paciente);
  const correo = crearCita(contexto(), formulario({
    paciente: '', paciente_nombre: 'Marta', paciente_telefono: '600111222', paciente_email: 'marta',
  }));
  assert.equal(correo.mensaje, MENSAJES.correo);
  assert.equal(citas().length, 0);
});

test('FR-005 sin paciente elegido ni escrito se pide el paciente', () => {
  const r = crearCita(contexto(), formulario({ paciente: '' }));
  assert.equal(r.mensaje, MENSAJES.paciente);
});

test('FR-005 faltan datos: se pide elegir profesional, servicio, día y hora', () => {
  for (const campo of ['profesional', 'servicio', 'dia', 'hora']) {
    assert.equal(crearCita(contexto(), formulario({ [campo]: '' })).mensaje, MENSAJES.faltanDatos);
  }
});

test('RN3 el fin no se puede introducir a mano', () => {
  crearCita(contexto(), formulario({ fin: `${DIA}T18:00` }));
  assert.equal(citas()[0].fin, `${DIA}T10:45`);
});

test('CL servicio no cabe en el hueco: se rechaza por solapar la siguiente cita', () => {
  existente(`${DIA}T10:45`, 'reservada');
  const r = crearCita(contexto(), formulario({ servicio: e.a.primeraFisio }));
  assert.equal(r.motivo, 'solape');
});

test('CL servicio no cabe en el hueco: se rechaza por salirse del horario', () => {
  const r = crearCita(contexto(), formulario({ hora: '19:15', servicio: e.a.primeraFisio }));
  assert.equal(r.mensaje, MENSAJES.horario);
});

test('CL mismo paciente, dos profesionales: no se impide a la misma hora', () => {
  assert.equal(crearCita(contexto(), formulario()).ok, true);
  assert.equal(crearCita(contexto(), formulario({ profesional: e.a.fisio2 })).ok, true);
});

test('CL datos de otra clínica: no se aceptan profesional, servicio ni paciente ajenos', () => {
  for (const extra of [{ profesional: e.b.fisio }, { servicio: e.b.sesion }, { paciente: e.b.pacientes[0] }]) {
    assert.equal(crearCita(contexto(), formulario(extra)).motivo, 'no_encontrado');
  }
  assert.equal(citas().length, 0);
});

test('FR-010 una cita rechazada deja libre la transacción para la siguiente', () => {
  crearCita(contexto(), formulario());
  crearCita(contexto(), formulario());
  assert.equal(e.bd.isTransaction, false);
  assert.equal(crearCita(contexto(), formulario({ hora: '12:00' })).ok, true);
});
