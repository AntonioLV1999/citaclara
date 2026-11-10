import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, sesionPacienteDePrueba,
  textoVisible,
} from '../ayudas/escenario.js';
import { crearServidor } from '../../src/web/servidor.js';
import { cargar, resumen } from '../../src/semilla/carga.js';
import { generar } from '../../src/semilla/generador.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { comprobarClave } from '../../src/servicios/acceso.js';

const COMANDO = fileURLToPath(new URL('../../src/semilla/comando.js', import.meta.url));
let e;
let datos;

beforeEach(() => {
  e = crearEscenario();
  datos = generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO });
});
afterEach(() => e.cerrar());

const idEleva = () => e.bd.prepare("SELECT id FROM clinica WHERE nombre = 'Clínica Eleva'").get()?.id;
const volcar = () => Object.fromEntries(['clinica', 'profesional', 'servicio', 'paciente', 'cita'].map((tabla) => [
  tabla,
  e.bd.prepare(`SELECT * FROM ${tabla} ORDER BY id`).all(),
]));
const citasEleva = () => e.bd.prepare('SELECT * FROM cita WHERE clinica_id = ? ORDER BY inicio, profesional_id').all(idEleva());

function comando(carpeta, ...argumentos) {
  return spawnSync(process.execPath, [COMANDO, ...argumentos], { cwd: carpeta, encoding: 'utf8' });
}

function conCarpeta(fn) {
  const carpeta = mkdtempSync(join(tmpdir(), 'citaclara-comando-'));
  try {
    return fn(carpeta);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

test('FR-033 los disparadores del almacén aceptan todos los registros de la semilla', () => {
  cargar(e.bd, datos);
  assert.equal(citasEleva().length, datos.citas.length);
  assert.equal(e.bd.prepare('SELECT count(*) AS n FROM paciente WHERE clinica_id = ?').get(idEleva()).n, 40);
});

test('H5-E1 FR-032 repetir la carga no duplica nada', () => {
  cargar(e.bd, datos);
  const primera = volcar();
  cargar(e.bd, datos);
  assert.deepEqual(
    Object.values(volcar()).map((filas) => filas.length),
    Object.values(primera).map((filas) => filas.length),
  );
  const canonico = (citas) => citas.map((c) => `${c.inicio} ${c.fin} ${c.estado}`).sort();
  assert.deepEqual(canonico(citasEleva()), canonico(datos.citas));
});

test('H5-E1 la carga sustituye también las citas creadas a mano en Clínica Eleva', () => {
  cargar(e.bd, datos);
  const clinica = idEleva();
  const profesional = e.bd.prepare('SELECT id FROM profesional WHERE clinica_id = ? ORDER BY id').get(clinica).id;
  const servicio = e.bd.prepare('SELECT id FROM servicio WHERE clinica_id = ? AND especialidad = ? ORDER BY id').get(clinica, 'Fisioterapia').id;
  const paciente = e.bd.prepare('SELECT id FROM paciente WHERE clinica_id = ? ORDER BY id').get(clinica).id;
  citaDirecta(e.bd, { clinica, profesional, servicio, paciente, inicio: '2027-05-05T10:00' });
  cargar(e.bd, datos);
  assert.equal(citasEleva().length, datos.citas.length);
  assert.equal(citasEleva().some((c) => c.inicio.startsWith('2027-05-05')), false);
});

test('H5-E1 la carga no toca los datos de otras clínicas', () => {
  citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: '2026-11-11T10:00',
  });
  cargar(e.bd, datos);
  cargar(e.bd, datos);
  assert.equal(e.bd.prepare('SELECT count(*) AS n FROM cita WHERE clinica_id = ?').get(e.a.id).n, 1);
});

test('H5-E1 las sesiones abiertas de Clínica Eleva no impiden repetir la carga', () => {
  cargar(e.bd, datos);
  e.bd.prepare("INSERT INTO sesion (token_hash, clinica_id) VALUES ('x', ?)").run(idEleva());
  cargar(e.bd, datos);
  assert.equal(e.bd.prepare('SELECT count(*) AS n FROM sesion').get().n, 0);
});

test('FR-029 la clave eleva-demo es válida y abre Clínica Eleva', () => {
  cargar(e.bd, datos);
  assert.equal(comprobarClave(e.bd, 'eleva-demo').nombre, 'Clínica Eleva');
  assert.equal(comprobarClave(e.bd, 'otra-clave'), null);
});

test('FR-033 un fallo a mitad deja los datos anteriores intactos', () => {
  cargar(e.bd, datos);
  const antes = volcar();
  const ocupada = datos.citas.find((c) => c.estado === 'completada');
  const corruptos = { ...datos, citas: [...datos.citas, { ...ocupada }] };
  assert.throws(() => cargar(e.bd, corruptos), /SOLAPE/);
  assert.deepEqual(volcar(), antes);
  assert.equal(e.bd.isTransaction, false);
});

test('FR-033 RN7 el disparador vigila también la semilla', () => {
  const fisioterapia = datos.citas.find((c) => datos.profesionales[c.profesional].especialidad === 'Fisioterapia');
  const corruptos = { ...datos, citas: [{ ...fisioterapia, profesional: 2 }] };
  assert.throws(() => cargar(e.bd, corruptos), /ESPECIALIDAD/);
  assert.equal(idEleva(), undefined);
});

test('FR-032 el resumen cuenta pacientes, historia, estados y reservas futuras', () => {
  const r = resumen(datos);
  assert.equal(r.pacientes, 40);
  assert.equal(r.historia, r.completadas + r.noAsistidas + r.canceladas);
  assert.equal(r.historia + r.futuras, datos.citas.length);
  assert.match(r.contenido, /^[0-9a-f]{64}$/);
  assert.match(r.sinFechas, /^[0-9a-f]{64}$/);
});

test('FR-032 un --lunes que no es lunes falla sin escribir nada', () => {
  conCarpeta((carpeta) => {
    const r = comando(carpeta, '--lunes', '2026-11-03');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /no es lunes/);
    assert.doesNotMatch(r.stderr, /at |Error:/);
    assert.equal(existsSync(join(carpeta, 'datos')), false);
  });
});

test('FR-032 un --lunes que no es una fecha falla sin escribir nada', () => {
  conCarpeta((carpeta) => {
    for (const valor of ['mañana', '2026-02-30', '02/11/2026']) {
      const r = comando(carpeta, '--lunes', valor);
      assert.notEqual(r.status, 0);
      assert.equal(existsSync(join(carpeta, 'datos')), false);
    }
  });
});

test('FR-032 un parámetro desconocido falla con un mensaje claro', () => {
  conCarpeta((carpeta) => {
    const r = comando(carpeta, '--semana', '3');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--lunes/);
    assert.equal(existsSync(join(carpeta, 'datos')), false);
  });
});

test('FR-032 SC-005 el comando imprime el resumen del contrato y repetirlo da lo mismo', () => {
  conCarpeta((carpeta) => {
    const primera = comando(carpeta);
    assert.equal(primera.status, 0, primera.stderr);
    assert.match(primera.stdout, /^Clínica Eleva · lunes de referencia 02\/11\/2026\n/);
    assert.match(primera.stdout, /Pacientes: 40 · Citas de historia: \d+\n/);
    assert.match(primera.stdout, / {2}Completadas: \d+ \(\d+,\d %\) · No asistidas: \d+ \(\d+,\d %\) · Canceladas: \d+ \(\d+,\d %\)\n/);
    assert.match(primera.stdout, /Reservas futuras: \d+\n/);
    assert.match(primera.stdout, /Resumen de contenido: [0-9a-f]{64}\n/);
    assert.match(primera.stdout, /Resumen sin fechas: [0-9a-f]{64}\n/);
    assert.equal(comando(carpeta).stdout, primera.stdout);
  });
});

test('FR-032 el comando acepta otro lunes y conserva el resumen sin fechas', () => {
  conCarpeta((carpeta) => {
    const sinFechas = (salida) => salida.match(/Resumen sin fechas: (\w+)/)[1];
    const contenido = (salida) => salida.match(/Resumen de contenido: (\w+)/)[1];
    const base = comando(carpeta).stdout;
    const otra = comando(carpeta, '--lunes', '2026-11-09').stdout;
    assert.match(otra, /lunes de referencia 09\/11\/2026/);
    assert.equal(sinFechas(otra), sinFechas(base));
    assert.notEqual(contenido(otra), contenido(base));
  });
});

test('H5-E4 SC-011 en la base, la clínica tiene teléfono, los pacientes enlace y las canceladas origen recepcion', () => {
  cargar(e.bd, datos);
  const clinica = idEleva();
  assert.equal(e.bd.prepare('SELECT telefono FROM clinica WHERE id = ?').get(clinica).telefono, '000 200 000');
  const enlaces = e.bd.prepare('SELECT enlace FROM paciente WHERE clinica_id = ?').all(clinica).map((p) => p.enlace);
  assert.equal(enlaces.length, 40);
  assert.ok(enlaces.every((enlace) => /^[0-9a-f]{32}$/.test(enlace)));
  const canceladas = citasEleva().filter((c) => c.estado === 'cancelada');
  assert.equal(canceladas.length, 37);
  for (const cita of canceladas) {
    assert.equal(cita.origen_cancelacion, 'recepcion');
    assert.equal(cita.momento_cancelacion, cita.inicio);
  }
  const sinOrigen = e.bd.prepare("SELECT count(*) AS n FROM cita WHERE estado = 'cancelada' AND origen_cancelacion IS NULL").get().n;
  assert.equal(sinOrigen, 0);
});

test('FR-032 repetir la carga cierra las sesiones de paciente de Clínica Eleva y no las de otra clínica', () => {
  cargar(e.bd, datos);
  const pacienteEleva = e.bd.prepare('SELECT id FROM paciente WHERE clinica_id = ? ORDER BY id').get(idEleva()).id;
  sesionPacienteDePrueba(e.bd, pacienteEleva);
  sesionPacienteDePrueba(e.bd, e.a.pacientes[0]);
  cargar(e.bd, datos);
  const quedan = e.bd.prepare('SELECT paciente_id FROM sesion_paciente').all().map((s) => s.paciente_id);
  assert.deepEqual(quedan, [e.a.pacientes[0]]);
});

test('H6-E7 la agenda muestra las canceladas de la semilla como «Cancelada», sin fecha ni hora', async () => {
  cargar(e.bd, datos);
  const cita = citasEleva().find((c) => c.estado === 'cancelada');
  const servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-04T12:00:00+01:00') }));
  try {
    const r = await peticion(servidor, {
      ruta: `/agenda?profesional=${cita.profesional_id}&dia=${cita.inicio.slice(0, 10)}`,
      cookie: sesionDePrueba(e.bd, idEleva()),
    });
    const texto = textoVisible(r.texto);
    assert.match(texto, /\bCancelada\b/);
    assert.doesNotMatch(texto, /Cancelada por el paciente/);
  } finally {
    await detener(servidor);
  }
});

test('FR-032 el comando, ante un archivo de datos de otra versión, explica que hay que borrarlo y no lo toca', () => {
  conCarpeta((carpeta) => {
    mkdirSync(join(carpeta, 'datos'));
    const ruta = join(carpeta, 'datos', 'citaclara.db');
    const vieja = new DatabaseSync(ruta);
    vieja.exec('CREATE TABLE clinica (id INTEGER PRIMARY KEY, nombre TEXT)');
    vieja.close();
    const antes = readFileSync(ruta);

    const r = comando(carpeta);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Bórralo/);
    assert.match(r.stderr, /npm run semilla/);
    assert.doesNotMatch(r.stderr, /\n\s+at |EsquemaAntiguo:/);
    assert.equal(r.stdout, '');
    assert.deepEqual(readFileSync(ruta), antes);
  });
});
