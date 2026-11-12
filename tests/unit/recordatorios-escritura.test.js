import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MODULOS_DE_LA_003 = [
  'src/servicios/recordatorios.js', 'src/datos/recordatorios.js', 'src/web/rutas/cancelar.js', 'src/web/vistas/cancelar.js',
];
const leer = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8');

test('RR4 la 003 solo cancela con cancelarCita: ningún módulo suyo usa registrarCancelacion ni escribe en cita', () => {
  for (const ruta of MODULOS_DE_LA_003) {
    const codigo = leer(ruta);
    for (const prohibida of ['registrarCancelacion', 'cambiarEstado', 'insertarCita']) {
      assert.equal(codigo.includes(prohibida), false, `${ruta} usa ${prohibida}`);
    }
    assert.doesNotMatch(codigo, /\b(UPDATE\s+cita|INSERT\s+INTO\s+cita|DELETE\s+FROM\s+cita)\b/i, ruta);
  }
});

test('RR4 la única llamada a cancelarCita de la 003 está en la ruta /cancelar, con el canal «correo»', () => {
  const llamadas = MODULOS_DE_LA_003.flatMap((ruta) => [...leer(ruta).matchAll(/cancelarCita\(([^)]*)\)/g)].map((m) => [ruta, m[1]]));
  assert.deepEqual(llamadas.map(([ruta]) => ruta), ['src/web/rutas/cancelar.js']);
  assert.match(llamadas[0][1], /,\s*'correo'\s*$/);
});
