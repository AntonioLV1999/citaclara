import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { peticion, textoVisible } from '../ayudas/escenario.js';
import {
  citaDe, enlaceCancelacionDePrueba, entrarComoPaciente, escenarioSemilla, fichaPorNombre, tokenInventado,
} from '../ayudas/portal.js';
import { anularEnlace } from '../../src/datos/pacientes.js';

const MINUTO = 60_000;
const T0 = Date.UTC(2026, 10, 4, 11, 0, 0);
let s;
let reloj;

beforeEach(async () => {
  reloj = T0;
  s = await escenarioSemilla({ relojReal: () => reloj });
});
afterEach(() => s.cerrar());

const abrir = (token, cookie) => peticion(s.servidor, { ruta: `/e/${token}`, cookie });
const hash = (token) => createHash('sha256').update(token).digest('hex');
const enlacesDeLaSemilla = () => new Set(s.datos.pacientes.map((p) => p.enlace));

/** Un enlace personal del almacén, no el de demostración (002/FR-025). */
function enlaceDelAlmacen(nombre) {
  const ficha = fichaPorNombre(s.bd, nombre);
  return { ficha, enlace: anularEnlace(s.bd, s.clinica.id, ficha.id) };
}

test('002/H1-E2 con su enlace, Isabel Navarro entra en su página sin escribir nada', async () => {
  const { enlace } = fichaPorNombre(s.bd, 'Isabel Navarro');
  const r = await abrir(enlace);
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, '/portal');
  assert.equal(r.cookies.length, 1);
  const [cookie] = r.cookies;
  assert.match(cookie, /^sesion_paciente=[0-9a-f]{64}; /);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
  assert.doesNotMatch(cookie, /Max-Age|Expires/i);
  assert.equal(r.cabeceras.get('referrer-policy'), 'no-referrer');

  const portal = await peticion(s.servidor, { ruta: '/portal', cookie: cookie.split(';')[0] });
  assert.equal(portal.estado, 200);
  assert.match(textoVisible(portal.texto), /Isabel Navarro/);
});

test('002/H1-E3 002/FR-003 cualquier enlace no válido, de los dos tipos, da exactamente la misma respuesta', async () => {
  const valido = tokenInventado();
  const { ficha: david, enlace: anterior } = enlaceDelAlmacen('David Gil');
  anularEnlace(s.bd, s.clinica.id, david.id);
  const empezada = enlaceCancelacionDePrueba(s.bd, citaDe(s.bd, david.id, '2026-11-02T15:15').id);
  const isabel = fichaPorNombre(s.bd, 'Isabel Navarro');
  const borrada = enlaceCancelacionDePrueba(s.bd, citaDe(s.bd, isabel.id, '2026-11-10T18:00').id);
  anularEnlace(s.bd, s.clinica.id, isabel.id);

  const tokens = {
    inventado: valido,
    'de 31 caracteres': valido.slice(0, 31),
    'con mayúsculas': `A${valido.slice(1).toUpperCase()}`,
    'con un guion': `${valido.slice(0, 31)}-`,
    'personal anulado': anterior,
    'de cancelación inexistente': tokenInventado(),
    'de cancelación con la cita ya empezada': empezada,
    'de cancelación borrado por RP7': borrada,
  };
  const respuestas = [];
  for (const [tipo, token] of Object.entries(tokens)) respuestas.push([tipo, await abrir(token)]);

  const [, primera] = respuestas[0];
  assert.equal(primera.estado, 404);
  assert.match(textoVisible(primera.texto), /Este enlace no funciona/);
  for (const [tipo, r] of respuestas) {
    assert.equal(r.estado, primera.estado, tipo);
    assert.equal(r.texto, primera.texto, tipo);
    assert.deepEqual(r.cookies, [], tipo);
    assert.doesNotMatch(r.texto, /Eleva|cancelación/i, tipo);
    for (const { nombre } of s.datos.pacientes) assert.equal(r.texto.includes(nombre), false, `${tipo}: ${nombre}`);
  }
  assert.equal(s.bd.prepare('SELECT count(*) AS n FROM sesion_paciente').get().n, 0);
});

test('002/FR-025 los enlaces de estos tests son aleatorios y ninguno es de la semilla', () => {
  const semilla = enlacesDeLaSemilla();
  const generados = [tokenInventado(), tokenInventado(), enlaceDelAlmacen('David Gil').enlace,
    enlaceCancelacionDePrueba(s.bd, citaDe(s.bd, fichaPorNombre(s.bd, 'Rocío Marín').id, '2026-10-27T14:30').id)];
  for (const token of generados) {
    assert.match(token, /^[0-9a-f]{32}$/);
    assert.equal(semilla.has(token), false);
  }
  assert.equal(new Set(generados).size, generados.length);
});

test('RP6 un enlace de cancelación vigente abre una sesión de su cita, que no abre la página personal', async () => {
  const david = fichaPorNombre(s.bd, 'David Gil');
  const cita = citaDe(s.bd, david.id, '2026-11-09T18:00');
  const token = enlaceCancelacionDePrueba(s.bd, cita.id);
  const r = await abrir(token);
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, '/cancelar');
  const cookie = r.cookies[0].split(';')[0];
  const sesion = s.bd.prepare('SELECT * FROM sesion_paciente WHERE token_hash = ?').get(hash(cookie.split('=')[1]));
  assert.equal(sesion.cita_id, cita.id);
  assert.equal(sesion.paciente_id, david.id);

  const portal = await peticion(s.servidor, { ruta: '/portal', cookie });
  assert.equal(portal.estado, 401);
  assert.doesNotMatch(portal.texto, /David Gil/);
});

describe('002/H1-E4 002/FR-004 límite de intentos con enlaces no válidos', () => {
  for (const momentoFijado of [undefined, null]) {
    const nombre = momentoFijado === null ? 'con el reloj real' : 'con el reloj fijado';
    test(`002/H1-E4 002/FR-004 diez enlaces no válidos en diez minutos bloquean la dirección 15 minutos, ${nombre}`, async () => {
      if (momentoFijado === null) {
        await s.cerrar();
        s = await escenarioSemilla({ momentoFijado: null, relojReal: () => reloj });
      }
      const { enlace } = enlaceDelAlmacen('Isabel Navarro');
      for (let i = 0; i < 10; i += 1) {
        // Los dos tipos cuentan juntos: personales inventados y de cancelación inexistentes.
        assert.equal((await abrir(tokenInventado())).estado, 404, `intento ${i + 1}`);
        reloj += 30_000;
      }
      const undecimo = await abrir(tokenInventado());
      assert.equal(undecimo.estado, 429);
      const valido = await abrir(enlace);
      assert.equal(valido.estado, 429);
      assert.deepEqual(valido.cookies, []);
      assert.match(textoVisible(valido.texto), /Demasiados intentos/);
      assert.match(textoVisible(valido.texto), /Espera 15 minutos/);
      assert.equal(valido.texto, undecimo.texto);

      reloj = T0 + 9 * 30_000 + 15 * MINUTO + 1000;
      assert.equal((await abrir(enlace)).estado, 303);
    });
  }

  test('002/H1-E4 nueve fallos, once minutos de espera y otros nueve fallos no bloquean', async () => {
    const { enlace } = enlaceDelAlmacen('Isabel Navarro');
    for (let i = 0; i < 9; i += 1) assert.equal((await abrir(tokenInventado())).estado, 404);
    reloj += 11 * MINUTO;
    for (let i = 0; i < 9; i += 1) assert.equal((await abrir(tokenInventado())).estado, 404);
    assert.equal((await abrir(enlace)).estado, 303);
  });

  test('002/FR-004 las peticiones a /portal, con o sin sesión, no cuentan como intentos', async () => {
    const { enlace } = enlaceDelAlmacen('Isabel Navarro');
    for (let i = 0; i < 9; i += 1) assert.equal((await abrir(tokenInventado())).estado, 404);
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await peticion(s.servidor, { ruta: '/portal' })).estado, 401);
      assert.equal((await peticion(s.servidor, { ruta: '/portal', cookie: `sesion_paciente=${tokenInventado()}` })).estado, 401);
    }
    assert.equal((await abrir(enlace)).estado, 303);
  });
});

test('002/H1-E7 al salir, hace falta abrir de nuevo el enlace para ver las citas', async () => {
  const { enlace } = fichaPorNombre(s.bd, 'David Gil');
  const cookie = await entrarComoPaciente(s.servidor, enlace);
  const salida = await peticion(s.servidor, { metodo: 'POST', ruta: '/portal/salir', cookie });
  assert.equal(salida.estado, 200);
  assert.match(textoVisible(salida.texto), /Has salido/);
  assert.match(salida.cookies[0], /^sesion_paciente=;/);
  assert.match(salida.cookies[0], /Max-Age=0/);
  assert.equal(s.bd.prepare('SELECT count(*) AS n FROM sesion_paciente').get().n, 0);
  const despues = await peticion(s.servidor, { ruta: '/portal', cookie });
  assert.equal(despues.estado, 401);
  assert.match(textoVisible(despues.texto), /Tu sesión ha terminado/);
});

test('002/CL Sesión de recepción y de paciente en el mismo navegador: salir de una no cierra la otra', async () => {
  const paciente = await entrarComoPaciente(s.servidor, fichaPorNombre(s.bd, 'David Gil').enlace);
  const ambas = `${s.recepcion()}; ${paciente}`;

  const salirPortal = await peticion(s.servidor, { metodo: 'POST', ruta: '/portal/salir', cookie: ambas });
  assert.ok(salirPortal.cookies.every((c) => !c.startsWith('sesion=')), JSON.stringify(salirPortal.cookies));
  assert.equal(s.bd.prepare('SELECT count(*) AS n FROM sesion').get().n, 1);
  assert.equal((await peticion(s.servidor, { ruta: '/agenda', cookie: ambas })).estado, 200);

  const otra = await entrarComoPaciente(s.servidor, fichaPorNombre(s.bd, 'David Gil').enlace);
  const ambasOtra = `${s.recepcion()}; ${otra}`;
  await peticion(s.servidor, { metodo: 'POST', ruta: '/salir', cookie: ambasOtra });
  assert.equal(s.bd.prepare('SELECT count(*) AS n FROM sesion_paciente').get().n, 1);
  assert.equal((await peticion(s.servidor, { ruta: '/portal', cookie: ambasOtra })).estado, 200);
});
