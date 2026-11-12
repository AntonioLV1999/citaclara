import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { insertarCita } from '../../src/datos/citas.js';
import { crearPaciente } from '../../src/datos/pacientes.js';
import { cargar } from '../../src/semilla/carga.js';
import { peticion, sesionPacienteDePrueba, textoVisible } from '../ayudas/escenario.js';
import {
  AHORA, citaDe, enlaceCancelacionDePrueba, entrarComoPaciente, escenarioSemilla, fichaPorNombre,
} from '../ayudas/portal.js';

let s;

beforeEach(async () => { s = await escenarioSemilla(); });
afterEach(() => s.cerrar());

const volcadoCitas = () => JSON.stringify(s.bd.prepare('SELECT * FROM cita ORDER BY id').all());
const reservadasFuturas = () => s.bd.prepare("SELECT * FROM cita WHERE estado = 'reservada' AND inicio > ? ORDER BY inicio").all(AHORA);
const DATOS_DE_AGENDA = /María|Jorge|Lucía|Sesión de fisioterapia|Agenda de/;

test('002/H1-E8 002/FR-005 una sesión de David Gil, de ficha o de cita y en cualquier cookie, no abre ninguna ruta de recepción', async () => {
  const david = fichaPorNombre(s.bd, 'David Gil');
  const cita = citaDe(s.bd, david.id, '2026-11-09T18:00');
  const deFicha = await entrarComoPaciente(s.servidor, david.enlace);
  const deCita = (await peticion(s.servidor, { ruta: `/e/${enlaceCancelacionDePrueba(s.bd, cita.id)}` })).cookies[0].split(';')[0];
  const tokens = [deFicha, deCita].map((cookie) => cookie.split('=')[1]);
  const protegidas = s.servidor.rutasRegistradas.filter((r) => !r.publica);
  assert.ok(protegidas.length >= 14, `rutas protegidas: ${protegidas.length}`);
  const antes = volcadoCitas();

  for (const token of tokens) {
    for (const cookie of [`sesion_paciente=${token}`, `sesion=${token}`, `sesion_paciente=${token}; sesion=${token}`]) {
      for (const { metodo, patron } of protegidas) {
        const r = await peticion(s.servidor, {
          metodo, ruta: patron.replace(':id', String(cita.id)), cookie, formulario: metodo === 'POST' ? { accion: 'cancelar' } : undefined,
        });
        if (metodo === 'GET') {
          assert.equal(r.estado, 303, `${metodo} ${patron} ${cookie}`);
          assert.equal(r.ubicacion, '/acceso');
        } else {
          assert.equal(r.estado, 401, `${metodo} ${patron} ${cookie}`);
        }
        assert.doesNotMatch(r.texto, DATOS_DE_AGENDA, `${metodo} ${patron}`);
      }
    }
  }
  assert.equal(volcadoCitas(), antes);
});

test('002/FR-005 la sesión de recepción de eleva-demo no abre la página de ningún paciente ni su cancelación', async () => {
  const recepcion = s.recepcion();
  const token = recepcion.split('=')[1];
  const cita = reservadasFuturas()[0];
  const antes = volcadoCitas();
  for (const cookie of [recepcion, `sesion_paciente=${token}`]) {
    for (const [metodo, ruta] of [['GET', '/portal'], ['GET', `/portal/citas/${cita.id}/cancelar`], ['POST', `/portal/citas/${cita.id}/cancelar`]]) {
      const r = await peticion(s.servidor, { metodo, ruta, cookie, formulario: metodo === 'POST' ? {} : undefined });
      assert.equal(r.estado, 401, `${metodo} ${ruta} ${cookie}`);
      assert.match(textoVisible(r.texto), /Tu sesión ha terminado/);
    }
  }
  assert.equal(volcadoCitas(), antes);
});

test('002/FR-026 las únicas rutas sin clave son la de acceso, la del enlace y las del portal, y estas son de paciente', () => {
  const publicas = s.servidor.rutasRegistradas.filter((r) => r.publica).map((r) => `${r.metodo} ${r.patron}`);
  // `/cancelar` es la pantalla del enlace de cancelación que pone la 003 (contracts/modelo-acceso.md).
  assert.deepEqual(publicas.sort(), [
    'GET /acceso', 'GET /cancelar', 'GET /e/:token', 'GET /portal', 'GET /portal/citas/:id/cancelar',
    'POST /acceso', 'POST /cancelar', 'POST /portal/citas/:id/cancelar', 'POST /portal/salir',
  ]);
  for (const ruta of s.servidor.rutasRegistradas.filter((r) => r.patron.startsWith('/portal'))) {
    assert.equal(ruta.paciente, true, ruta.patron);
  }
  const alcances = Object.fromEntries(s.servidor.rutasRegistradas.filter((r) => r.paciente).map((r) => [`${r.metodo} ${r.patron}`, r.alcance]));
  assert.deepEqual(alcances, {
    'GET /cancelar': 'cita',
    'POST /cancelar': 'cita',
    'GET /portal': 'ficha',
    'GET /portal/citas/:id/cancelar': 'ficha',
    'POST /portal/citas/:id/cancelar': 'ficha',
    'POST /portal/salir': 'cualquiera',
  });
});

test('002/CL Teléfono compartido por varias fichas: cada ficha tiene su enlace y solo ve sus citas', async () => {
  const david = fichaPorNombre(s.bd, 'David Gil');
  const otraId = crearPaciente(s.bd, { clinicaId: s.clinica.id, nombre: 'Lola Gil', telefono: david.telefono, email: null });
  const lucia = s.bd.prepare("SELECT * FROM profesional WHERE nombre = 'Lucía'").get();
  const consulta = s.bd.prepare("SELECT * FROM servicio WHERE nombre = 'Consulta de nutrición'").get();
  insertarCita(s.bd, {
    clinicaId: s.clinica.id, profesionalId: lucia.id, servicioId: consulta.id, pacienteId: otraId, inicio: '2026-11-13T19:30', fin: '2026-11-13T20:00',
  });
  const lola = s.bd.prepare('SELECT * FROM paciente WHERE id = ?').get(otraId);
  assert.notEqual(lola.enlace, david.enlace);

  const paginaDavid = textoVisible((await peticion(s.servidor, { ruta: '/portal', cookie: await entrarComoPaciente(s.servidor, david.enlace) })).texto);
  const paginaLola = textoVisible((await peticion(s.servidor, { ruta: '/portal', cookie: await entrarComoPaciente(s.servidor, lola.enlace) })).texto);
  assert.match(paginaDavid, /David Gil/);
  assert.match(paginaDavid, /lun 09\/11\/2026, 18:00–18:45/);
  assert.doesNotMatch(paginaDavid, /Lola Gil|vie 13\/11\/2026/);
  assert.match(paginaLola, /Lola Gil/);
  assert.match(paginaLola, /vie 13\/11\/2026, 19:30–20:00/);
  assert.doesNotMatch(paginaLola, /David Gil|09\/11\/2026/);
});

test('002/CL Regenerar la semilla cierra las sesiones de paciente abiertas', async () => {
  const cookie = await entrarComoPaciente(s.servidor, fichaPorNombre(s.bd, 'David Gil').enlace);
  assert.equal((await peticion(s.servidor, { ruta: '/portal', cookie })).estado, 200);
  cargar(s.bd, s.datos);
  assert.equal((await peticion(s.servidor, { ruta: '/portal', cookie })).estado, 401);
});

test('002/CL Correo de recordatorio reenviado: su enlace no abre la página personal ni otra cita', async () => {
  const david = fichaPorNombre(s.bd, 'David Gil');
  const suya = citaDe(s.bd, david.id, '2026-11-09T18:00');
  const otra = citaDe(s.bd, david.id, '2026-11-09T19:00');
  const r = await peticion(s.servidor, { ruta: `/e/${enlaceCancelacionDePrueba(s.bd, suya.id)}` });
  const cookie = r.cookies[0].split(';')[0];
  const antes = volcadoCitas();
  for (const [metodo, ruta] of [
    ['GET', '/portal'], ['GET', `/portal/citas/${otra.id}/cancelar`], ['POST', `/portal/citas/${otra.id}/cancelar`],
    ['GET', `/portal/citas/${suya.id}/cancelar`], ['POST', `/portal/citas/${suya.id}/cancelar`],
  ]) {
    const respuesta = await peticion(s.servidor, { metodo, ruta, cookie, formulario: metodo === 'POST' ? {} : undefined });
    assert.equal(respuesta.estado, 401, `${metodo} ${ruta}`);
    assert.doesNotMatch(respuesta.texto, /David Gil|Historial/);
  }
  assert.equal(volcadoCitas(), antes);
});

test('002/SC-004 RP1 ninguno de los 40 pacientes alcanza citas ajenas con su enlace personal ni con uno de cancelación', async () => {
  const fichas = s.bd.prepare('SELECT * FROM paciente WHERE clinica_id = ? ORDER BY id').all(s.clinica.id);
  assert.equal(fichas.length, 40);
  const futuras = reservadasFuturas();
  const nombres = new Map(fichas.map((f) => [f.id, f.nombre]));
  const antes = volcadoCitas();
  let intentos = 0;

  for (const ficha of fichas) {
    const ajena = futuras.find((c) => c.paciente_id !== ficha.id);
    const personal = await entrarComoPaciente(s.servidor, ficha.enlace);
    for (const metodo of ['GET', 'POST']) {
      const r = await peticion(s.servidor, {
        metodo, ruta: `/portal/citas/${ajena.id}/cancelar`, cookie: personal, formulario: metodo === 'POST' ? {} : undefined,
      });
      assert.equal(r.estado, 404, `${ficha.nombre} ${metodo}`);
      assert.equal(r.texto.includes(nombres.get(ajena.paciente_id)), false, `${ficha.nombre} ve a ${nombres.get(ajena.paciente_id)}`);
      intentos += 1;
    }

    const suya = futuras.find((c) => c.paciente_id === ficha.id)
      ?? s.bd.prepare('SELECT * FROM cita WHERE paciente_id = ? ORDER BY inicio DESC').get(ficha.id);
    const sesionCita = `sesion_paciente=${sesionPacienteDePrueba(s.bd, ficha.id, { citaId: suya.id })}`;
    for (const [metodo, ruta] of [['GET', '/portal'], ['GET', `/portal/citas/${ajena.id}/cancelar`], ['POST', `/portal/citas/${ajena.id}/cancelar`]]) {
      const r = await peticion(s.servidor, { metodo, ruta, cookie: sesionCita, formulario: metodo === 'POST' ? {} : undefined });
      assert.equal(r.estado, 401, `${ficha.nombre} con enlace de cancelación ${metodo} ${ruta}`);
      assert.equal(r.texto.includes(nombres.get(ajena.paciente_id)), false);
      intentos += 1;
    }
  }
  assert.equal(intentos, 40 * 5);
  assert.equal(volcadoCitas(), antes);
});
