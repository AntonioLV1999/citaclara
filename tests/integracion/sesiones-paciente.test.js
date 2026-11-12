import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, sesionPacienteDePrueba,
} from '../ayudas/escenario.js';
import { pagina } from '../../src/web/plantilla.js';
import { crearServidor } from '../../src/web/servidor.js';

const DIA = '2026-11-11';
const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
let e;
let servidor;
let tokenPaciente;
let id;
let panelAtendido;

// Simula una ruta del panel de analítica de la 004: si alguna vez se atiende, SC-012 falla.
const RUTAS_DEL_PANEL = [
  { metodo: 'GET', patron: '/panel', manejador: () => { panelAtendido = true; return pagina('<p>Ana Núñez</p>'); } },
  { metodo: 'POST', patron: '/panel/exportar', manejador: () => { panelAtendido = true; return pagina('<p>Ana Núñez</p>'); } },
];

beforeEach(async () => {
  e = crearEscenario();
  panelAtendido = false;
  servidor = await escuchar(crearServidor({
    bd: e.bd, ahora: relojFijo(`${DIA}T12:00:00+01:00`), rutasExtra: RUTAS_DEL_PANEL,
  }));
  tokenPaciente = sesionPacienteDePrueba(e.bd, e.a.pacientes[0]);
  id = citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: `${DIA}T16:00`,
  });
});
afterEach(async () => {
  await detener(servidor);
  e.cerrar();
});

const volcado = () => JSON.stringify(['cita', 'paciente', 'sesion', 'sesion_paciente']
  .map((tabla) => e.bd.prepare(`SELECT * FROM ${tabla} ORDER BY rowid`).all()));

/** Un formulario que, con sesión, haría efecto en cualquier POST: crear cita, cancelar o cambiar el correo. */
const formularioValido = () => ({
  accion: 'cancelar',
  email: 'otro@example.com',
  profesional: String(e.a.fisio),
  servicio: String(e.a.sesion),
  paciente: String(e.a.pacientes[0]),
  dia: '11/11/2026',
  hora: '18:00',
});

for (const [nombre, cookieDe] of [
  ['en su propia cookie', (token) => `sesion_paciente=${token}`],
  ['puesta en la cookie de recepción', (token) => `sesion=${token}`],
  ['con las dos cookies a la vez', (token) => `sesion_paciente=${token}; sesion=${token}`],
]) {
  test(`H4-E5 SC-012 FR-037 una sesión de paciente válida ${nombre} no abre ninguna ruta de recepción ni del panel`, async () => {
    const protegidas = servidor.rutasRegistradas.filter((ruta) => !ruta.publica);
    assert.ok(protegidas.some((r) => r.patron === '/panel'), 'la ruta simulada del panel debe estar registrada');
    // Las 11 rutas protegidas del contrato de la 001 y las 2 del panel simulado.
    assert.ok(protegidas.length >= 13, `rutas protegidas: ${protegidas.length}`);
    const antes = volcado();
    for (const { metodo, patron } of protegidas) {
      const ruta = patron.replace(':id', String(id));
      const r = await peticion(servidor, {
        metodo, ruta, cookie: cookieDe(tokenPaciente), formulario: metodo === 'POST' ? formularioValido() : undefined,
      });
      if (metodo === 'GET') {
        assert.equal(r.estado, 303, `${metodo} ${patron}`);
        assert.equal(r.ubicacion, '/acceso', `${metodo} ${patron}`);
      } else {
        assert.equal(r.estado, 401, `${metodo} ${patron}`);
      }
      assert.doesNotMatch(r.texto, /Ana Núñez|Óscar Peña|600 000 00|María/, `${metodo} ${patron}`);
    }
    assert.equal(panelAtendido, false);
    assert.equal(volcado(), antes);
  });
}

test('CL sesión de recepción y de paciente en el mismo navegador: recepción funciona y salir no cierra la otra', async () => {
  const recepcion = sesionDePrueba(e.bd, e.a.id);
  const ambas = `${recepcion}; sesion_paciente=${tokenPaciente}`;

  const agenda = await peticion(servidor, { ruta: `/agenda?dia=${DIA}`, cookie: ambas });
  assert.equal(agenda.estado, 200);
  assert.match(agenda.texto, /Ana Núñez/);

  const salida = await peticion(servidor, { metodo: 'POST', ruta: '/salir', cookie: ambas });
  assert.equal(salida.estado, 303);
  assert.equal(e.bd.prepare('SELECT count(*) AS n FROM sesion').get().n, 0);
  assert.equal(e.bd.prepare('SELECT count(*) AS n FROM sesion_paciente').get().n, 1);
  assert.ok(salida.cookies.every((c) => !c.startsWith('sesion_paciente=')), JSON.stringify(salida.cookies));
  assert.ok(salida.cookies.some((c) => c.startsWith('sesion=;')), JSON.stringify(salida.cookies));
});

// El modelo de acceso del paciente es de la 002 (contrato de interfaz web de la 001): su único módulo
// conoce la cookie y la tabla, y el resto de rutas y servicios los usa a través de él.
const MODELO_DE_ACCESO_DE_LA_002 = new Set([join('servicios', 'acceso-paciente.js')]);

test('FR-037 ninguna ruta ni servicio de la 001 crea o lee sesiones de paciente', () => {
  const archivos = ['web', 'servicios'].flatMap((carpeta) => readdirSync(join(SRC, carpeta), { recursive: true })
    .filter((a) => a.endsWith('.js'))
    .map((a) => join(carpeta, a)))
    .filter((archivo) => !MODELO_DE_ACCESO_DE_LA_002.has(archivo));
  assert.ok(archivos.length > 10);
  for (const archivo of archivos) {
    assert.doesNotMatch(readFileSync(join(SRC, archivo), 'utf8'), /sesion_paciente/, archivo);
  }
});
