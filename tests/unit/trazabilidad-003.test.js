import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
// 003/SC-007: miden el uso real, y se comprueban a mano con el protocolo de checklists/entrega.md.
const MEDIDOS_A_MANO = new Set(['003/SC-001', '003/SC-005']);

// FR-035 de la 001 y 003/FR-023: las reglas de la 003 sin prefijo, y lo demás con `003/` delante.
const EMPIEZA_POR_LA_003 = /^(RR\d|003\/(FR-\d{3}|SC-\d{3}|H\d-E\d|CL))/;

function identificadoresDeLaSpec() {
  const spec = readFileSync(join(RAIZ, 'specs/003-recordatorios-cita/spec.md'), 'utf8');
  const reglas = [...spec.matchAll(/^- \*\*(RR\d+)/gm)].map((m) => m[1]);
  const criterios = [...spec.matchAll(/^- \*\*(SC-\d{3})\*\*/gm)].map((m) => `003/${m[1]}`);
  const escenarios = [];
  let historia = 0;
  for (const linea of spec.split(/\r?\n/)) {
    const cabecera = linea.match(/^### Historia de usuario (\d+)/);
    if (cabecera) historia = Number(cabecera[1]);
    const escenario = linea.match(/^(\d+)\. \*\*Dad[oa]s?\*\*/);
    if (escenario) escenarios.push(`003/H${historia}-E${escenario[1]}`);
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

/** Cubre un identificador el test que empieza por uno de la 003 y lo nombra, sin nada pegado delante ni detrás. */
function cubre(nombres, id) {
  const escapado = id.replace('/', '\\/');
  const aparece = new RegExp(String.raw`(?<![/\p{L}\d_-])${escapado}(?![\p{L}\d_-])`, 'u');
  return nombres.some((nombre) => EMPIEZA_POR_LA_003.test(nombre) && aparece.test(nombre));
}

test('003/SC-007 la spec tiene las reglas, escenarios y criterios esperados', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  assert.deepEqual(reglas, ['RR1', 'RR2', 'RR3', 'RR4', 'RR5', 'RR6']);
  assert.equal(escenarios.length, 27);
  for (const [historia, cantidad] of [[1, 10], [2, 10], [3, 5], [4, 2]]) {
    assert.equal(escenarios.filter((e) => e.startsWith(`003/H${historia}-`)).length, cantidad, `historia ${historia}`);
  }
  assert.deepEqual(criterios, ['SC-001', 'SC-002', 'SC-003', 'SC-004', 'SC-005', 'SC-006', 'SC-007'].map((c) => `003/${c}`));
});

test('003/SC-007 cada regla, escenario y criterio aparece en un nombre de test', () => {
  const { reglas, criterios, escenarios } = identificadoresDeLaSpec();
  const nombres = nombresDeTest();
  const faltan = [...reglas, ...escenarios, ...criterios]
    .filter((id) => !MEDIDOS_A_MANO.has(id))
    .filter((id) => !cubre(nombres, id));
  assert.deepEqual(faltan, []);
});

test('003/SC-007 SC-001 y SC-005 tienen su protocolo manual en la lista de entrega', () => {
  const lista = readFileSync(join(RAIZ, 'specs/003-recordatorios-cita/checklists/entrega.md'), 'utf8');
  for (const criterio of MEDIDOS_A_MANO) {
    const sinPrefijo = criterio.slice(4);
    assert.match(lista, new RegExp(`### ${sinPrefijo}:`), criterio);
    assert.match(lista, new RegExp(`\\*\\*${sinPrefijo}\\*\\* medido y cumplido`), criterio);
  }
});

test('003/SC-007 un identificador de la 003 sin su prefijo, o de la 001, no cuenta, ni al revés', () => {
  // Un `H1-E1` sin prefijo es de la 001: no cubre el de la 003.
  assert.equal(cubre(['FR-038 lo cita H1-E1'], '003/H1-E1'), false);
  assert.equal(cubre(['H1-E1 recepción reserva'], '003/H1-E1'), false);
  assert.equal(cubre(['003/H1-E1 algo'], '003/H1-E1'), true);
  assert.equal(cubre(['003/H1-E10 algo'], '003/H1-E1'), false);
  assert.equal(cubre(['002/H1-E1 algo'], '003/H1-E1'), false);
  assert.equal(cubre(['RN1 y RR1 a la vez'], 'RR1'), false);
  assert.equal(cubre(['RR1 un recordatorio'], 'RR1'), true);
  assert.equal(cubre(['RR2 xRR1'], 'RR1'), false);
  // Y al revés: el `003/H1-E1` no empieza por un identificador de la 001 sin prefijo.
  assert.doesNotMatch('003/H1-E1 algo', /^(RN\d|FR-\d{3}|SC-\d{3}|H\d-E\d|CL )/);
});
