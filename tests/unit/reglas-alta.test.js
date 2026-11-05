import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularFin, MENSAJES, validarAlta, validarPaciente } from '../../src/dominio/reglas.js';

const AHORA = '2026-11-11T12:00'; // miércoles
const FUTURO = '2026-11-12'; // jueves
const alta = (dia, hora, duracionMin = 45, ahora = AHORA) => validarAlta({ dia, hora, duracionMin, ahora });

test('RN2 rechaza una hora de hoy ya pasada', () => {
  assert.equal(alta('2026-11-11', '11:30'), MENSAJES.pasado);
});

test('RN2 rechaza cualquier día anterior', () => {
  assert.equal(alta('2026-11-10', '15:00'), MENSAJES.pasado);
});

test('RN2 acepta una cita que empieza en ese mismo minuto', () => {
  assert.equal(alta('2026-11-11', '12:00'), null);
});

test('RN2 acepta una hora posterior de hoy', () => {
  assert.equal(alta('2026-11-11', '12:15'), null);
});

test('RN3 el fin es el inicio más la duración', () => {
  assert.equal(calcularFin('2026-11-12T10:00', 45), '2026-11-12T10:45');
  assert.equal(calcularFin('2026-11-12T10:00', 60), '2026-11-12T11:00');
});

test('FR-011 solo admite minutos 00, 15, 30 y 45', () => {
  for (const hora of ['10:00', '10:15', '10:30', '10:45']) assert.equal(alta(FUTURO, hora), null);
  for (const hora of ['10:05', '10:14', '10:59']) assert.equal(alta(FUTURO, hora), MENSAJES.horaNoValida);
});

test('FR-011 rechaza una hora que no es una hora', () => {
  for (const hora of ['25:00', '10', 'mañana', '10:00:00', '']) assert.equal(alta(FUTURO, hora), MENSAJES.horaNoValida);
});

test('FR-012 rechaza un día que no existe', () => {
  assert.equal(alta('2027-02-30', '10:00'), MENSAJES.dia);
  assert.equal(alta('', '10:00'), MENSAJES.dia);
});

test('FR-012 rechaza el sábado y el domingo', () => {
  assert.equal(alta('2026-11-14', '10:00'), MENSAJES.horario);
  assert.equal(alta('2026-11-15', '10:00'), MENSAJES.horario);
});

test('FR-012 rechaza empezar antes de las 09:00', () => {
  assert.equal(alta(FUTURO, '08:45'), MENSAJES.horario);
});

test('FR-012 acepta empezar justo a las 09:00', () => {
  assert.equal(alta(FUTURO, '09:00'), null);
});

test('FR-012 rechaza que el fin pase de las 20:00', () => {
  assert.equal(alta(FUTURO, '19:30'), MENSAJES.horario);
  assert.equal(alta(FUTURO, '20:00', 15), MENSAJES.horario);
});

test('FR-012 acepta un fin exacto a las 20:00', () => {
  assert.equal(alta(FUTURO, '19:15'), null);
});

test('FR-027 los mensajes de reglas son los del contrato', () => {
  assert.equal(MENSAJES.pasado, 'Esa hora ya ha pasado. Elige una hora a partir de ahora.');
  assert.equal(MENSAJES.horario, 'La clínica abre de lunes a viernes, de 09:00 a 20:00. Elige una hora dentro de ese horario.');
  assert.equal(MENSAJES.horaNoValida, 'Las citas empiezan en punto, y cuarto, y media o menos cuarto. Elige una de esas horas.');
  assert.equal(MENSAJES.paciente, 'Escribe el nombre y un teléfono de al menos 9 dígitos.');
});

const paciente = (nombre, telefono, email) => validarPaciente({ nombre, telefono, email });

test('FR-013 acepta nombre y teléfono, sin correo', () => {
  assert.equal(paciente('Ana', '600000000'), null);
  assert.equal(paciente('Ana', '600000000', ''), null);
});

test('FR-013 exige un nombre no vacío tras recortar espacios', () => {
  assert.equal(paciente('', '600000000'), MENSAJES.paciente);
  assert.equal(paciente('   ', '600000000'), MENSAJES.paciente);
  assert.equal(paciente(undefined, '600000000'), MENSAJES.paciente);
});

test('FR-013 el teléfono tiene al menos 9 dígitos y admite + y espacios', () => {
  assert.equal(paciente('Ana', '600 000 000'), null);
  assert.equal(paciente('Ana', '+34 600 000 000'), null);
  assert.equal(paciente('Ana', '60000000'), MENSAJES.paciente);
  assert.equal(paciente('Ana', '+34 600'), MENSAJES.paciente);
  assert.equal(paciente('Ana', ''), MENSAJES.paciente);
  assert.equal(paciente('Ana', undefined), MENSAJES.paciente);
  assert.equal(paciente('Ana', '600-000-000'), MENSAJES.paciente);
  assert.equal(paciente('Ana', 'seiscientos'), MENSAJES.paciente);
});

test('FR-013 el correo opcional debe tener forma de correo', () => {
  assert.equal(paciente('Ana', '600000000', 'ana@example.com'), null);
  for (const email of ['ana', 'ana@', '@example.com', 'ana@example', 'ana @example.com']) {
    assert.equal(paciente('Ana', '600000000', email), MENSAJES.correo);
  }
});
