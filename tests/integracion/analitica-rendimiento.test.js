import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { panelDeSemilla } from '../ayudas/panel.js';

let p;

before(async () => { p = await panelDeSemilla(); });
after(() => p.cerrar());

test('004/SC-004 GET /analitica responde en menos de 1 segundo con la semilla completa', async () => {
  for (let i = 0; i < 5; i += 1) {
    const inicio = performance.now();
    const r = await p.abrir();
    const tiempo = performance.now() - inicio;
    assert.equal(r.estado, 200);
    assert.ok(tiempo < 1000, `apertura ${i}: ${tiempo} ms`);
  }
});
