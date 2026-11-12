import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';
import {
  ejecutarEnMemoria, enlacesDe, ponerCorreo, recordatorioDe,
} from '../ayudas/recordatorios.js';

const AHORA = '2026-11-02T08:00';
const MANANA = '2026-11-03';
let e;
let carpeta;
let pacientes;

beforeEach(() => {
  e = crearEscenario();
  carpeta = mkdtempSync(join(tmpdir(), 'citaclara-registro-'));
  pacientes = e.a.pacientes;
  pacientes.forEach((id, i) => ponerCorreo(e.bd, id, `paciente${i}@example.com`));
});
afterEach(() => {
  e.cerrar();
  rmSync(carpeta, { recursive: true, force: true });
});

/** Cinco citas de mañana, a las 09:00, 10:00, 11:00, 12:00 y 13:00, de los tres pacientes. */
function cincoCitas() {
  return ['09:00', '10:00', '11:00', '12:00', '13:00'].map((hora, i) => citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: pacientes[i % 3], inicio: `${MANANA}T${hora}`,
  }));
}

const ejecutar = (momento, opciones) => ejecutarEnMemoria(e.bd, momento, { clinicas: [e.a], ...opciones });

test('003/H1-E8 003/FR-005 un envío que falla no detiene a las demás, no cuenta como recordada y otra ejecución la envía', () => {
  const citas = cincoCitas();
  const mala = citas[2];
  const primera = ejecutar(AHORA, {
    enviar: (mensaje) => { if (mensaje.citaId === mala) throw new Error('disco lleno'); },
  });
  assert.deepEqual(primera.mensajes.map((m) => m.citaId), citas.filter((id) => id !== mala));
  assert.equal(recordatorioDe(e.bd, mala), undefined);
  assert.equal(enlacesDe(e.bd, mala).length, 0);
  assert.deepEqual([primera.resumenes[0].enviados, primera.resumenes[0].fallidos], [4, 1]);

  const segunda = ejecutar('2026-11-02T09:00');
  assert.deepEqual(segunda.mensajes.map((m) => m.citaId), [mala]);
  assert.ok(recordatorioDe(e.bd, mala));
  assert.equal(enlacesDe(e.bd, mala).length, 1);
});

test('003/CL Fallo a mitad de ejecución: al reanudar no se repiten las enviadas y salen las pendientes', () => {
  const citas = cincoCitas();
  const primera = ejecutar(AHORA, {
    enviar: (mensaje, enviados) => { if (enviados.length >= 2) throw new Error('el servidor se ha caído'); },
  });
  assert.deepEqual(primera.mensajes.map((m) => m.citaId), citas.slice(0, 2));
  assert.equal(primera.resumenes[0].fallidos, 3);

  const segunda = ejecutar(AHORA);
  assert.deepEqual(segunda.mensajes.map((m) => m.citaId), citas.slice(2));
  assert.equal(segunda.resumenes[0].fallidos, 0);
  assert.equal(e.bd.prepare('SELECT count(*) AS n FROM recordatorio').get().n, 5);
});

test('003/FR-006 el resumen literal sale en la salida y al final de recordatorios.log, con una línea por cita fallida y sin correos', () => {
  const citas = cincoCitas();
  citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.nutri, servicio: e.a.consulta, paciente: pacientes[2], inicio: `${MANANA}T19:15`,
  });
  ponerCorreo(e.bd, pacientes[2], null);
  const registro = join(carpeta, 'recordatorios.log');
  writeFileSync(registro, 'línea de una ejecución anterior\n');

  const { lineas } = ejecutar(AHORA, {
    registro,
    clinicas: [e.a, e.b],
    enviar: (mensaje) => { if (mensaje.citaId === citas[1]) throw new Error('disco lleno'); },
  });

  // La tercera cita y la de las 19:15 son del paciente que se ha quedado sin correo; de las otras cuatro, una falla.
  assert.deepEqual(lineas, [
    '02/11/2026 08:00 (hora peninsular) · Clínica Norte · citas del martes 03/11/2026: 3 enviados, 2 sin correo, 1 fallidos',
    `Cita ${citas[1]}: no se ha podido enviar el recordatorio (disco lleno)`,
    '02/11/2026 08:00 (hora de Canarias) · Clínica Sur · citas del martes 03/11/2026: 0 enviados, 0 sin correo, 0 fallidos',
  ]);
  const contenido = readFileSync(registro, 'utf8');
  assert.equal(contenido, `línea de una ejecución anterior\n${lineas.join('\n')}\n`);
  assert.doesNotMatch(contenido, /@/);
});
