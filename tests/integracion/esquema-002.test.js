import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { abrirBd, EsquemaAntiguo } from '../../src/datos/bd.js';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';

const DIA = '2026-11-11';
let e;

beforeEach(() => { e = crearEscenario(); });
afterEach(() => e.cerrar());

const tokenAleatorio = () => randomBytes(16).toString('hex');
const nuevaFicha = (campos = {}) => Number(e.bd.prepare(`INSERT INTO paciente (clinica_id, nombre, telefono${
  Object.keys(campos).map((c) => `, ${c}`).join('')}) VALUES (?, 'Ficha nueva', '600 000 009'${
  Object.keys(campos).map(() => ', ?').join('')})`).run(e.a.id, ...Object.values(campos)).lastInsertRowid);
const enlaceDe = (id) => e.bd.prepare('SELECT enlace FROM paciente WHERE id = ?').get(id).enlace;
const citaDe = (paciente, inicio = `${DIA}T10:00`) => citaDirecta(e.bd, {
  clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente, inicio,
});
const sesion = (pacienteId, citaId) => e.bd
  .prepare('INSERT INTO sesion_paciente (token_hash, paciente_id, cita_id, ultima_actividad) VALUES (?, ?, ?, ?)')
  .run(tokenAleatorio(), pacienteId, citaId, Date.now());

describe('002/FR-001 enlace personal de cada ficha', () => {
  test('002/FR-001 una ficha insertada sin enlace recibe uno de 32 caracteres hexadecimales, distinto en cada ficha', () => {
    const enlaces = [...e.a.pacientes, nuevaFicha(), nuevaFicha()].map(enlaceDe);
    for (const enlace of enlaces) assert.match(enlace, /^[0-9a-f]{32}$/);
    assert.equal(new Set(enlaces).size, enlaces.length);
  });

  test('002/FR-001 un enlace nulo explícito se rechaza', () => {
    assert.throws(() => nuevaFicha({ enlace: null }), /NOT NULL/);
    assert.throws(() => e.bd.prepare('UPDATE paciente SET enlace = NULL WHERE id = ?').run(e.a.pacientes[0]), /NOT NULL/);
  });
});

describe('002/FR-025 forma del enlace personal', () => {
  test('002/FR-025 se rechaza un enlace de 31 o 33 caracteres, con mayúsculas o con un carácter no hexadecimal', () => {
    const valido = tokenAleatorio();
    for (const malo of [valido.slice(0, 31), `${valido}0`, valido.toUpperCase().replace(/^[0-9]/, 'A'), `${valido.slice(0, 31)}g`, '']) {
      assert.throws(() => nuevaFicha({ enlace: malo }), /CHECK/, malo);
    }
    assert.match(enlaceDe(nuevaFicha({ enlace: valido })), new RegExp(`^${valido}$`));
  });

  test('002/FR-025 dos fichas no pueden tener el mismo enlace', () => {
    const valido = tokenAleatorio();
    nuevaFicha({ enlace: valido });
    assert.throws(() => nuevaFicha({ enlace: valido }), /UNIQUE/);
    const indices = e.bd.prepare("PRAGMA index_list('paciente')").all();
    assert.ok(indices.some((i) => i.name === 'paciente_enlace' && i.unique === 1));
  });
});

describe('RP1 sesiones de paciente con alcance de cita', () => {
  test('RP1 una sesión con la cita de otro paciente se rechaza en el almacén', () => {
    const [ana, oscar] = e.a.pacientes;
    const deOscar = citaDe(oscar);
    assert.throws(() => sesion(ana, deOscar), /SESION_CITA/);
    assert.equal(e.bd.prepare('SELECT count(*) AS n FROM sesion_paciente').get().n, 0);
  });

  test('RP1 una sesión con una cita del mismo paciente, o sin cita, se acepta', () => {
    const [ana] = e.a.pacientes;
    sesion(ana, citaDe(ana));
    sesion(ana, null);
    assert.equal(e.bd.prepare('SELECT count(*) AS n FROM sesion_paciente').get().n, 2);
  });

  test('RP1 la cita de una sesión debe existir', () => {
    assert.throws(() => sesion(e.a.pacientes[0], 999999), /SESION_CITA|FOREIGN KEY/);
  });
});

test('002/FR-004 la última actividad de una sesión de paciente es obligatoria', () => {
  assert.throws(
    () => e.bd.prepare('INSERT INTO sesion_paciente (token_hash, paciente_id) VALUES (?, ?)').run(tokenAleatorio(), e.a.pacientes[0]),
    /NOT NULL/,
  );
  const columnas = e.bd.prepare("PRAGMA table_info('sesion_paciente')").all().map((c) => c.name);
  assert.deepEqual(columnas, ['token_hash', 'paciente_id', 'cita_id', 'ultima_actividad']);
});

describe('RP6 enlaces de cancelación', () => {
  const insertar = (hash, cita) => e.bd.prepare('INSERT INTO enlace_cancelacion (token_hash, cita_id) VALUES (?, ?)').run(hash, cita);

  test('RP6 un enlace de cancelación exige su hash, único, y una cita que exista', () => {
    const cita = citaDe(e.a.pacientes[0]);
    insertar('a'.repeat(64), cita);
    assert.throws(() => insertar('a'.repeat(64), cita), /UNIQUE|PRIMARY KEY/);
    assert.throws(() => insertar(null, cita), /NOT NULL/);
    assert.throws(() => insertar('b'.repeat(64), null), /NOT NULL/);
    assert.throws(() => insertar('c'.repeat(64), 999999), /FOREIGN KEY/);
    assert.equal(e.bd.prepare('SELECT count(*) AS n FROM enlace_cancelacion').get().n, 1);
  });

  test('RP6 los enlaces de cancelación tienen un índice por cita', () => {
    const indices = e.bd.prepare("PRAGMA index_list('enlace_cancelacion')").all().map((i) => i.name);
    assert.ok(indices.includes('enlace_cancelacion_cita'), JSON.stringify(indices));
  });
});

describe('002/FR-001 versión 3 del esquema', () => {
  let carpeta;
  beforeEach(() => { carpeta = mkdtempSync(join(tmpdir(), 'citaclara-version3-')); });
  afterEach(() => rmSync(carpeta, { recursive: true, force: true }));

  test('002/FR-001 un archivo nuevo queda en la versión 3', () => {
    const bd = abrirBd(join(carpeta, 'nuevo.db'));
    assert.equal(bd.prepare('PRAGMA user_version').get().user_version, 3);
    bd.close();
  });

  test('002/FR-001 un archivo de la versión 2 se rechaza con EsquemaAntiguo sin modificarlo', () => {
    const ruta = join(carpeta, 'version2.db');
    const vieja = new DatabaseSync(ruta);
    vieja.exec('CREATE TABLE clinica (id INTEGER PRIMARY KEY, nombre TEXT); PRAGMA user_version = 2');
    vieja.close();
    const antes = readFileSync(ruta);
    assert.throws(() => abrirBd(ruta), (error) => error instanceof EsquemaAntiguo && /npm run semilla/.test(error.message));
    assert.deepEqual(readFileSync(ruta), antes);
    assert.equal(existsSync(`${ruta}-wal`), false);
  });
});
