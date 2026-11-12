import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
// 002/SC-010: miden el uso real de personas, y se comprueban a mano con el protocolo de entrega.md.
const MEDIDOS_A_MANO = new Set(['002/SC-002', '002/SC-003', '002/SC-008', '002/SC-009']);

// FR-035 de la 001 y 002/FR-024: las reglas de la 002 sin prefijo, y lo demás con `002/` delante.
const EMPIEZA_POR_LA_002 = /^(RP\d|002\/(FR-\d{3}|SC-\d{3}|H\d-E\d|CL))/;

function identificadoresDeLaSpec() {
  const spec = readFileSync(join(RAIZ, 'specs/002-portal-paciente/spec.md'), 'utf8');
  const reglas = [...spec.matchAll(/^- \*\*(RP\d+)/gm)].map((m) => m[1]);
  const criterios = [...spec.matchAll(/^- \*\*(SC-\d{3})\*\*/gm)].map((m) => `002/${m[1]}`);
  const escenarios = [];
  let historia = 0;
  for (const linea of spec.split('\n')) {
    const cabecera = linea.match(/^### Historia de usuario (\d+)/);
    if (cabecera) historia = Number(cabecera[1]);
    const escenario = linea.match(/^(\d+)\. \*\*Dad[oa]s?\*\*/);
    if (escenario) escenarios.push(`002/H${historia}-E${escenario[1]}`);
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

/** Cubre un identificador el test que empieza por uno de la 002 y lo nombra, sin nada pegado delante ni detrás. */
function cubre(nombres, id) {
  const escapado = id.replace('/', '\\/');
  const aparece = new RegExp(String.raw`(?<![/\p{L}\d_-])${escapado}(?![\p{L}\d_-])`, 'u');
  return nombres.some((nombre) => EMPIEZA_POR_LA_002.test(nombre) && aparece.test(nombre));
}

test('002/SC-010 la spec tiene las reglas, escenarios y criterios esperados', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  assert.deepEqual(reglas, ['RP1', 'RP2', 'RP3', 'RP4', 'RP5', 'RP6', 'RP7']);
  assert.equal(escenarios.length, 30);
  for (const [historia, cantidad] of [[1, 8], [2, 7], [3, 7], [4, 8]]) {
    assert.equal(escenarios.filter((e) => e.startsWith(`002/H${historia}-`)).length, cantidad, `historia ${historia}`);
  }
  assert.equal(criterios.length, 10);
});

test('002/SC-010 cada regla, escenario y criterio tiene un test que empieza por él', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  const nombres = nombresDeTest();
  const faltan = [...reglas, ...escenarios, ...criterios]
    .filter((id) => !MEDIDOS_A_MANO.has(id))
    .filter((id) => !cubre(nombres, id));
  assert.deepEqual(faltan, []);
});

test('002/SC-010 los criterios medidos a mano tienen protocolo en la lista de entrega', () => {
  const lista = readFileSync(join(RAIZ, 'specs/002-portal-paciente/checklists/entrega.md'), 'utf8');
  for (const criterio of MEDIDOS_A_MANO) {
    const sinPrefijo = criterio.slice(4);
    assert.match(lista, new RegExp(`### ${sinPrefijo}:`), criterio);
    assert.match(lista, new RegExp(`\\*\\*${sinPrefijo}\\*\\* medido y cumplido`), criterio);
  }
});

test('002/SC-010 un identificador de la 002 sin su prefijo, o pegado a otro texto, no cuenta', () => {
  assert.equal(cubre(['FR-038 lo cita H1-E1'], '002/H1-E1'), false);
  assert.equal(cubre(['002/H1-E1 algo'], '002/H1-E1'), true);
  assert.equal(cubre(['002/H1-E10 algo'], '002/H1-E1'), false);
  assert.equal(cubre(['RN8 y RP3 a la vez'], 'RP3'), false);
  assert.equal(cubre(['RP3 el plazo es el de RN8'], 'RP3'), true);
  assert.equal(cubre(['RP1 xRP3'], 'RP3'), false);
});
