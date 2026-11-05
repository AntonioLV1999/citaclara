import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba,
} from '../ayudas/escenario.js';
import { cargar } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { crearServidor } from '../../src/web/servidor.js';

let e;
let servidor;
let cookie;
let profesionales;

before(async () => {
  e = crearEscenario();
  cargar(e.bd, generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO }));
  const { id } = e.bd.prepare("SELECT id FROM clinica WHERE nombre = 'Clínica Eleva'").get();
  profesionales = e.bd.prepare('SELECT id FROM profesional WHERE clinica_id = ?').all(id).map((p) => p.id);
  servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-04T10:00:00+01:00') }));
  cookie = sesionDePrueba(e.bd, id);
});
after(async () => {
  await detener(servidor);
  e.cerrar();
});

async function medir(ruta) {
  const inicio = performance.now();
  const r = await peticion(servidor, { ruta, cookie });
  assert.equal(r.estado, 200);
  return performance.now() - inicio;
}

test('SC-004 GET /agenda responde en menos de 1 segundo con la semilla completa', async () => {
  assert.ok((await medir('/agenda')) < 1000);
});

test('SC-004 cambiar de profesional o de día responde en menos de 1 segundo', async () => {
  for (const profesional of profesionales) {
    for (const dia of ['2026-09-07', '2026-10-14', '2026-11-04', '2026-11-13']) {
      const tiempo = await medir(`/agenda?profesional=${profesional}&dia=${dia}`);
      assert.ok(tiempo < 1000, `${profesional} ${dia}: ${tiempo} ms`);
    }
  }
});
