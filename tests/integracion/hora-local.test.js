import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { MENSAJES } from '../../src/dominio/reglas.js';
import { crearServidor } from '../../src/web/servidor.js';

const RELOJ = '2026-10-01T12:00:00+02:00';
const CAMBIOS_DE_HORA = ['2026-10-25', '2027-03-28', '2027-10-31'];
const ZONAS_DEL_SERVIDOR = ['Europe/Madrid', 'Atlantic/Canary', 'America/New_York', 'Asia/Tokyo', 'UTC'];
let e;
let servidor;
let cookies;
const zonaOriginal = process.env.TZ;

beforeEach(async () => {
  e = crearEscenario();
  servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo(RELOJ) }));
  cookies = { a: sesionDePrueba(e.bd, e.a.id), b: sesionDePrueba(e.bd, e.b.id) };
});
afterEach(async () => {
  if (zonaOriginal === undefined) delete process.env.TZ; else process.env.TZ = zonaOriginal;
  await detener(servidor);
  e.cerrar();
});

const clinicas = () => [['a', e.a], ['b', e.b]];

const reservar = (clave, clinica, dia, hora) => peticion(servidor, {
  metodo: 'POST',
  ruta: '/citas',
  cookie: cookies[clave],
  formulario: {
    profesional: clinica.fisio, servicio: clinica.sesion, paciente: clinica.pacientes[0], dia, hora,
  },
});

const verAgenda = (clave, clinica, dia) => peticion(servidor, {
  ruta: `/agenda?profesional=${clinica.fisio}&dia=${dia}`, cookie: cookies[clave],
});

test('FR-025 SC-009 las citas a ambos lados del cambio de hora conservan las 10:00', async () => {
  for (const [clave, clinica] of clinicas()) {
    for (const dia of ['2026-10-23', '2026-10-26']) {
      assert.equal((await reservar(clave, clinica, dia, '10:00')).estado, 303);
      assert.match(textoVisible((await verAgenda(clave, clinica, dia)).texto), /10:00 a 10:45/);
    }
  }
  const guardadas = e.bd.prepare('SELECT DISTINCT substr(inicio, 12) AS hora FROM cita').all();
  assert.deepEqual(guardadas.map((c) => c.hora), ['10:00']);
});

test('SC-009 FR-023 cambiar la zona del proceso no altera lo que se muestra', async () => {
  await reservar('a', e.a, '2026-10-26', '10:00');
  await reservar('b', e.b, '2026-10-26', '10:00');
  const referencia = {
    a: (await verAgenda('a', e.a, '2026-10-26')).texto,
    b: (await verAgenda('b', e.b, '2026-10-26')).texto,
  };
  for (const zona of ZONAS_DEL_SERVIDOR) {
    process.env.TZ = zona;
    assert.equal((await verAgenda('a', e.a, '2026-10-26')).texto, referencia.a, zona);
    assert.equal((await verAgenda('b', e.b, '2026-10-26')).texto, referencia.b, zona);
  }
});

test('SC-009 FR-023 hoy no depende de la zona del proceso', async () => {
  const noche = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-11T23:30:00Z') }));
  try {
    for (const zona of ZONAS_DEL_SERVIDOR) {
      process.env.TZ = zona;
      const madrid = await peticion(noche, { ruta: '/agenda', cookie: cookies.a });
      const canarias = await peticion(noche, { ruta: '/agenda', cookie: cookies.b });
      assert.match(textoVisible(madrid.texto), /12\/11\/2026/, zona);
      assert.match(textoVisible(canarias.texto), /11\/11\/2026/, zona);
    }
  } finally {
    await detener(noche);
  }
});

test('RN2 FR-025 el reloj del servidor se interpreta en la zona de cada clínica', async () => {
  const momento = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-10-26T10:00:00Z') }));
  const reservarEn = (clave, clinica, hora) => peticion(momento, {
    metodo: 'POST',
    ruta: '/citas',
    cookie: cookies[clave],
    formulario: {
      profesional: clinica.fisio, servicio: clinica.sesion, paciente: clinica.pacientes[0], dia: '2026-10-26', hora,
    },
  });
  try {
    // 10:00 UTC del lunes 26: son las 11:00 en Madrid y las 10:00 en Canarias.
    assert.equal((await reservarEn('a', e.a, '10:30')).estado, 422);
    assert.equal((await reservarEn('b', e.b, '10:30')).estado, 303);
  } finally {
    await detener(momento);
  }
});

for (const dia of CAMBIOS_DE_HORA) {
  test(`FR-025 el ${dia} se rechaza con mensaje claro en las dos zonas`, async () => {
    const horas = { a: ['02:00', '02:30', '02:45', '01:30', '03:00', '10:00'], b: ['01:00', '01:30', '01:45', '00:30', '02:00', '10:00'] };
    for (const [clave, clinica] of clinicas()) {
      for (const hora of horas[clave]) {
        const r = await reservar(clave, clinica, dia, hora);
        assert.equal(r.estado, 422, `${clave} ${hora}`);
        assert.ok(textoVisible(r.texto).includes(MENSAJES.horario), `${clave} ${hora}`);
      }
    }
    assert.equal(e.bd.prepare('SELECT count(*) AS n FROM cita').get().n, 0);
  });
}

test('FR-025 la agenda de un día de cambio de hora no ofrece reservar', async () => {
  for (const dia of CAMBIOS_DE_HORA) {
    const r = await verAgenda('a', e.a, dia);
    assert.equal(r.estado, 200);
    assert.doesNotMatch(r.texto, /href="\/citas\/nueva\?profesional/);
  }
});
