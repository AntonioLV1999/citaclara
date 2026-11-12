import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { peticion } from '../ayudas/escenario.js';
import {
  citaDe, enlaceCancelacionDePrueba, escenarioSemilla, fichaPorNombre,
} from '../ayudas/portal.js';
import { cargar } from '../../src/semilla/carga.js';
import { paginaEnlaceNoValido } from '../../src/web/plantilla.js';

const AHORA = '2026-11-02T08:00';
let s;

beforeEach(async () => { s = await escenarioSemilla({ momentoFijado: AHORA }); });
afterEach(() => s.cerrar());

const contar = (tabla) => s.bd.prepare(`SELECT count(*) AS n FROM ${tabla}`).get().n;

test('003/CL Regenerar los datos de demostración borra los recordatorios y deja sin valor los enlaces anteriores', async () => {
  const paula = fichaPorNombre(s.bd, 'Paula Gómez');
  const cita = citaDe(s.bd, paula.id, '2026-11-03T12:00');
  s.bd.prepare('INSERT INTO recordatorio (cita_id, enviado_en, direccion, modo) VALUES (?, ?, ?, ?)')
    .run(cita.id, AHORA, paula.email, 'simulado');
  const token = enlaceCancelacionDePrueba(s.bd, cita.id);
  const antes = await peticion(s.servidor, { ruta: `/e/${token}` });
  assert.equal(antes.estado, 303);

  cargar(s.bd, s.datos);

  assert.equal(contar('recordatorio'), 0);
  assert.equal(contar('enlace_cancelacion'), 0);
  const despues = await peticion(s.servidor, { ruta: `/e/${token}` });
  const uniforme = paginaEnlaceNoValido();
  assert.equal(despues.estado, uniforme.estado);
  assert.equal(despues.texto, uniforme.cuerpo);
});
