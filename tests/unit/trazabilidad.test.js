import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MEDIDOS_A_MANO = new Set(['SC-002', 'SC-003']);

function identificadoresDeLaSpec() {
  const spec = readFileSync(join(RAIZ, 'specs/001-nucleo-agenda/spec.md'), 'utf8');
  const reglas = [...spec.matchAll(/^- \*\*(RN\d+)/gm)].map((m) => m[1]);
  const criterios = [...spec.matchAll(/^- \*\*(SC-\d{3})\*\*/gm)].map((m) => m[1]);
  const escenarios = [];
  let historia = 0;
  for (const linea of spec.split('\n')) {
    const cabecera = linea.match(/^### Historia de usuario (\d+)/);
    if (cabecera) historia = Number(cabecera[1]);
    const escenario = linea.match(/^(\d+)\. \*\*Dad[oa]s?\*\*/);
    if (escenario) escenarios.push(`H${historia}-E${escenario[1]}`);
  }
  return { reglas, criterios, escenarios };
}

function nombresDeTest() {
  const carpeta = join(RAIZ, 'tests');
  const archivos = readdirSync(carpeta, { recursive: true }).filter((a) => /\.(test|spec)\.js$/.test(a));
  return archivos.flatMap((archivo) => {
    const texto = readFileSync(join(carpeta, archivo), 'utf8');
    return [...texto.matchAll(/\btest\(\s*(['"`])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
  });
}

test('SC-008 la spec tiene las reglas, escenarios y criterios esperados', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  assert.deepEqual(reglas, ['RN1', 'RN2', 'RN3', 'RN4', 'RN5', 'RN6', 'RN7']);
  assert.equal(escenarios.length, 29);
  assert.equal(criterios.length, 9);
});

test('SC-008 cada regla, escenario y criterio aparece en un nombre de test', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  const nombres = nombresDeTest();
  const faltan = [...reglas, ...escenarios, ...criterios]
    .filter((id) => !MEDIDOS_A_MANO.has(id))
    .filter((id) => !nombres.some((nombre) => new RegExp(`(^|[^\\w-])${id}(?![\\w-])`).test(nombre)));
  assert.deepEqual(faltan, []);
});

test('SC-008 SC-002 y SC-003 tienen su protocolo manual en la lista de entrega', () => {
  const lista = readFileSync(join(RAIZ, 'specs/001-nucleo-agenda/checklists/entrega.md'), 'utf8');
  for (const criterio of MEDIDOS_A_MANO) assert.match(lista, new RegExp(criterio));
});

test('SC-008 todos los tests empiezan por lo que comprueban', () => {
  const sinReferencia = nombresDeTest().filter((nombre) =>
    !/^(\$\{regla\}|RN\d|FR-\d{3}|SC-\d{3}|H\d-E\d|CL )/.test(nombre));
  assert.deepEqual(sinReferencia, []);
});
