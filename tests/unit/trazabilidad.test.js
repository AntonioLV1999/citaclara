import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MEDIDOS_A_MANO = new Set(['SC-002', 'SC-003']);

// FR-035: identificadores de la 001, sin prefijo; reglas de otras specs con su letra; y
// cualquier otro identificador de otra spec con su número y una barra delante.
const DE_LA_001 = String.raw`RN\d|FR-\d{3}|SC-\d{3}|H\d-E\d|CL `;
const EMPIEZA_POR_LA_001 = new RegExp(`^(${DE_LA_001})`);
const EMPIEZA_POR_REFERENCIA = new RegExp(
  String.raw`^(\$\{regla\}|${DE_LA_001}|R[PRA]\d|\d{3}/(FR-\d{3}|SC-\d{3}|H\d-E\d|CL))`,
);

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

/**
 * FR-035: solo cubren la 001 los nombres que empiezan por un identificador suyo, y dentro de
 * ellos un identificador cuenta si no lleva delante una barra, una letra, un dígito ni un guion.
 */
function cubre(nombres, id) {
  const aparece = new RegExp(String.raw`(?<![/\p{L}\d_-])${id}(?![\p{L}\d_-])`, 'u');
  return nombres.some((nombre) => EMPIEZA_POR_LA_001.test(nombre) && aparece.test(nombre));
}

test('SC-008 la spec tiene las reglas, escenarios y criterios esperados', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  assert.deepEqual(reglas, ['RN1', 'RN2', 'RN3', 'RN4', 'RN5', 'RN6', 'RN7', 'RN8']);
  assert.equal(escenarios.length, 42);
  assert.equal(criterios.length, 13);
});

test('SC-008 cada regla, escenario y criterio aparece en un nombre de test', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  const nombres = nombresDeTest();
  const faltan = [...reglas, ...escenarios, ...criterios]
    .filter((id) => !MEDIDOS_A_MANO.has(id))
    .filter((id) => !cubre(nombres, id));
  assert.deepEqual(faltan, []);
});

test('SC-008 SC-002 y SC-003 tienen su protocolo manual en la lista de entrega', () => {
  const lista = readFileSync(join(RAIZ, 'specs/001-nucleo-agenda/checklists/entrega.md'), 'utf8');
  for (const criterio of MEDIDOS_A_MANO) assert.match(lista, new RegExp(criterio));
});

test('SC-008 todos los tests empiezan por lo que comprueban', () => {
  const sinReferencia = nombresDeTest().filter((nombre) => !EMPIEZA_POR_REFERENCIA.test(nombre));
  assert.deepEqual(sinReferencia, []);
});

test('FR-035 un identificador con prefijo de otra spec no cuenta como uno de la 001', () => {
  assert.equal(cubre(['002/SC-010 el portal cancela'], 'SC-010'), false);
  assert.equal(cubre(['FR-038 lo cita 002/SC-010'], 'SC-010'), false);
  assert.equal(cubre(['FR-038 y SC-010 a la vez'], 'SC-010'), true);
});

test('FR-035 un test que empieza por una regla de otra spec no cubre la 001', () => {
  assert.equal(cubre(['RP1 el portal respeta RN8'], 'RN8'), false);
  assert.equal(cubre(['RN8 el plazo es de dos horas'], 'RN8'), true);
});

test('FR-035 un identificador pegado a una letra, un dígito o un guion no cuenta', () => {
  assert.equal(cubre(['FR-001 xRN8'], 'RN8'), false);
  assert.equal(cubre(['FR-001 RN81'], 'RN8'), false);
  assert.equal(cubre(['FR-001 H1-E10'], 'H1-E1'), false);
  assert.equal(cubre(['FR-001 a-SC-010'], 'SC-010'), false);
});

test('FR-035 la forma de los nombres admite las convenciones de todas las specs', () => {
  for (const nombre of ['RN1 x', 'FR-001 x', 'SC-001 x', 'H1-E1 x', 'CL x', 'RP1 x', 'RR2 x', 'RA3 x',
    '002/FR-017 x', '003/SC-001 x', '004/H5-E8 x', '002/CL x']) {
    assert.match(nombre, EMPIEZA_POR_REFERENCIA, nombre);
  }
  for (const nombre of ['funciona', 'RX1 x', '02/FR-017 x', 'CLx']) {
    assert.doesNotMatch(nombre, EMPIEZA_POR_REFERENCIA, nombre);
  }
});
