import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, sesionPacienteDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { pagina } from '../../src/web/plantilla.js';
import { crearServidor } from '../../src/web/servidor.js';

const DIA = '2026-11-11';
const T0 = Date.UTC(2026, 10, 11, 11, 0, 0);
const MINUTO = 60_000;
let e;
let servidor;
let llamadas;
let reloj;
let cita;

const RUTAS = ['ficha', 'cita', 'cualquiera'].flatMap((alcance) => ['GET', 'POST'].map((metodo) => ({
  metodo,
  patron: `/prueba-paciente/${alcance}`,
  paciente: true,
  alcance,
  manejador: (contexto) => {
    llamadas.push({ alcance, contexto });
    return pagina(`<p>Dentro: ${alcance}</p>`);
  },
})));

async function levantar(opciones = {}) {
  servidor = await escuchar(crearServidor({
    bd: e.bd,
    ahora: relojFijo(`${DIA}T12:00:00+01:00`),
    relojReal: () => reloj,
    direccion: 'https://citas.example.com',
    rutasExtra: RUTAS,
    ...opciones,
  }));
}

beforeEach(async () => {
  e = crearEscenario();
  llamadas = [];
  reloj = T0;
  cita = citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: `${DIA}T16:00`,
  });
  await levantar();
});
afterEach(async () => {
  await detener(servidor);
  e.cerrar();
});

const abrir = (alcance, cookie, metodo = 'GET') => peticion(servidor, {
  metodo, ruta: `/prueba-paciente/${alcance}`, cookie, formulario: metodo === 'POST' ? {} : undefined,
});
const deFicha = (ahoraReal = T0) => sesionPacienteDePrueba(e.bd, e.a.pacientes[0], { ahoraReal });
const deCita = (ahoraReal = T0) => sesionPacienteDePrueba(e.bd, e.a.pacientes[0], { citaId: cita, ahoraReal });
const hash = (token) => createHash('sha256').update(token).digest('hex');
const filaDe = (token) => e.bd.prepare('SELECT * FROM sesion_paciente WHERE token_hash = ?').get(hash(token));

function sesionTerminada(r, contexto) {
  assert.equal(r.estado, 401, contexto);
  assert.match(textoVisible(r.texto), /Tu sesión ha terminado/, contexto);
  assert.doesNotMatch(r.texto, /Dentro|Ana Núñez|Clínica Norte/, contexto);
}

describe('002/FR-005 las rutas de paciente solo se abren con una sesión de paciente', () => {
  test('002/FR-005 sin sesión, con una sesión inventada o con la de recepción, cada ruta de paciente responde 401', async () => {
    const recepcion = sesionDePrueba(e.bd, e.a.id).split('=')[1];
    const cookies = [
      undefined,
      `sesion_paciente=${randomBytes(32).toString('hex')}`,
      `sesion=${recepcion}`,
      `sesion_paciente=${recepcion}`,
    ];
    for (const cookie of cookies) {
      for (const { metodo, alcance } of RUTAS) sesionTerminada(await abrir(alcance, cookie, metodo), `${metodo} ${alcance} ${cookie}`);
    }
    assert.equal(llamadas.length, 0);
  });

  test('002/FR-005 una sesión de paciente puesta en la cookie de recepción no abre las rutas de paciente', async () => {
    const token = deFicha();
    for (const { metodo, alcance } of RUTAS) sesionTerminada(await abrir(alcance, `sesion=${token}`, metodo), `${metodo} ${alcance}`);
    assert.equal(llamadas.length, 0);
  });
});

describe('RP6 cada ruta de paciente declara el alcance que admite', () => {
  test('RP6 una sesión de alcance de cita no abre una ruta de ficha, y una de ficha no abre una de cita', async () => {
    sesionTerminada(await abrir('ficha', `sesion_paciente=${deCita()}`), 'cita en ficha');
    sesionTerminada(await abrir('cita', `sesion_paciente=${deFicha()}`), 'ficha en cita');
    assert.equal(llamadas.length, 0);
  });

  test('RP6 las dos sesiones abren una ruta de alcance cualquiera', async () => {
    assert.equal((await abrir('cualquiera', `sesion_paciente=${deCita()}`)).estado, 200);
    assert.equal((await abrir('cualquiera', `sesion_paciente=${deFicha()}`)).estado, 200);
    assert.equal((await abrir('ficha', `sesion_paciente=${deFicha()}`)).estado, 200);
    assert.equal((await abrir('cita', `sesion_paciente=${deCita()}`)).estado, 200);
    assert.equal(llamadas.length, 4);
  });
});

describe('002/FR-004 la sesión caduca tras 30 minutos sin actividad, en tiempo real', () => {
  for (const momentoFijado of [null, '2026-11-04T12:00']) {
    const nombre = momentoFijado ? 'también con el reloj fijado' : 'con el reloj real';
    test(`002/FR-004 a los 29 minutos 59 segundos sigue valiendo y se renueva, y a los 30 minutos 1 segundo no, ${nombre}`, async () => {
      await detener(servidor);
      await levantar({ momentoFijado });
      const viva = deFicha();
      reloj = T0 + 29 * MINUTO + 59_000;
      assert.equal((await abrir('ficha', `sesion_paciente=${viva}`)).estado, 200);
      assert.equal(filaDe(viva).ultima_actividad, reloj);
      // Renovada: cuenta otra vez desde la última petición.
      reloj += 29 * MINUTO;
      assert.equal((await abrir('ficha', `sesion_paciente=${viva}`)).estado, 200);

      const caducada = deFicha(T0);
      reloj = T0 + 30 * MINUTO + 1000;
      sesionTerminada(await abrir('ficha', `sesion_paciente=${caducada}`), 'caducada');
      assert.equal(filaDe(caducada), undefined);
    });
  }
});

test('002/FR-025 las respuestas de las rutas de paciente no envían el referente ni se guardan en caché', async () => {
  for (const cookie of [undefined, `sesion_paciente=${deFicha()}`]) {
    const r = await abrir('ficha', cookie);
    assert.equal(r.cabeceras.get('referrer-policy'), 'no-referrer');
    assert.equal(r.cabeceras.get('cache-control'), 'no-store');
  }
});

test('002/FR-005 el manejador recibe el paciente, la clínica de la ficha, la cita del alcance, el reloj real y la dirección', async () => {
  await abrir('ficha', `sesion_paciente=${deFicha()}`);
  await abrir('cita', `sesion_paciente=${deCita()}`);
  const [ficha, deLaCita] = llamadas.map((l) => l.contexto);
  assert.equal(ficha.paciente.id, e.a.pacientes[0]);
  assert.equal(ficha.clinica.id, e.a.id);
  assert.equal(ficha.citaDelAlcance, null);
  assert.equal(ficha.relojReal(), reloj);
  assert.equal(ficha.direccion, 'https://citas.example.com');
  assert.equal(deLaCita.citaDelAlcance.id, cita);
  assert.equal(deLaCita.paciente.id, e.a.pacientes[0]);
});

test('002/FR-026 rutasRegistradas dice qué rutas son de paciente y su alcance, y las de paciente son públicas', () => {
  const deps = servidor.rutasRegistradas.filter((r) => r.patron.startsWith('/prueba-paciente/'));
  assert.equal(deps.length, 6);
  for (const ruta of deps) {
    assert.equal(ruta.paciente, true);
    assert.equal(ruta.publica, true);
    assert.equal(ruta.patron, `/prueba-paciente/${ruta.alcance}`);
  }
  const agenda = servidor.rutasRegistradas.find((r) => r.patron === '/agenda');
  assert.equal(agenda.paciente, false);
  assert.equal(agenda.publica, false);
});
