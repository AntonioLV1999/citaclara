import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { crearServidor } from '../../src/web/servidor.js';

const DIA = '2026-11-11';
let e;
let servidor;

beforeEach(async () => {
  e = crearEscenario();
  servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo(`${DIA}T12:00:00+01:00`) }));
});
afterEach(async () => {
  await detener(servidor);
  e.cerrar();
});

const entrar = (clave) => peticion(servidor, { metodo: 'POST', ruta: '/acceso', formulario: { clave } });
const cookieDe = (respuesta) => respuesta.cookies[0].split(';')[0];

test('H4-E1 con la clave correcta se entra en la agenda de la clínica', async () => {
  const r = await entrar('clave-norte');
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, '/agenda');
  const agenda = await peticion(servidor, { ruta: '/agenda', cookie: cookieDe(r) });
  assert.equal(agenda.estado, 200);
  assert.match(textoVisible(agenda.texto), /Clínica Norte/);
});

test('H4-E1 cada clave abre su clínica', async () => {
  const r = await entrar('clave-sur');
  const agenda = await peticion(servidor, { ruta: '/agenda', cookie: cookieDe(r) });
  assert.match(textoVisible(agenda.texto), /Clínica Sur/);
});

test('H4-E1 la cookie de sesión es HttpOnly, SameSite=Strict y sin Max-Age', async () => {
  const [cookie] = (await entrar('clave-norte')).cookies;
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.doesNotMatch(cookie, /Max-Age|Expires/i);
});

test('H4-E2 con una clave incorrecta se muestra el mensaje y ningún dato', async () => {
  const r = await entrar('clave-mala');
  assert.equal(r.estado, 401);
  assert.equal(r.cookies.length, 0);
  const texto = textoVisible(r.texto);
  assert.ok(texto.includes('La clave no es correcta. Revísala e inténtalo de nuevo.'));
  assert.doesNotMatch(texto, /Clínica Norte|María|Ana/);
});

test('H4-E2 una clave vacía se trata como incorrecta', async () => {
  assert.equal((await entrar('')).estado, 401);
  const sinCampo = await peticion(servidor, { metodo: 'POST', ruta: '/acceso', formulario: {} });
  assert.equal(sinCampo.estado, 401);
});

test('H4-E3 FR-001 sin sesión se rechazan todas las rutas registradas', async () => {
  const id = citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: `${DIA}T10:00`,
  });
  const protegidas = servidor.rutasRegistradas.filter((ruta) => !ruta.publica);
  assert.ok(protegidas.length >= 7, 'deben estar registradas todas las rutas del contrato');
  for (const { metodo, patron } of protegidas) {
    const ruta = patron.replace(':id', String(id));
    const r = await peticion(servidor, { metodo, ruta, formulario: metodo === 'POST' ? { accion: 'cancelar' } : undefined });
    if (metodo === 'GET') {
      assert.equal(r.estado, 303, patron);
      assert.equal(r.ubicacion, '/acceso', patron);
    } else {
      assert.equal(r.estado, 401, patron);
    }
    assert.doesNotMatch(r.texto, /Ana Núñez|María/, patron);
  }
  assert.equal(e.bd.prepare('SELECT estado FROM cita WHERE id = ?').get(id).estado, 'reservada');
  assert.equal(e.bd.prepare('SELECT count(*) AS n FROM cita').get().n, 1);
});

// Ampliado, como prevé FR-001, con las rutas públicas del modelo de acceso de la 002 y solo con ellas:
// la del enlace y las de paciente (contracts/portal-web.md de la 002).
test('FR-001 solo la pantalla de acceso es pública', () => {
  const publicas = servidor.rutasRegistradas.filter((ruta) => ruta.publica).map((r) => `${r.metodo} ${r.patron}`);
  assert.deepEqual(publicas.sort(), [
    'GET /acceso', 'GET /e/:token', 'GET /portal', 'GET /portal/citas/:id/cancelar',
    'POST /acceso', 'POST /portal/citas/:id/cancelar', 'POST /portal/salir',
  ]);
});

test('FR-001 están registradas las rutas del contrato', () => {
  const rutas = servidor.rutasRegistradas.map((r) => `${r.metodo} ${r.patron}`);
  for (const ruta of [
    'GET /acceso', 'POST /acceso', 'POST /salir', 'GET /', 'GET /agenda', 'GET /citas/nueva', 'POST /citas/nueva', 'POST /citas',
    'GET /pacientes/buscar', 'GET /citas/:id/confirmar', 'POST /citas/:id/estado',
    'GET /citas/:id/correo', 'POST /citas/:id/correo',
  ]) {
    assert.ok(rutas.includes(ruta), ruta);
  }
});

test('FR-002 la clave no aparece en ninguna respuesta', async () => {
  const buena = await entrar('clave-norte');
  const cookie = cookieDe(buena);
  const mala = await entrar('clave-que-no-vale');
  const respuestas = [
    buena,
    mala,
    await peticion(servidor, { ruta: '/acceso' }),
    await peticion(servidor, { ruta: '/agenda', cookie }),
    await peticion(servidor, { ruta: '/citas/nueva', cookie }),
  ];
  for (const r of respuestas) {
    const todo = r.texto + r.cookies.join() + (r.ubicacion ?? '');
    assert.doesNotMatch(todo, /clave-norte|clave-que-no-vale/);
  }
});

test('FR-002 la clave no se guarda de forma legible', () => {
  const clinica = e.bd.prepare('SELECT * FROM clinica WHERE id = ?').get(e.a.id);
  assert.notEqual(clinica.clave_hash, 'clave-norte');
  assert.equal(clinica.clave_hash.length, 128);
  e.bd.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  assert.equal(readFileSync(e.ruta).includes('clave-norte'), false);
});

test('FR-002 las sesiones guardan el hash del token, no el token', async () => {
  const token = cookieDe(await entrar('clave-norte')).split('=')[1];
  const sesiones = e.bd.prepare('SELECT token_hash FROM sesion').all();
  assert.equal(sesiones.length, 1);
  assert.notEqual(sesiones[0].token_hash, token);
});

test('H4-E4 FR-003 al salir hace falta de nuevo la clave', async () => {
  const cookie = cookieDe(await entrar('clave-norte'));
  const salida = await peticion(servidor, { metodo: 'POST', ruta: '/salir', cookie });
  assert.equal(salida.estado, 303);
  assert.equal(salida.ubicacion, '/acceso');
  const r = await peticion(servidor, { ruta: '/agenda', cookie });
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, '/acceso');
  assert.equal(e.bd.prepare('SELECT count(*) AS n FROM sesion').get().n, 0);
});

test('FR-003 al salir el navegador olvida la cookie', async () => {
  const cookie = cookieDe(await entrar('clave-norte'));
  const salida = await peticion(servidor, { metodo: 'POST', ruta: '/salir', cookie });
  assert.match(salida.cookies[0], /^sesion=;/);
  assert.match(salida.cookies[0], /Max-Age=0/);
});

test('FR-004 CL datos de otra clínica: una sesión no ve ni toca datos ajenos por identificador', async () => {
  const cookie = sesionDePrueba(e.bd, e.b.id);
  const ajena = citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: `${DIA}T15:00`,
  });
  const peticiones = [
    { ruta: `/agenda?profesional=${e.a.fisio}` },
    { ruta: `/citas/nueva?profesional=${e.a.fisio}` },
    { ruta: `/citas/${ajena}/confirmar?accion=cancelar` },
    { metodo: 'POST', ruta: `/citas/${ajena}/estado`, formulario: { accion: 'cancelar' } },
    {
      metodo: 'POST',
      ruta: '/citas',
      formulario: { profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], dia: DIA, hora: '17:00' },
    },
  ];
  for (const opciones of peticiones) {
    const r = await peticion(servidor, { ...opciones, cookie });
    assert.equal(r.estado, 404, opciones.ruta);
    assert.doesNotMatch(r.texto, /Ana Núñez|María/);
  }
  assert.equal(e.bd.prepare('SELECT estado FROM cita WHERE id = ?').get(ajena).estado, 'reservada');
  assert.equal(e.bd.prepare('SELECT count(*) AS n FROM cita').get().n, 1);
});

test('FR-004 la agenda de una clínica no muestra profesionales de otra', async () => {
  const r = await peticion(servidor, { ruta: '/agenda', cookie: sesionDePrueba(e.bd, e.b.id) });
  const texto = textoVisible(r.texto);
  assert.match(texto, /Pablo/);
  assert.doesNotMatch(texto, /María|Jorge|Lucía/);
});

test('FR-027 la pantalla de acceso está en español y pide la clave', async () => {
  const r = await peticion(servidor, { ruta: '/acceso' });
  assert.equal(r.estado, 200);
  assert.match(r.texto, /lang="es-ES"/);
  assert.match(r.texto, /type="password"/);
  assert.match(textoVisible(r.texto), /Clave de la clínica/);
});
