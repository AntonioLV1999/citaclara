import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { hashClave } from '../../src/servicios/acceso.js';
import { peticion, textoVisible } from '../ayudas/escenario.js';
import { citaDe, DIRECCION, escenarioSemilla, fichaPorNombre } from '../ayudas/portal.js';

let s;
let recepcion;

beforeEach(async () => {
  s = await escenarioSemilla();
  recepcion = s.recepcion();
});
afterEach(() => s.cerrar());

const pedir = (ruta, opciones = {}) => peticion(s.servidor, { ruta, cookie: recepcion, ...opciones });
const volcado = () => JSON.stringify(['cita', 'paciente'].map((t) => s.bd.prepare(`SELECT * FROM ${t} ORDER BY id`).all()));
const valorDelCampo = (html) => html.match(/<input[^>]*readonly[^>]*value="([^"]*)"|<input[^>]*value="([^"]*)"[^>]*readonly/)?.slice(1).find(Boolean);

test('002/H1-E1 desde una cita de Isabel Navarro, que no tiene correo, recepción copia su enlace sin ningún alta', async () => {
  const isabel = fichaPorNombre(s.bd, 'Isabel Navarro');
  assert.equal(isabel.email, null);
  const cita = citaDe(s.bd, isabel.id, '2026-11-05T09:15');

  const agenda = await pedir(`/agenda?profesional=${cita.profesional_id}&dia=2026-11-05`);
  const enlaces = [...agenda.texto.matchAll(/href="\/citas\/(\d+)\/enlace">Enlace del paciente</g)].map((m) => Number(m[1]));
  const citasDelDia = s.bd.prepare("SELECT id FROM cita WHERE profesional_id = ? AND inicio LIKE '2026-11-05%'").all(cita.profesional_id);
  assert.deepEqual(enlaces.sort(), citasDelDia.map((c) => c.id).sort());
  assert.ok(enlaces.includes(cita.id));

  const antes = volcado();
  const r = await pedir(`/citas/${cita.id}/enlace`);
  assert.equal(r.estado, 200);
  const texto = textoVisible(r.texto);
  assert.match(texto, /Enlace de Isabel Navarro/);
  assert.equal(valorDelCampo(r.texto), `${DIRECCION}/e/${isabel.enlace}`);
  assert.match(r.texto, /<script src="\/estaticos\/copiar\.js"/);
  assert.match(texto, /Copiar enlace/);
  assert.match(texto, /Dáselo al paciente por el medio que uses con él\. CitaClara no lo envía\./);
  assert.match(texto, /Anular este enlace/);
  assert.equal(volcado(), antes);
});

test('002/FR-002 anular el enlace pide confirmación, y al confirmar da uno nuevo sin enviar nada ni cambiar citas', async () => {
  const david = fichaPorNombre(s.bd, 'David Gil');
  const cita = citaDe(s.bd, david.id, '2026-11-09T18:00');
  const citas = JSON.stringify(s.bd.prepare('SELECT * FROM cita ORDER BY id').all());

  const confirmacion = await pedir(`/citas/${cita.id}/enlace/anular`);
  assert.equal(confirmacion.estado, 200);
  const texto = textoVisible(confirmacion.texto);
  assert.match(texto, /¿Anular el enlace de David Gil\?/);
  assert.match(texto, /El enlace actual y los de cancelación de los recordatorios ya enviados dejarán de funcionar\. Las citas no cambian\. Después tendrás que darle el nuevo enlace\./);
  assert.match(texto, /Sí, anular y crear uno nuevo/);
  assert.match(texto, /No, volver/);
  assert.equal(fichaPorNombre(s.bd, 'David Gil').enlace, david.enlace);

  const anulada = await pedir(`/citas/${cita.id}/enlace/anular`, { metodo: 'POST', formulario: {} });
  assert.equal(anulada.estado, 303);
  assert.equal(anulada.ubicacion, `/citas/${cita.id}/enlace?nuevo=1`);
  const nuevo = fichaPorNombre(s.bd, 'David Gil').enlace;
  assert.match(nuevo, /^[0-9a-f]{32}$/);
  assert.notEqual(nuevo, david.enlace);

  const pagina = await pedir(anulada.ubicacion);
  assert.match(textoVisible(pagina.texto), /El enlace anterior ya no funciona\. Este es el nuevo\./);
  assert.equal(valorDelCampo(pagina.texto), `${DIRECCION}/e/${nuevo}`);
  assert.equal(JSON.stringify(s.bd.prepare('SELECT * FROM cita ORDER BY id').all()), citas);
});

test('002/FR-002 el enlace de una cita de otra clínica no se ve ni se anula, y sin sesión de recepción no se llega', async () => {
  const id = (sql, ...valores) => Number(s.bd.prepare(sql).run(...valores).lastInsertRowid);
  const clinica = id("INSERT INTO clinica (nombre, clave_hash, clave_sal, zona_horaria) VALUES ('Clínica Sur', ?, 'sal', 'Atlantic/Canary')", hashClave('x', 'sal'));
  const profesional = id("INSERT INTO profesional (clinica_id, nombre, especialidad) VALUES (?, 'Pablo', 'Nutrición')", clinica);
  const servicio = id("INSERT INTO servicio (clinica_id, nombre, especialidad, duracion_min, precio_centimos) VALUES (?, 'Consulta', 'Nutrición', 30, 3000)", clinica);
  const paciente = id("INSERT INTO paciente (clinica_id, nombre, telefono) VALUES (?, 'Bruno Sanz', '600 000 101')", clinica);
  const ajena = id("INSERT INTO cita (clinica_id, profesional_id, servicio_id, paciente_id, inicio, fin) VALUES (?, ?, ?, ?, '2026-11-10T10:00', '2026-11-10T10:30')", clinica, profesional, servicio, paciente);
  const antes = volcado();

  for (const [metodo, ruta] of [['GET', `/citas/${ajena}/enlace`], ['GET', `/citas/${ajena}/enlace/anular`], ['POST', `/citas/${ajena}/enlace/anular`]]) {
    const r = await pedir(ruta, { metodo, formulario: metodo === 'POST' ? {} : undefined });
    assert.equal(r.estado, 404, `${metodo} ${ruta}`);
    assert.doesNotMatch(r.texto, /Bruno Sanz/);
  }
  const propia = citaDe(s.bd, fichaPorNombre(s.bd, 'David Gil').id, '2026-11-09T18:00').id;
  for (const [metodo, ruta] of [['GET', `/citas/${propia}/enlace`], ['GET', `/citas/${propia}/enlace/anular`], ['POST', `/citas/${propia}/enlace/anular`]]) {
    const r = await peticion(s.servidor, { metodo, ruta, formulario: metodo === 'POST' ? {} : undefined });
    if (metodo === 'GET') assert.equal(r.ubicacion, '/acceso', ruta);
    else assert.equal(r.estado, 401, ruta);
    assert.doesNotMatch(r.texto, /David Gil/);
  }
  assert.equal(volcado(), antes);
});

test('002/SC-001 los 40 pacientes de la semilla y las fichas nuevas del alta tienen enlace, sin ningún alta', async () => {
  const enlaces = s.bd.prepare('SELECT enlace FROM paciente WHERE clinica_id = ?').all(s.clinica.id).map((p) => p.enlace);
  assert.equal(enlaces.length, 40);
  for (const enlace of enlaces) assert.match(enlace, /^[0-9a-f]{32}$/);
  assert.equal(new Set(enlaces).size, 40);

  const maria = s.bd.prepare("SELECT id FROM profesional WHERE nombre = 'María'").get().id;
  const sesion = s.bd.prepare("SELECT id FROM servicio WHERE nombre = 'Sesión de fisioterapia'").get().id;
  const alta = await pedir('/citas', {
    metodo: 'POST',
    formulario: {
      profesional: maria, servicio: sesion, dia: '13/11/2026', hora: '19:00', paciente_nombre: 'Paciente Nueva', paciente_telefono: '600 123 456',
    },
  });
  assert.equal(alta.estado, 303, alta.texto);
  const nueva = fichaPorNombre(s.bd, 'Paciente Nueva');
  assert.match(nueva.enlace, /^[0-9a-f]{32}$/);
  assert.equal(enlaces.includes(nueva.enlace), false);
});
