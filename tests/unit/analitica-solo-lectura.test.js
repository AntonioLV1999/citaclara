import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MODULOS_DEL_PANEL = [
  '../../src/datos/analitica.js',
  '../../src/dominio/analitica.js',
  '../../src/web/rutas/analitica.js',
  '../../src/web/vistas/analitica.js',
];

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

test('RA8 004/FR-018 los módulos del panel no contienen ninguna escritura', () => {
  for (const ruta of MODULOS_DEL_PANEL) {
    // El SQL del proyecto va en mayúsculas; `.run(` es como node:sqlite ejecuta una escritura.
    assert.doesNotMatch(leer(ruta), /\b(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)\b|transaccionInmediata|\.run\(/, ruta);
  }
});

test('RA8 004/FR-018 los módulos del panel no importan la semilla ni las escrituras de citas', () => {
  for (const ruta of MODULOS_DEL_PANEL) {
    assert.doesNotMatch(leer(ruta), /from '[^']*(semilla\/|datos\/citas\.js)/, ruta);
  }
});
