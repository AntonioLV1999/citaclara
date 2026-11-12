import { test } from 'node:test';
import assert from 'node:assert/strict';
import { componerRecordatorio } from '../../src/dominio/recordatorio.js';
import { leerEml } from '../ayudas/correo.js';

const TOKEN = '0123456789abcdef0123456789abcdef';
const ENLACE = `http://localhost:3000/e/${TOKEN}`;

// El ejemplo de contracts/correo-recordatorio.md: la cita de Paula Gómez de la semilla por defecto.
const PAULA = {
  clinica: { nombre: 'Clínica Eleva', zona_horaria: 'Europe/Madrid', telefono: '000 200 000' },
  paciente: { nombre: 'Paula Gómez', email: 'paula.gomez@example.com', telefono: '600 111 222', enlace: 'f'.repeat(32) },
  cita: { id: 7, inicio: '2026-11-03T12:00', fin: '2026-11-03T12:45' },
  profesional: { nombre: 'María' },
  servicio: { nombre: 'Sesión de fisioterapia', precio_centimos: 4000 },
  ahora: '2026-11-02T08:00',
  enlace: ENLACE,
};

const CUERPO = [
  'Hola, Paula Gómez:',
  '',
  'Te recordamos tu cita en Clínica Eleva.',
  '',
  'Día: martes 03/11/2026',
  'Hora: 12:00',
  'Profesional: María',
  'Servicio: Sesión de fisioterapia',
  'Horas en hora peninsular.',
  '',
  'Si no vas a poder venir, cancela la cita en este enlace y el hueco quedará libre para otra persona:',
  ENLACE,
  '',
  'Al abrir el enlace verás la cita y tendrás que confirmar la cancelación.',
  '',
].join('\r\n');

const canarias = (cambios = {}) => componerRecordatorio({
  ...PAULA, clinica: { ...PAULA.clinica, nombre: 'Clínica Sur', zona_horaria: 'Atlantic/Canary' }, ...cambios,
});

test('003/FR-007 el recordatorio lleva clínica, nombre, profesional, servicio, día de la semana, fecha, hora y el enlace en su línea', () => {
  const { cabeceras, cuerpo } = leerEml(componerRecordatorio(PAULA));
  assert.equal(cuerpo, CUERPO);
  assert.equal(cabeceras.subject, 'Recordatorio de tu cita del martes 03/11/2026 a las 12:00');
  assert.ok(cuerpo.split('\r\n').includes(ENLACE));
});

test('003/FR-008 fechas dd/mm/aaaa, horas de 24 horas y la línea de la zona de la clínica', () => {
  const tarde = leerEml(componerRecordatorio({ ...PAULA, cita: { ...PAULA.cita, inicio: '2026-11-05T19:45' } }));
  assert.match(tarde.cuerpo, /\r\nDía: jueves 05\/11\/2026\r\nHora: 19:45\r\n/);
  assert.match(tarde.cabeceras.subject, /del jueves 05\/11\/2026 a las 19:45$/);
  assert.match(tarde.cuerpo, /\r\nHoras en hora peninsular\.\r\n/);
  assert.doesNotMatch(tarde.cuerpo, /\b(AM|PM|7:45)\b/);
});

test('003/H1-E10 una clínica de Canarias da la hora local con «Horas en hora de Canarias.» y su desfase en Date', () => {
  const invierno = leerEml(canarias());
  assert.match(invierno.cuerpo, /\r\nHora: 12:00\r\nProfesional: María\r\nServicio: Sesión de fisioterapia\r\nHoras en hora de Canarias\.\r\n/);
  assert.equal(invierno.cabeceras.date, 'Mon, 02 Nov 2026 08:00:00 +0000');
  assert.equal(leerEml(componerRecordatorio(PAULA)).cabeceras.date, 'Mon, 02 Nov 2026 08:00:00 +0100');
  // En verano, una hora más en las dos zonas.
  assert.equal(leerEml(canarias({ ahora: '2027-07-01T08:00' })).cabeceras.date, 'Thu, 01 Jul 2027 08:00:00 +0100');
  assert.equal(leerEml(componerRecordatorio({ ...PAULA, ahora: '2027-07-01T08:00' })).cabeceras.date, 'Thu, 01 Jul 2027 08:00:00 +0200');
});

test('003/FR-009 español, texto plano en UTF-8 y líneas terminadas en CRLF', () => {
  const texto = componerRecordatorio(PAULA);
  const { cabeceras } = leerEml(texto);
  assert.equal(cabeceras['mime-version'], '1.0');
  assert.equal(cabeceras['content-type'], 'text/plain; charset=UTF-8');
  assert.equal(cabeceras['content-transfer-encoding'], '8bit');
  assert.equal(texto.replace(/\r\n/g, '').includes('\n'), false, 'hay un salto de línea sin CR');
  assert.equal(texto.replace(/\r\n/g, '').includes('\r'), false, 'hay un CR suelto');
  assert.ok(texto.endsWith('\r\n'));
  // Sin jerga: ni «email», ni «link», ni «token».
  assert.doesNotMatch(texto, /\b(email|link|token|click)\b/i);
});

test('003/FR-010 el cuerpo dice que el hueco queda libre y, de la ficha, solo lleva el nombre', () => {
  const texto = componerRecordatorio(PAULA);
  const { cabeceras, cuerpo, crudas } = leerEml(texto);
  assert.match(cuerpo, /el hueco quedará libre para otra persona/);
  const asuntoYCuerpo = `${cabeceras.subject}\r\n${cuerpo}`;
  for (const prohibido of [PAULA.paciente.telefono, PAULA.paciente.email, PAULA.paciente.enlace, '40,00', '000 200 000']) {
    assert.equal(asuntoYCuerpo.includes(prohibido), false, prohibido);
  }
  assert.equal(cabeceras.to, 'paula.gomez@example.com');
  assert.equal(crudas.split('paula.gomez@example.com').length, 2, 'el correo solo figura en To');
});

test('003/FR-007 asunto y remitente van en RFC 2047 y descodificados dan el texto del contrato; sin Message-ID', () => {
  const { cabeceras, crudas } = leerEml(componerRecordatorio(PAULA));
  assert.match(crudas, /^From: =\?UTF-8\?B\?Q2zDrW5pY2EgRWxldmE=\?= <recordatorios@citaclara\.invalid>\r\n/);
  assert.equal(cabeceras.from, 'Clínica Eleva <recordatorios@citaclara.invalid>');
  assert.match(crudas, /\r\nSubject: =\?UTF-8\?B\?/);
  // Las cabeceras son ASCII y ninguna palabra codificada pasa de 75 caracteres (RFC 2047).
  assert.match(crudas, /^[\x20-\x7e\r\n\t]*$/);
  for (const palabra of crudas.match(/=\?[^?]+\?B\?[^?]*\?=/g)) assert.ok(palabra.length <= 75, palabra);
  assert.equal(cabeceras['message-id'], undefined);
  assert.deepEqual(Object.keys(cabeceras), ['from', 'to', 'subject', 'date', 'mime-version', 'content-type', 'content-transfer-encoding']);
});

test('003/H3-E5 dos composiciones con los mismos datos y el mismo momento son idénticas', () => {
  assert.equal(componerRecordatorio(PAULA), componerRecordatorio({ ...PAULA }));
});
