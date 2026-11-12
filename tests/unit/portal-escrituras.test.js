import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MODULOS_DEL_PORTAL = [
  'src/web/rutas/portal.js', 'src/servicios/cancelar-portal.js', 'src/dominio/portal.js', 'src/datos/portal.js',
];
const leer = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8');

test('RP5 ningún módulo del portal escribe citas salvo a través de la operación única de cancelar', () => {
  for (const ruta of MODULOS_DEL_PORTAL) {
    const codigo = leer(ruta);
    for (const prohibida of ['registrarCancelacion', 'cambiarEstado', 'insertarCita', 'crearCita']) {
      assert.equal(codigo.includes(prohibida), false, `${ruta} usa ${prohibida}`);
    }
    assert.doesNotMatch(codigo, /\b(UPDATE\s+cita|INSERT\s+INTO\s+cita|DELETE\s+FROM\s+cita)\b/i, ruta);
  }
});

test('RP4 la única llamada a cancelarCita del portal está en cancelar-portal.js, con el canal «portal»', () => {
  const llamadas = MODULOS_DEL_PORTAL.flatMap((ruta) => [...leer(ruta).matchAll(/cancelarCita\(([^)]*)\)/g)].map((m) => [ruta, m[1]]));
  assert.deepEqual(llamadas.map(([ruta]) => ruta), ['src/servicios/cancelar-portal.js']);
  assert.match(llamadas[0][1], /,\s*'portal'\s*$/);
});
