import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
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

  test('RN4 admite las tres transiciones desde reservada', () => {
    for (const final of ['completada', 'cancelada', 'no_asistida']) {
      const otra = alta({ inicio: `${DIA}T${final === 'completada' ? 12 : final === 'cancelada' ? 14 : 16}:00` });
      e.bd.prepare('UPDATE cita SET estado = ? WHERE id = ?').run(final, otra);
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
      cambiar('estado = ?', definitivo);
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
