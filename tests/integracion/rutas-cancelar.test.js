import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { DIRECCION, ejecutarEnMemoria, ponerCorreo } from '../ayudas/recordatorios.js';
import { tokenInventado } from '../ayudas/portal.js';
import { anularEnlace } from '../../src/datos/pacientes.js';
import { reiniciarIntentos } from '../../src/servicios/acceso-paciente.js';
import { crearCita } from '../../src/servicios/alta-cita.js';
import { aplicarAccion } from '../../src/servicios/cambio-estado.js';
import { cancelarCita } from '../../src/servicios/cancelar.js';
import { paginaEnlaceNoValido } from '../../src/web/plantilla.js';
import { crearServidor } from '../../src/web/servidor.js';

const AHORA = '2026-11-02T08:00';
const MANANA = '2026-11-03';
const UNIFORME = paginaEnlaceNoValido();
const AVISO = 'Si la cancelas, el hueco quedará libre para otra persona. No se puede deshacer.';
let e;
let ana;
let oscar;
const servidores = [];

beforeEach(() => {
  reiniciarIntentos();
  e = crearEscenario();
  [ana, oscar] = e.a.pacientes;
  ponerCorreo(e.bd, ana, 'ana@example.com');
  ponerCorreo(e.bd, oscar, 'oscar@example.com');
  ponerCorreo(e.bd, e.b.pacientes[0], 'bruno@example.com');
});
afterEach(async () => {
  await Promise.all(servidores.splice(0).map(detener));
  e.cerrar();
});

/** Un servidor sobre la misma base con su propio momento fijado (FR-043 de la 001). */
async function servidor(momentoFijado = AHORA) {
  const s = await escuchar(crearServidor({
    bd: e.bd, ahora: () => new Date(), momentoFijado, direccion: DIRECCION,
  }));
  servidores.push(s);
  return s;
}

const cita = (paciente, inicio, extra = {}) => citaDirecta(e.bd, {
  clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente, inicio, ...extra,
});
const fila = (id) => e.bd.prepare('SELECT estado, origen_cancelacion, momento_cancelacion FROM cita WHERE id = ?').get(id);
const reservada = { estado: 'reservada', origen_cancelacion: null, momento_cancelacion: null };

/** Los enlaces de cancelación de los recordatorios de hoy, por cita, como los escribe el proceso. */
function recordatorios(momento = AHORA, clinicas = [e.a, e.b]) {
  const { mensajes } = ejecutarEnMemoria(e.bd, momento, { clinicas });
  return new Map(mensajes.map((m) => [m.citaId, m.texto.match(/\/e\/([0-9a-f]{32})\r\n/)[1]]));
}

/** Abre el enlace del correo y sigue la redirección: devuelve la cookie y la pantalla. */
async function abrir(s, token) {
  const r = await peticion(s, { ruta: `/e/${token}` });
  assert.equal(r.estado, 303, `el enlace no ha entrado: ${r.estado}`);
  assert.equal(r.ubicacion, '/cancelar');
  const cookie = r.cookies[0].split(';')[0];
  return { cookie, pantalla: await peticion(s, { ruta: '/cancelar', cookie }) };
}
const confirmar = (s, cookie) => peticion(s, { metodo: 'POST', ruta: '/cancelar', cookie, formulario: {} });

function esUniforme(r) {
  assert.equal(r.estado, UNIFORME.estado);
  assert.equal(r.texto, UNIFORME.cuerpo);
}

const principal = (html) => html.match(/<main[\s\S]*<\/main>/)[0];
// El texto que se lee: sin el espacio que deja una etiqueta antes de un punto.
const visible = (r) => textoVisible(principal(r.texto)).replace(/\s+([.,])/g, '$1');

test('003/H2-E1 003/FR-011 003/FR-012 003/FR-013 el enlace muestra la cita, el aviso y el botón, sin datos de la ficha, y no cambia nada', async () => {
  const id = cita(ana, `${MANANA}T12:00`);
  cita(ana, '2026-11-10T17:00', { profesional: e.a.nutri, servicio: e.a.consulta });
  const s = await servidor();
  const { pantalla } = await abrir(s, recordatorios().get(id));

  assert.equal(pantalla.estado, 200);
  assert.equal(pantalla.cabeceras.get('referrer-policy'), 'no-referrer');
  const texto = visible(pantalla);
  assert.match(texto, /^Cancelar tu cita /);
  for (const dato of ['Clínica Norte', 'María', 'Sesión de fisioterapia', 'martes 03/11/2026', '12:00', 'Horas en hora peninsular', AVISO]) {
    assert.ok(texto.includes(dato), dato);
  }
  assert.match(principal(pantalla.texto), /<form[^>]*method="post"[^>]*action="\/cancelar"[\s\S]*<button[^>]*>Sí, cancelar la cita<\/button>/);
  for (const prohibido of ['Ana Núñez', '600 000 001', 'ana@example.com', 'Lucía', 'Consulta de nutrición', '10/11/2026', '40,00']) {
    assert.equal(pantalla.texto.includes(prohibido), false, prohibido);
  }
  assert.deepEqual({ ...fila(id) }, reservada);
});

test('003/H2-E2 RR4 003/FR-014 003/FR-016 al confirmar, la cita queda cancelada con origen correo y el momento fijado', async () => {
  const id = cita(ana, `${MANANA}T12:00`);
  const s = await servidor();
  const { cookie } = await abrir(s, recordatorios().get(id));
  const r = await confirmar(s, cookie);

  assert.equal(r.estado, 200);
  assert.equal(visible(r), 'Cita cancelada Tu cita del martes 03/11/2026 a las 12:00 está cancelada, y el hueco ha quedado libre para otra persona. Gracias por avisar. Horas en hora peninsular');
  assert.deepEqual({ ...fila(id) }, { estado: 'cancelada', origen_cancelacion: 'correo', momento_cancelacion: AHORA });
});

test('003/H2-E4 003/CL Doble pulsación al confirmar: reabrir el enlace o volver a confirmar dice que ya está cancelada, sin botones', async () => {
  const id = cita(ana, `${MANANA}T12:00`);
  const token = recordatorios().get(id);
  const s = await servidor();
  const { cookie } = await abrir(s, token);
  assert.equal((await confirmar(s, cookie)).estado, 200);

  const despues = await servidor('2026-11-02T09:30');
  const reabierta = (await abrir(despues, token)).pantalla;
  const otraVez = await confirmar(despues, cookie);
  for (const r of [reabierta, otraVez]) {
    assert.equal(r.estado, 200);
    assert.equal(visible(r), 'Esta cita ya está cancelada No tienes que hacer nada más.');
    assert.doesNotMatch(principal(r.texto), /<form|<button/);
  }
  assert.deepEqual({ ...fila(id) }, { estado: 'cancelada', origen_cancelacion: 'correo', momento_cancelacion: AHORA });
});

test('003/H2-E5 RR6 desde la hora de inicio, el enlace de una cita reservada o cancelada da la respuesta uniforme', async () => {
  const deAna = cita(ana, `${MANANA}T12:00`);
  const deOscar = cita(oscar, `${MANANA}T12:00`, { profesional: e.a.fisio2 });
  const tokens = recordatorios();
  cancelarCita({ bd: e.bd, clinica: e.a, ahora: () => new Date(), momentoFijado: AHORA }, deOscar, 'recepcion');

  for (const momento of [`${MANANA}T12:00`, `${MANANA}T13:00`, '2026-11-10T08:00']) {
    const s = await servidor(momento);
    for (const token of [tokens.get(deAna), tokens.get(deOscar), tokenInventado()]) {
      esUniforme(await peticion(s, { ruta: `/e/${token}` }));
    }
  }
  assert.deepEqual({ ...fila(deAna) }, reservada);
});

test('003/CL Pantalla abierta hasta el inicio: abierta antes y confirmada en el inicio da la respuesta uniforme y no cambia nada', async () => {
  const id = cita(ana, `${MANANA}T12:00`);
  const token = recordatorios().get(id);
  const { cookie } = await abrir(await servidor(`${MANANA}T07:00`), token);
  const enElInicio = await servidor(`${MANANA}T12:00`);
  esUniforme(await peticion(enElInicio, { ruta: '/cancelar', cookie }));
  esUniforme(await confirmar(enElInicio, cookie));
  assert.deepEqual({ ...fila(id) }, reservada);
});

test('003/H2-E6 RR4 a las 08:01 una cita de las 10:00 ya no se cancela por el correo: el límite y el teléfono como enlace', async () => {
  const id = cita(ana, `${MANANA}T10:00`);
  const token = recordatorios().get(id);
  const { pantalla } = await abrir(await servidor(`${MANANA}T08:01`), token);
  assert.equal(pantalla.estado, 200);
  assert.equal(visible(pantalla), 'Ya no se puede cancelar desde aquí Se podía cancelar hasta el martes 03/11/2026 a las 08:00. '
    + 'Si no vas a poder venir, llama a la clínica: 000 300 000. Horas en hora peninsular');
  assert.match(principal(pantalla.texto), /<a[^>]*href="tel:000300000"[^>]*>000 300 000<\/a>/);
  assert.doesNotMatch(principal(pantalla.texto), /<form/);
  assert.deepEqual({ ...fila(id) }, reservada);
});

test('003/H2-E6 sin teléfono de la clínica, el mensaje de fuera de plazo termina en «llama a la clínica.»', async () => {
  const id = citaDirecta(e.bd, {
    clinica: e.b.id, profesional: e.b.fisio, servicio: e.b.sesion, paciente: e.b.pacientes[0], inicio: `${MANANA}T10:00`,
  });
  const token = recordatorios().get(id);
  const { pantalla } = await abrir(await servidor(`${MANANA}T08:01`), token);
  assert.equal(visible(pantalla), 'Ya no se puede cancelar desde aquí Se podía cancelar hasta el martes 03/11/2026 a las 08:00. Si no vas a poder venir, llama a la clínica. Horas en hora de Canarias');
  assert.doesNotMatch(pantalla.texto, /tel:/);
});

test('003/CL Pantalla abierta mientras vence el plazo: abierta a las 07:55 y confirmada a las 08:01 da 409 y no cambia nada', async () => {
  const id = cita(ana, `${MANANA}T10:00`);
  const token = recordatorios().get(id);
  const { cookie, pantalla } = await abrir(await servidor(`${MANANA}T07:55`), token);
  assert.match(visible(pantalla), /^Cancelar tu cita /);
  const r = await confirmar(await servidor(`${MANANA}T08:01`), cookie);
  assert.equal(r.estado, 409);
  assert.equal(visible(r), 'Ya no se puede cancelar desde aquí Se podía cancelar hasta el martes 03/11/2026 a las 08:00. Si no vas a poder venir, llama a la clínica: 000 300 000. Horas en hora peninsular');
  assert.deepEqual({ ...fila(id) }, reservada);
});

test('003/CL Justo en el límite: confirmar a las 08:00 una cita de las 10:00 la cancela', async () => {
  const id = cita(ana, `${MANANA}T10:00`);
  const token = recordatorios().get(id);
  const { cookie } = await abrir(await servidor(`${MANANA}T07:55`), token);
  const r = await confirmar(await servidor(`${MANANA}T08:00`), cookie);
  assert.equal(r.estado, 200);
  assert.match(visible(r), /^Cita cancelada /);
  assert.deepEqual({ ...fila(id) }, { estado: 'cancelada', origen_cancelacion: 'correo', momento_cancelacion: `${MANANA}T08:00` });
});

test('003/H2-E7 RR6 un enlace con un carácter cambiado, o inventado, da la respuesta uniforme sin datos', async () => {
  const id = cita(ana, `${MANANA}T12:00`);
  const token = recordatorios().get(id);
  const s = await servidor();
  const cambiado = `${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`;
  for (const malo of [cambiado, tokenInventado(), token.toUpperCase(), `${token}0`]) {
    const r = await peticion(s, { ruta: `/e/${malo}` });
    esUniforme(r);
    assert.equal(r.cookies.length, 0);
  }
});

test('003/H2-E8 003/FR-015 abrir el enlace y la pantalla varias veces, sin confirmar, no cambia la cita', async () => {
  const id = cita(ana, `${MANANA}T12:00`);
  const token = recordatorios().get(id);
  const s = await servidor();
  for (let i = 0; i < 3; i += 1) {
    const { cookie } = await abrir(s, token);
    assert.equal((await peticion(s, { ruta: '/cancelar', cookie })).estado, 200);
  }
  assert.deepEqual({ ...fila(id) }, reservada);
});

test('003/H2-E10 RR6 tras anular el enlace personal de la ficha, el de cancelación da la respuesta uniforme y la cita sigue reservada', async () => {
  const id = cita(ana, `${MANANA}T12:00`);
  const token = recordatorios().get(id);
  const s = await servidor();
  const { cookie } = await abrir(s, token);
  assert.ok(anularEnlace(e.bd, e.a.id, ana));
  esUniforme(await peticion(s, { ruta: `/e/${token}` }));
  // RP7 también cierra la sesión que ya estaba abierta con él.
  assert.equal((await confirmar(s, cookie)).estado, 401);
  assert.deepEqual({ ...fila(id) }, reservada);
});

test('RR6 un enlace solo da acceso a su cita: ni recepción, ni el portal; y la clave de clínica no abre /cancelar', async () => {
  const id = cita(ana, `${MANANA}T12:00`);
  const s = await servidor();
  const { cookie } = await abrir(s, recordatorios().get(id));
  for (const ruta of ['/agenda', '/citas/nueva', `/citas/${id}/correo`]) {
    const r = await peticion(s, { ruta, cookie });
    assert.equal(r.estado, 303, ruta);
    assert.equal(r.ubicacion, '/acceso', ruta);
  }
  assert.equal((await peticion(s, { metodo: 'POST', ruta: `/citas/${id}/estado`, cookie, formulario: { accion: 'cancelar' } })).estado, 401);
  assert.equal((await peticion(s, { ruta: '/portal', cookie })).estado, 401);
  assert.equal((await peticion(s, { metodo: 'POST', ruta: `/portal/citas/${id}/cancelar`, cookie, formulario: {} })).estado, 401);

  const recepcion = sesionDePrueba(e.bd, e.a.id);
  assert.equal((await peticion(s, { ruta: '/cancelar', cookie: recepcion })).estado, 401);
  assert.equal((await peticion(s, { metodo: 'POST', ruta: '/cancelar', cookie: recepcion, formulario: {} })).estado, 401);
  assert.deepEqual({ ...fila(id) }, reservada);
});

test('003/CL Hueco cancelado y vuelto a ocupar: el enlace antiguo solo actúa sobre su cita, nunca sobre la nueva', async () => {
  const antigua = cita(ana, `${MANANA}T12:00`);
  const token = recordatorios().get(antigua);
  cancelarCita({ bd: e.bd, clinica: e.a, ahora: () => new Date(), momentoFijado: AHORA }, antigua, 'recepcion');
  const nueva = cita(oscar, `${MANANA}T12:00`);
  const s = await servidor('2026-11-02T10:00');
  const { cookie, pantalla } = await abrir(s, token);
  assert.equal(visible(pantalla), 'Esta cita ya está cancelada No tienes que hacer nada más.');
  assert.equal(visible(await confirmar(s, cookie)), 'Esta cita ya está cancelada No tienes que hacer nada más.');
  assert.deepEqual({ ...fila(nueva) }, reservada);
  assert.equal(fila(antigua).origen_cancelacion, 'recepcion');
});

for (const canal of ['recepcion', 'portal']) {
  const caso = canal === 'recepcion' ? 'Paciente y recepción cancelan a la vez' : 'Portal y correo cancelan a la vez';
  test(`003/CL ${caso}: si ${canal} cancela antes, el correo ve «ya está cancelada» y el origen sigue siendo el primero`, async () => {
    const id = cita(ana, `${MANANA}T12:00`);
    const token = recordatorios().get(id);
    const s = await servidor();
    const { cookie } = await abrir(s, token);
    const primero = cancelarCita({ bd: e.bd, clinica: e.a, ahora: () => new Date(), momentoFijado: '2026-11-02T08:30' }, id, canal);
    assert.equal(primero.resultado, 'cancelada_ahora');
    const r = await confirmar(s, cookie);
    assert.equal(r.estado, 200);
    assert.equal(visible(r), 'Esta cita ya está cancelada No tienes que hacer nada más.');
    assert.deepEqual({ ...fila(id) }, { estado: 'cancelada', origen_cancelacion: canal, momento_cancelacion: '2026-11-02T08:30' });
  });
}

test('003/CL Paciente cancela mientras recepción marca otro estado: completada o no asistida, el enlace ya ha caducado; y solo una prospera', async () => {
  const completada = cita(ana, `${MANANA}T12:00`);
  const noAsistida = cita(oscar, `${MANANA}T12:00`, { profesional: e.a.fisio2 });
  const tokens = recordatorios();
  const enElInicio = { bd: e.bd, clinica: e.a, ahora: () => new Date(), momentoFijado: `${MANANA}T12:00` };
  assert.equal(aplicarAccion(enElInicio, completada, 'completar').ok, true);
  assert.equal(aplicarAccion(enElInicio, noAsistida, 'no-asistio').ok, true);
  const s = await servidor(`${MANANA}T12:00`);
  esUniforme(await peticion(s, { ruta: `/e/${tokens.get(completada)}` }));
  esUniforme(await peticion(s, { ruta: `/e/${tokens.get(noAsistida)}` }));

  // RN4 de la 001: sobre la misma cita, la operación de cancelar y la de recepción no prosperan las dos.
  const otra = cita(ana, '2026-11-04T12:00');
  const r = cancelarCita({ ...enElInicio, momentoFijado: '2026-11-04T12:00' }, otra, 'correo');
  assert.equal(r.resultado, 'fuera_de_plazo');
  assert.equal(aplicarAccion({ ...enElInicio, momentoFijado: '2026-11-04T12:00' }, otra, 'completar').ok, true);
  assert.equal(cancelarCita({ ...enElInicio, momentoFijado: '2026-11-04T12:00' }, otra, 'correo').resultado, 'no_cancelable');
  assert.equal(fila(completada).estado, 'completada');
  assert.equal(fila(noAsistida).estado, 'no_asistida');
  assert.equal(fila(otra).estado, 'completada');
});

test('003/H2-E3 003/SC-006 tras cancelar desde el correo, la siguiente carga de la agenda muestra la cita cancelada y el tramo libre, y se puede reservar', async () => {
  const id = cita(ana, `${MANANA}T12:00`);
  const s = await servidor();
  const recepcion = sesionDePrueba(e.bd, e.a.id);
  const agenda = async () => textoVisible((await peticion(s, { ruta: `/agenda?profesional=${e.a.fisio}&dia=${MANANA}`, cookie: recepcion })).texto);
  assert.match(await agenda(), /12:00 a 12:45 Ana Núñez Sesión de fisioterapia Reservada/);

  const { cookie } = await abrir(s, recordatorios().get(id));
  assert.equal((await confirmar(s, cookie)).estado, 200);

  const texto = await agenda();
  assert.match(texto, /12:00 a 12:45 Ana Núñez Sesión de fisioterapia Cancelada por el paciente el 02\/11\/2026 a las 08:00/);
  assert.match(texto, /Libre 09:00 a 20:00/);
  const alta = crearCita({ bd: e.bd, clinica: e.a, ahora: () => new Date(), momentoFijado: AHORA }, {
    profesional: e.a.fisio, servicio: e.a.sesion, paciente: oscar, dia: MANANA, hora: '12:00',
  });
  assert.equal(alta.ok, true, JSON.stringify(alta));
});
