import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const SPEC = 'specs/004-panel-analitica/spec.md';
const MEDIDOS_A_MANO = new Set(['004/SC-006']);

// FR-023 de la 004 y FR-035 de la 001: las reglas van con su letra, sin prefijo; lo demás, con `004/`.
const EMPIEZA_POR_LA_004 = /^(RA\d|004\/(FR-\d{3}|SC-\d{3}|H\d-E\d|CL))/;

function identificadoresDeLaSpec() {
  const spec = readFileSync(join(RAIZ, SPEC), 'utf8');
  const reglas = [...spec.matchAll(/^- \*\*(RA\d+)/gm)].map((m) => m[1]);
  const criterios = [...spec.matchAll(/^- \*\*(SC-\d{3})\*\*/gm)].map((m) => `004/${m[1]}`);
  const escenarios = [];
  let historia = 0;
  for (const linea of spec.split(/\r?\n/)) {
    const cabecera = linea.match(/^### Historia de usuario (\d+)/);
    if (cabecera) historia = Number(cabecera[1]);
    const escenario = linea.match(/^(\d+)\. \*\*Dad[oa]s?\*\*/);
    if (escenario) escenarios.push(`004/H${historia}-E${escenario[1]}`);
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
 * Solo cubren la 004 los nombres que empiezan por un identificador suyo. Dentro de ellos, un
 * identificador cuenta si no lleva pegada delante una barra, una letra, un dígito ni un guion.
 */
function cubre(nombres, id) {
  const aparece = new RegExp(String.raw`(?<![/\p{L}\d_-])${id}(?![\p{L}\d_-])`, 'u');
  return nombres.some((nombre) => EMPIEZA_POR_LA_004.test(nombre) && aparece.test(nombre));
}

test('004/SC-008 la spec tiene las reglas, escenarios y criterios esperados', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  assert.deepEqual(reglas, ['RA1', 'RA2', 'RA3', 'RA4', 'RA5', 'RA6', 'RA7', 'RA8']);
  assert.equal(escenarios.length, 22);
  assert.deepEqual(criterios, ['004/SC-001', '004/SC-002', '004/SC-003', '004/SC-004', '004/SC-005',
    '004/SC-006', '004/SC-007', '004/SC-008']);
});

test('004/SC-008 cada regla, escenario y criterio aparece en un nombre de test de la 004', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  const nombres = nombresDeTest();
  const faltan = [...reglas, ...escenarios, ...criterios]
    .filter((id) => !MEDIDOS_A_MANO.has(id))
    .filter((id) => !cubre(nombres, id));
  assert.deepEqual(faltan, []);
});

test('004/SC-008 SC-006 tiene su protocolo manual en la lista de entrega', () => {
  const lista = readFileSync(join(RAIZ, 'specs/004-panel-analitica/checklists/entrega.md'), 'utf8');
  assert.match(lista, /SC-006/);
});

test('004/SC-008 un identificador sin el prefijo de la 004 no la cubre', () => {
  assert.equal(cubre(['SC-001 la semilla no solapa'], '004/SC-001'), false);
  assert.equal(cubre(['FR-030 lo cita 004/SC-001'], '004/SC-001'), false);
  assert.equal(cubre(['RN3 el fin sale del servicio y RA4'], 'RA4'), false);
  assert.equal(cubre(['004/SC-001 cifras de referencia'], '004/SC-001'), true);
  assert.equal(cubre(['004/FR-013 cuadra con RA5'], 'RA5'), true);
});

test('004/SC-008 un identificador pegado a otro texto no cuenta', () => {
  assert.equal(cubre(['RA1 xRA3'], 'RA3'), false);
  assert.equal(cubre(['RA1 RA31'], 'RA3'), false);
  assert.equal(cubre(['RA1 004/H1-E10'], '004/H1-E1'), false);
  assert.equal(cubre(['RA1 x004/H1-E1'], '004/H1-E1'), false);
  assert.equal(cubre(['RA1 005/004/H1-E1'], '004/H1-E1'), false);
});
