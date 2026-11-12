import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { DIRECCION, ejecutarEnMemoria, ponerCorreo, tokenDe } from '../ayudas/recordatorios.js';
import { reiniciarIntentos } from '../../src/servicios/acceso-paciente.js';
import { cancelarCita } from '../../src/servicios/cancelar.js';
import { crearServidor } from '../../src/web/servidor.js';

const AHORA = '2026-11-02T08:00';
const MANANA = '2026-11-03';
let e;
let servidor;
let recepcion;

beforeEach(async () => {
  reiniciarIntentos();
  e = crearEscenario();
  e.a.pacientes.forEach((id, i) => ponerCorreo(e.bd, id, `paciente${i}@example.com`));
  servidor = await escuchar(crearServidor({
    bd: e.bd, ahora: () => new Date(), momentoFijado: AHORA, direccion: DIRECCION,
  }));
  recepcion = sesionDePrueba(e.bd, e.a.id);
});
afterEach(async () => {
  await detener(servidor);
  e.cerrar();
});

const cita = (paciente, hora, profesional = e.a.fisio) => citaDirecta(e.bd, {
  clinica: e.a.id, profesional, servicio: e.a.sesion, paciente, inicio: `${MANANA}T${hora}`,
});

/** Cancela por la pantalla del correo, como el paciente: abrir el enlace y confirmar. */
async function cancelarDesdeElCorreo(token) {
  const entrada = await peticion(servidor, { ruta: `/e/${token}` });
  const cookie = entrada.cookies[0].split(';')[0];
  const r = await peticion(servidor, { metodo: 'POST', ruta: '/cancelar', cookie, formulario: {} });
  assert.equal(r.estado, 200);
}

async function agenda(profesional = e.a.fisio) {
  const r = await peticion(servidor, { ruta: `/agenda?profesional=${profesional}&dia=${MANANA}`, cookie: recepcion });
  assert.equal(r.estado, 200);
  return r.texto;
}
const filas = (html) => [...html.matchAll(/<li class="(cita[^"]*)">([\s\S]*?)<\/li>/g)].map((m) => textoVisible(m[2]));

test('003/H4-E1 003/FR-016 la cita cancelada desde el correo se ve como «Cancelada por el paciente», igual que la del portal', async () => {
  const [ana, oscar] = e.a.pacientes;
  const porCorreo = cita(ana, '10:00');
  const porPortal = cita(oscar, '12:00');
  const { mensajes } = ejecutarEnMemoria(e.bd, AHORA, { clinicas: [e.a] });
  await cancelarDesdeElCorreo(tokenDe(mensajes.find((m) => m.citaId === porCorreo)));
  cancelarCita({ bd: e.bd, clinica: e.a, ahora: () => new Date(), momentoFijado: AHORA }, porPortal, 'portal');

  const [deAna, deOscar] = filas(await agenda());
  assert.ok(deAna.startsWith('10:00 a 10:45 Ana Núñez Sesión de fisioterapia Cancelada por el paciente el 02/11/2026 a las 08:00 '), deAna);
  assert.ok(deOscar.startsWith('12:00 a 12:45 Óscar Peña Sesión de fisioterapia Cancelada por el paciente el 02/11/2026 a las 08:00 '), deOscar);
});

test('003/H4-E2 la cita cancelada por recepción se ve como «Cancelada», sin fecha ni hora', async () => {
  const id = cita(e.a.pacientes[0], '10:00');
  cancelarCita({ bd: e.bd, clinica: e.a, ahora: () => new Date(), momentoFijado: AHORA }, id, 'recepcion');
  const [fila] = filas(await agenda());
  assert.ok(fila.startsWith('10:00 a 10:45 Ana Núñez Sesión de fisioterapia Cancelada '), fila);
  assert.doesNotMatch(fila, /por el paciente|02\/11\/2026/);
});

test('003/H4-E1 002/FR-019 el tramo cancelado desde el correo entra en la lista de huecos liberados por pacientes', async () => {
  const id = cita(e.a.pacientes[0], '10:00', e.a.fisio2);
  const { mensajes } = ejecutarEnMemoria(e.bd, AHORA, { clinicas: [e.a] });
  const lista = (html) => textoVisible(html.match(/<section[^>]*class="huecos-liberados"[\s\S]*?<\/section>/)?.[0] ?? '');
  assert.equal(lista(await agenda()), 'Huecos liberados por pacientes Ningún paciente ha liberado huecos próximos.');
  await cancelarDesdeElCorreo(tokenDe(mensajes.find((m) => m.citaId === id)));
  assert.match(lista(await agenda()), /^Huecos liberados por pacientes .*mar 03\/11\/2026, 10:00–10:45, Jorge/);
});
