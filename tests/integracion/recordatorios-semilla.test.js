import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarEnMemoria } from '../ayudas/recordatorios.js';
import { leerEml } from '../ayudas/correo.js';
import { abrirBd } from '../../src/datos/bd.js';
import { cargar, resumen } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { sumarDias } from '../../src/dominio/tiempo.js';

let carpeta;
let bd;
let datos;

beforeEach(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'citaclara-semilla-003-'));
  bd = abrirBd(join(carpeta, 'semilla.db'));
  datos = generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO });
  cargar(bd, datos);
});
afterEach(() => {
  bd.close();
  rmSync(carpeta, { recursive: true, force: true });
});

const reservas = () => bd.prepare(`
  SELECT cita.id, paciente.email FROM cita JOIN paciente ON paciente.id = cita.paciente_id
  WHERE cita.estado = 'reservada' ORDER BY cita.id
`).all();
const volcar = () => bd.prepare('SELECT * FROM cita ORDER BY id').all();

test('003/FR-022 003/SC-002 con la semilla y el 02/11/2026 a las 08:00: 4 enviados y 1 sin correo para el martes 03/11/2026', () => {
  const { mensajes, lineas, resumenes } = ejecutarEnMemoria(bd, '2026-11-02T08:00');
  assert.deepEqual(lineas, [
    '02/11/2026 08:00 (hora peninsular) · Clínica Eleva · citas del martes 03/11/2026: 4 enviados, 1 sin correo, 0 fallidos',
  ]);
  assert.deepEqual(resumenes.map(({ ventana, enviados, sinCorreo, fallidos }) => [ventana, enviados, sinCorreo, fallidos]), [['2026-11-03', 4, 1, 0]]);
  assert.deepEqual(
    mensajes.map((m) => leerEml(m.texto).cuerpo.match(/^Hola, (.+):/)[1]),
    ['Paula Gómez', 'Javier Navarro', 'Luis Delgado', 'Óscar Domínguez'],
  );
  assert.deepEqual(mensajes.map((m) => leerEml(m.texto).cuerpo.match(/\r\nHora: (\d\d:\d\d)\r\n/)[1]), ['12:00', '16:00', '17:15', '17:30']);
});

test('003/FR-021 003/FR-022 la semilla tiene 57 reservas futuras, 43 con correo y 14 sin él, y sus cifras no cambian al ejecutar el proceso', () => {
  const todas = reservas();
  assert.equal(todas.length, 57);
  assert.equal(todas.filter((r) => r.email).length, 43);
  assert.equal(todas.filter((r) => !r.email).length, 14);
  assert.equal(datos.pacientes.filter((p) => !p.email).length, 10);

  const cifras = resumen(datos);
  const antes = volcar();
  ejecutarEnMemoria(bd, '2026-11-02T08:00');
  assert.deepEqual(volcar(), antes);
  assert.deepEqual(resumen(datos), cifras);
});

test('003/SC-002 RR2 ejecutando cada día del 01/11/2026 al 12/11/2026, cada reserva con correo tiene un recordatorio y ninguna sin correo lo tiene', () => {
  for (let dia = '2026-11-01'; dia <= '2026-11-12'; dia = sumarDias(dia, 1)) ejecutarEnMemoria(bd, `${dia}T08:00`);
  const recordadas = new Map(bd.prepare('SELECT cita_id, count(*) AS n FROM recordatorio GROUP BY cita_id').all().map((f) => [f.cita_id, f.n]));
  const todas = reservas();
  assert.deepEqual(todas.filter((r) => r.email && recordadas.get(r.id) !== 1).map((r) => r.id), []);
  assert.deepEqual(todas.filter((r) => !r.email && recordadas.has(r.id)).map((r) => r.id), []);
  assert.equal(recordadas.size, 43);
});
