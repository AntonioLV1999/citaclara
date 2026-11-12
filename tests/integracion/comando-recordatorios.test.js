import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdtempSync, readdirSync, readFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEMILLA = fileURLToPath(new URL('../../src/semilla/comando.js', import.meta.url));
const RECORDATORIOS = fileURLToPath(new URL('../../src/recordatorios.js', import.meta.url));
const RESUMEN = '02/11/2026 08:00 (hora peninsular) · Clínica Eleva · citas del martes 03/11/2026: 4 enviados, 1 sin correo, 0 fallidos';
const MOMENTO_NO_VALIDO = 'El momento de referencia CITACLARA_AHORA no es válido. '
  + 'Escríbelo como AAAA-MM-DDTHH:MM, por ejemplo 2026-11-04T12:00.';
const AVISO_SMTP = 'Hay un servidor de correo configurado, pero el envío real está desactivado hasta que se '
  + 'cumplan las condiciones para usar datos reales. Los recordatorios se han escrito en datos/salida-correo/.';
let carpeta;

// Un entorno limpio: sin los ajustes de quien lanza los tests.
const { CITACLARA_AHORA, CITACLARA_DIRECCION, CITACLARA_SMTP, PORT, NODE_TEST_CONTEXT, ...base } = process.env;
const lanzar = (archivo, entorno = {}) => spawnSync(process.execPath, [archivo], {
  cwd: carpeta, encoding: 'utf8', env: { ...base, ...entorno },
});
const salida = () => join(carpeta, 'datos', 'salida-correo');

beforeEach(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'citaclara-comando-003-'));
  assert.equal(lanzar(SEMILLA).status, 0);
});
afterEach(() => rmSync(carpeta, { recursive: true, force: true }));

test('003/FR-002 003/FR-003 npm run recordatorios con CITACLARA_AHORA: código 0, el resumen en la salida y en el registro, y cuatro ficheros', () => {
  const r = lanzar(RECORDATORIOS, { CITACLARA_AHORA: '2026-11-02T08:00' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, `${RESUMEN}\n`);
  assert.equal(readFileSync(join(carpeta, 'datos', 'recordatorios.log'), 'utf8'), `${RESUMEN}\n`);
  assert.equal(readdirSync(salida()).length, 4);
  for (const fichero of readdirSync(salida())) {
    assert.match(readFileSync(join(salida(), fichero), 'utf8'), /\r\nhttp:\/\/localhost:3000\/e\/[0-9a-f]{32}\r\n/);
  }

  // FR-002: repetirlo no duplica nada.
  const otra = lanzar(RECORDATORIOS, { CITACLARA_AHORA: '2026-11-02T08:00' });
  assert.equal(otra.status, 0);
  assert.match(otra.stdout, /: 0 enviados, 1 sin correo, 0 fallidos\n$/);
  assert.equal(readdirSync(salida()).length, 4);
});

test('003/FR-003 con CITACLARA_AHORA mal escrito, el proceso no arranca y da el mensaje literal', () => {
  const r = lanzar(RECORDATORIOS, { CITACLARA_AHORA: '2026-11-02 08:00' });
  assert.equal(r.status, 1);
  assert.equal(r.stderr.trim(), MOMENTO_NO_VALIDO);
  assert.equal(existsSync(salida()), false);
});

test('003/FR-003 con CITACLARA_DIRECCION y PORT, el enlace del fichero usa la dirección pública', () => {
  const r = lanzar(RECORDATORIOS, { CITACLARA_AHORA: '2026-11-02T08:00', CITACLARA_DIRECCION: 'https://citas.example.com', PORT: '4000' });
  assert.equal(r.status, 0, r.stderr);
  const [fichero] = readdirSync(salida());
  assert.match(readFileSync(join(salida(), fichero), 'utf8'), /\r\nhttps:\/\/citas\.example\.com\/e\/[0-9a-f]{32}\r\n/);
});

test('003/FR-018 con CITACLARA_SMTP, los mismos ficheros y el aviso de que el envío real está desactivado', () => {
  const r = lanzar(RECORDATORIOS, { CITACLARA_AHORA: '2026-11-02T08:00', CITACLARA_SMTP: 'smtp://correo.example.com:587' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, `${RESUMEN}\n${AVISO_SMTP}\n`);
  assert.equal(readdirSync(salida()).length, 4);
});
