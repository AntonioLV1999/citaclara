import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { abrirBd, EsquemaAntiguo } from '../../src/datos/bd.js';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';

const DIA = '2026-11-11';
let e;
let base;

beforeEach(() => {
  e = crearEscenario();
  base = { clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0] };
});
afterEach(() => e.cerrar());

const contar = () => e.bd.prepare('SELECT count(*) AS n FROM cita').get().n;
const alta = (extra) => citaDirecta(e.bd, { ...base, ...extra });

function rechazada(extra, motivo) {
  const antes = contar();
  assert.throws(() => alta(extra), motivo);
  assert.equal(contar(), antes);
}

describe('RN1 en el almacén', () => {
  beforeEach(() => alta({ inicio: `${DIA}T10:00` }));

  test('RN1 aborta el solape exacto', () => rechazada({ inicio: `${DIA}T10:00` }, /SOLAPE/));
  test('RN1 aborta el solape parcial por el final', () => rechazada({ inicio: `${DIA}T10:30` }, /SOLAPE/));
  test('RN1 aborta el solape parcial por el principio', () => rechazada({ inicio: `${DIA}T09:30` }, /SOLAPE/));
  test('RN1 aborta la cita que contiene a otra', () =>
    rechazada({ inicio: `${DIA}T09:45`, servicio: e.a.primeraFisio, fin: `${DIA}T10:45` }, /SOLAPE/));

  test('RN1 aborta la cita contenida en otra', () => {
    alta({ inicio: `${DIA}T14:00`, servicio: e.a.primeraFisio });
    rechazada({ inicio: `${DIA}T14:15` }, /SOLAPE/);
    rechazada({ inicio: `${DIA}T14:00` }, /SOLAPE/);
  });

  test('RN1 acepta la cita contigua por detrás y por delante', () => {
    alta({ inicio: `${DIA}T10:45` });
    alta({ inicio: `${DIA}T09:15` });
    assert.equal(contar(), 3);
  });

  test('RN1 no impide la misma hora a otro profesional', () => {
    alta({ profesional: e.a.fisio2, inicio: `${DIA}T10:00` });
    assert.equal(contar(), 2);
  });

  test('RN1 vigila también la inserción directa de una cita completada', () =>
    rechazada({ inicio: `${DIA}T10:15`, estado: 'completada' }, /SOLAPE/));
});

test('RN1 una cita completada ya existente también bloquea', () => {
  alta({ inicio: `${DIA}T10:00`, estado: 'completada' });
  rechazada({ inicio: `${DIA}T10:15` }, /SOLAPE/);
});

test('RN1 ignora las citas canceladas y no asistidas', () => {
  alta({ inicio: `${DIA}T10:00`, estado: 'cancelada' });
  alta({ inicio: `${DIA}T12:00`, estado: 'no_asistida' });
  alta({ inicio: `${DIA}T10:00` });
  alta({ inicio: `${DIA}T12:00` });
  assert.equal(contar(), 4);
});

test('RN1 una cita cancelada puede guardarse encima de otra sin bloquear', () => {
  alta({ inicio: `${DIA}T10:00` });
  alta({ inicio: `${DIA}T10:00`, estado: 'cancelada' });
  assert.equal(contar(), 2);
});

test('RN3 aborta un fin que no es el inicio más la duración', () => {
  rechazada({ inicio: `${DIA}T10:00`, fin: `${DIA}T10:30` }, /FIN/);
  rechazada({ inicio: `${DIA}T10:00`, fin: `${DIA}T11:00` }, /FIN/);
});

test('RN3 aborta un inicio que no es una fecha', () => {
  rechazada({ inicio: '2026-13-45T10:00', fin: '2026-13-45T10:45' }, /CHECK|FIN/);
});

describe('RN4 en el almacén', () => {
  let id;
  beforeEach(() => { id = alta({ inicio: `${DIA}T10:00` }); });

  const cambiar = (asignacion, ...valores) =>
    e.bd.prepare(`UPDATE cita SET ${asignacion} WHERE id = ?`).run(...valores, id);
  const estado = () => e.bd.prepare('SELECT estado FROM cita WHERE id = ?').get(id).estado;
  // FR-036: una cancelación válida escribe a la vez el estado, el origen y el momento.
  const llevarA = (final, citaId = id) => (final === 'cancelada'
    ? e.bd.prepare("UPDATE cita SET estado = 'cancelada', origen_cancelacion = 'recepcion', momento_cancelacion = ? WHERE id = ?")
      .run(`${DIA}T08:00`, citaId)
    : e.bd.prepare('UPDATE cita SET estado = ? WHERE id = ?').run(final, citaId));

  test('RN4 admite las tres transiciones desde reservada', () => {
    for (const final of ['completada', 'cancelada', 'no_asistida']) {
      const otra = alta({ inicio: `${DIA}T${final === 'completada' ? 12 : final === 'cancelada' ? 14 : 16}:00` });
      llevarA(final, otra);
      assert.equal(e.bd.prepare('SELECT estado FROM cita WHERE id = ?').get(otra).estado, final);
    }
  });

  test('RN4 aborta un estado de llegada que no existe', () => {
    assert.throws(() => cambiar('estado = ?', 'pendiente'), /ESTADO/);
    assert.equal(estado(), 'reservada');
  });

  test('RN4 aborta volver a reservada', () => {
    assert.throws(() => cambiar('estado = ?', 'reservada'), /ESTADO/);
  });

  for (const definitivo of ['completada', 'cancelada', 'no_asistida']) {
    test(`RN4 un estado ${definitivo} es definitivo`, () => {
      llevarA(definitivo);
      for (const otro of ['reservada', 'completada', 'cancelada', 'no_asistida']) {
        assert.throws(() => cambiar('estado = ?', otro), /ESTADO/);
      }
      assert.equal(estado(), definitivo);
    });
  }

  test('RN4 inmutabilidad: no cambian profesional, servicio, paciente, inicio ni fin', () => {
    assert.throws(() => cambiar('profesional_id = ?', e.a.fisio2), /INMUTABLE/);
    assert.throws(() => cambiar('servicio_id = ?', e.a.primeraFisio), /INMUTABLE/);
    assert.throws(() => cambiar('paciente_id = ?', e.a.pacientes[1]), /INMUTABLE/);
    assert.throws(() => cambiar('inicio = ?', `${DIA}T11:00`), /INMUTABLE/);
    assert.throws(() => cambiar('fin = ?', `${DIA}T11:00`), /INMUTABLE/);
    assert.throws(() => cambiar('estado = ?, inicio = ?', 'cancelada', `${DIA}T11:00`), /INMUTABLE/);
    assert.equal(estado(), 'reservada');
  });
});

test('RN7 aborta un servicio de otra especialidad', () => {
  rechazada({ inicio: `${DIA}T10:00`, servicio: e.a.consulta }, /ESPECIALIDAD/);
  rechazada({ inicio: `${DIA}T10:00`, profesional: e.a.nutri }, /ESPECIALIDAD/);
});

test('CL datos de otra clínica: el almacén aborta las referencias cruzadas', () => {
  rechazada({ inicio: `${DIA}T10:00`, paciente: e.b.pacientes[0] }, /CLINICA/);
  rechazada({ inicio: `${DIA}T10:00`, servicio: e.b.sesion }, /CLINICA/);
  rechazada({ inicio: `${DIA}T10:00`, profesional: e.b.fisio }, /CLINICA/);
  rechazada({ inicio: `${DIA}T10:00`, clinica: e.b.id }, /CLINICA/);
});

test('FR-011 rechaza un inicio con minutos fuera de 00, 15, 30 o 45', () => {
  for (const minutos of ['05', '10', '20', '59']) {
    rechazada({ inicio: `${DIA}T10:${minutos}` }, /CHECK/);
  }
  for (const [i, minutos] of ['00', '15', '30', '45'].entries()) {
    alta({ inicio: `${DIA}T1${i}:${minutos}` });
  }
  assert.equal(contar(), 4);
});

test('FR-023 la zona horaria solo admite la península o Canarias', () => {
  assert.throws(
    () => e.bd.prepare("INSERT INTO clinica (nombre, clave_hash, clave_sal, zona_horaria) VALUES ('X', 'h', 's', 'Europe/Paris')").run(),
    /CHECK/,
  );
});

test('FR-011 la duración de un servicio es positiva y múltiplo de 15', () => {
  const sql = "INSERT INTO servicio (clinica_id, nombre, especialidad, duracion_min, precio_centimos) VALUES (?, 'X', 'Fisioterapia', ?, 100)";
  for (const duracion of [0, -15, 20]) {
    assert.throws(() => e.bd.prepare(sql).run(e.a.id, duracion), /CHECK/);
  }
  e.bd.prepare(sql).run(e.a.id, 15);
});

test('FR-026 el precio no es negativo y se guarda en céntimos enteros', () => {
  const sql = "INSERT INTO servicio (clinica_id, nombre, especialidad, duracion_min, precio_centimos) VALUES (?, 'X', 'Fisioterapia', 15, ?)";
  assert.throws(() => e.bd.prepare(sql).run(e.a.id, -1), /CHECK/);
  assert.throws(() => e.bd.prepare(sql).run(e.a.id, 10.5), /CHECK/);
  e.bd.prepare(sql).run(e.a.id, 0);
});

test('FR-013 el nombre del paciente no puede quedar vacío tras recortar espacios', () => {
  const sql = 'INSERT INTO paciente (clinica_id, nombre, telefono, email) VALUES (?, ?, ?, ?)';
  assert.throws(() => e.bd.prepare(sql).run(e.a.id, '   ', '600000000', null), /CHECK/);
  assert.throws(() => e.bd.prepare(sql).run(e.a.id, 'Ana', null, null), /NOT NULL/);
  e.bd.prepare(sql).run(e.a.id, 'Ana', '600000000', null);
});

test('FR-020 el estado de una cita nueva es reservada y no admite otros valores', () => {
  const id = alta({ inicio: `${DIA}T10:00` });
  assert.equal(e.bd.prepare('SELECT estado FROM cita WHERE id = ?').get(id).estado, 'reservada');
  rechazada({ inicio: `${DIA}T12:00`, estado: 'pendiente' }, /CHECK/);
});

test('RN1 la conexión usa WAL, claves ajenas y una espera de bloqueo de 5.000 ms', () => {
  assert.equal(e.bd.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
  assert.equal(e.bd.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.equal(e.bd.prepare('PRAGMA busy_timeout').get().timeout, 5000);
});

describe('FR-036 SC-011 origen y momento de la cancelación en el almacén', () => {
  const INICIO = `${DIA}T10:00`;
  const MOMENTO = `${DIA}T08:00`;
  const fila = (id) => e.bd.prepare('SELECT * FROM cita WHERE id = ?').get(id);

  test('FR-036 SC-011 aborta una cancelada sin origen o sin momento', () => {
    rechazada({ inicio: INICIO, estado: 'cancelada', origen: null, momento: MOMENTO }, /CHECK/);
    rechazada({ inicio: INICIO, estado: 'cancelada', origen: 'portal', momento: null }, /CHECK/);
    rechazada({ inicio: INICIO, estado: 'cancelada', origen: null, momento: null }, /CHECK/);
  });

  test('FR-036 SC-011 aborta una cita no cancelada con origen o con momento', () => {
    for (const [i, estado] of ['reservada', 'completada', 'no_asistida'].entries()) {
      const inicio = `${DIA}T1${i}:00`;
      rechazada({ inicio, estado, origen: 'recepcion', momento: null }, /CHECK/);
      rechazada({ inicio, estado, origen: null, momento: MOMENTO }, /CHECK/);
      rechazada({ inicio, estado, origen: 'portal', momento: MOMENTO }, /CHECK/);
    }
  });

  test('FR-036 SC-011 solo admite los orígenes recepcion, portal y correo', () => {
    for (const origen of ['Recepción', 'recepción', 'telefono', '', 'PORTAL']) {
      rechazada({ inicio: INICIO, estado: 'cancelada', origen, momento: MOMENTO }, /CHECK/);
    }
    for (const [i, origen] of ['recepcion', 'portal', 'correo'].entries()) {
      alta({ inicio: `${DIA}T1${i}:00`, estado: 'cancelada', origen, momento: MOMENTO });
    }
    assert.equal(contar(), 3);
  });

  test('FR-036 SC-011 aborta un UPDATE a cancelada sin origen ni momento', () => {
    const id = alta({ inicio: INICIO });
    assert.throws(() => e.bd.prepare("UPDATE cita SET estado = 'cancelada' WHERE id = ?").run(id), /CHECK/);
    assert.throws(
      () => e.bd.prepare("UPDATE cita SET estado = 'cancelada', origen_cancelacion = 'portal' WHERE id = ?").run(id),
      /CHECK/,
    );
    assert.equal(fila(id).estado, 'reservada');
    assert.equal(fila(id).origen_cancelacion, null);
  });

  test('FR-036 SC-011 una cita reservada no puede ganar origen sin cancelarse', () => {
    const id = alta({ inicio: INICIO });
    assert.throws(
      () => e.bd.prepare("UPDATE cita SET origen_cancelacion = 'portal', momento_cancelacion = ? WHERE id = ?").run(MOMENTO, id),
      /CHECK|ESTADO/,
    );
    assert.equal(fila(id).origen_cancelacion, null);
  });

  test('FR-036 cita_rn4 rechaza corregir después el origen o el momento', () => {
    const id = alta({ inicio: INICIO, estado: 'cancelada', origen: 'portal', momento: MOMENTO });
    assert.throws(() => e.bd.prepare("UPDATE cita SET origen_cancelacion = 'correo' WHERE id = ?").run(id), /ESTADO/);
    assert.throws(() => e.bd.prepare('UPDATE cita SET momento_cancelacion = ? WHERE id = ?').run(`${DIA}T09:00`, id), /ESTADO/);
    assert.deepEqual(
      [fila(id).origen_cancelacion, fila(id).momento_cancelacion],
      ['portal', MOMENTO],
    );
  });
});

describe('FR-029 teléfono de la clínica y enlace del paciente', () => {
  const enlace = (id, valor) => e.bd.prepare('UPDATE paciente SET enlace = ? WHERE id = ?').run(valor, id);
  const VALIDO = 'c73f5e835397826416bda7b3e5323d02';

  test('FR-029 el enlace solo admite 32 caracteres hexadecimales en minúscula', () => {
    const [p] = e.a.pacientes;
    for (const malo of [VALIDO.toUpperCase(), VALIDO.slice(0, 31), `${VALIDO.slice(0, 31)}g`, `${VALIDO}0`, '']) {
      assert.throws(() => enlace(p, malo), /CHECK/, malo);
    }
    enlace(p, VALIDO);
    assert.equal(e.bd.prepare('SELECT enlace FROM paciente WHERE id = ?').get(p).enlace, VALIDO);
  });

  test('FR-029 el enlace es único entre los no nulos y admite varios nulos', () => {
    const [p1, p2, p3] = e.a.pacientes;
    enlace(p1, VALIDO);
    assert.throws(() => enlace(p2, VALIDO), /UNIQUE/);
    enlace(p2, null);
    enlace(p3, null);
    const nulos = e.bd.prepare('SELECT count(*) AS n FROM paciente WHERE enlace IS NULL').get().n;
    assert.ok(nulos >= 2);
  });

  test('FR-029 la clínica admite teléfono, y también que no lo tenga', () => {
    e.bd.prepare("UPDATE clinica SET telefono = '000 200 000' WHERE id = ?").run(e.a.id);
    assert.equal(e.bd.prepare('SELECT telefono FROM clinica WHERE id = ?').get(e.a.id).telefono, '000 200 000');
    assert.equal(e.bd.prepare('SELECT telefono FROM clinica WHERE id = ?').get(e.b.id).telefono, null);
  });
});

test('FR-037 las sesiones de paciente tienen su propia tabla, que referencia a paciente', () => {
  const columnas = e.bd.prepare("PRAGMA table_info('sesion_paciente')").all().map((c) => c.name);
  assert.deepEqual(columnas, ['token_hash', 'paciente_id']);
  const ajenas = e.bd.prepare("PRAGMA foreign_key_list('sesion_paciente')").all();
  assert.deepEqual(ajenas.map((a) => [a.from, a.table]), [['paciente_id', 'paciente']]);
  assert.throws(
    () => e.bd.prepare("INSERT INTO sesion_paciente (token_hash, paciente_id) VALUES ('x', 999999)").run(),
    /FOREIGN KEY/,
  );
});

describe('FR-032 versión del esquema del archivo de datos', () => {
  let carpeta;
  beforeEach(() => { carpeta = mkdtempSync(join(tmpdir(), 'citaclara-version-')); });
  afterEach(() => rmSync(carpeta, { recursive: true, force: true }));

  test('FR-032 un archivo nuevo queda en la versión 2 y se reabre sin error', () => {
    const ruta = join(carpeta, 'nuevo.db');
    const bd = abrirBd(ruta);
    assert.equal(bd.prepare('PRAGMA user_version').get().user_version, 2);
    bd.close();
    const otra = abrirBd(ruta);
    assert.equal(otra.prepare('PRAGMA user_version').get().user_version, 2);
    otra.close();
  });

  test('FR-032 un archivo con tablas de otra versión se rechaza sin tocarlo', () => {
    const ruta = join(carpeta, 'antiguo.db');
    const vieja = new DatabaseSync(ruta);
    vieja.exec('CREATE TABLE clinica (id INTEGER PRIMARY KEY, nombre TEXT)');
    vieja.close();
    const antes = readFileSync(ruta);

    assert.throws(() => abrirBd(ruta), (error) => {
      assert.ok(error instanceof EsquemaAntiguo);
      assert.match(error.message, /antiguo\.db/);
      assert.match(error.message, /Bórralo/);
      assert.match(error.message, /npm run semilla/);
      return true;
    });
    assert.deepEqual(readFileSync(ruta), antes);
    assert.equal(existsSync(`${ruta}-wal`), false);
  });
});
