import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { crearServidor } from '../../src/web/servidor.js';

const HOY = '2026-11-11'; // miércoles
const RELOJ = `${HOY}T12:00:00+01:00`;
let e;
let servidores;
let cookie;

async function arrancar(reloj = RELOJ) {
  const servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo(reloj) }));
  servidores.push(servidor);
  return servidor;
}

beforeEach(() => {
  e = crearEscenario();
  servidores = [];
  cookie = sesionDePrueba(e.bd, e.a.id);
});
afterEach(async () => {
  await Promise.all(servidores.map(detener));
  e.cerrar();
});

const citaDe = (inicio, estado, extra = {}) => citaDirecta(e.bd, {
  clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio, estado, ...extra,
});

async function agenda(consulta = '', reloj) {
  return peticion(await arrancar(reloj), { ruta: `/agenda${consulta}`, cookie });
}

test('FR-014 GET / redirige a /agenda', async () => {
  const r = await peticion(await arrancar(), { ruta: '/', cookie });
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, '/agenda');
});

test('H2-E1 FR-014 al abrir, la agenda muestra el día de hoy y al primer profesional', async () => {
  const r = await agenda();
  assert.equal(r.estado, 200);
  const texto = textoVisible(r.texto);
  assert.match(texto, /Miércoles 11\/11\/2026/);
  assert.match(texto, /Agenda de María/);
});

test('H2-E1 hoy se decide con la hora local de la clínica', async () => {
  const reloj = '2026-11-11T23:30:00Z';
  assert.match(textoVisible((await agenda('', reloj)).texto), /Jueves 12\/11\/2026/);
  const canarias = sesionDePrueba(e.bd, e.b.id);
  const r = await peticion(await arrancar(reloj), { ruta: '/agenda', cookie: canarias });
  assert.match(textoVisible(r.texto), /Miércoles 11\/11\/2026/);
});

test('H2-E1 se puede cambiar de profesional y de día', async () => {
  citaDe('2026-11-12T10:00', 'reservada', { profesional: e.a.nutri, servicio: e.a.consulta });
  const r = await agenda(`?profesional=${e.a.nutri}&dia=2026-11-12`);
  const texto = textoVisible(r.texto);
  assert.match(texto, /Agenda de Lucía/);
  assert.match(texto, /Jueves 12\/11\/2026/);
  assert.match(texto, /Consulta de nutrición/);
  assert.match(r.texto, new RegExp(`href="/agenda\\?profesional=${e.a.fisio}&amp;dia=2026-11-12"`));
  assert.match(r.texto, new RegExp(`href="/agenda\\?profesional=${e.a.nutri}&amp;dia=2026-11-11"`));
  assert.match(r.texto, new RegExp(`href="/agenda\\?profesional=${e.a.nutri}&amp;dia=2026-11-13"`));
});

test('FR-014 se puede ver un día pasado y un día futuro', async () => {
  citaDe('2026-10-14T10:00', 'completada');
  citaDe('2027-02-10T10:00', 'reservada');
  assert.match(textoVisible((await agenda('?dia=2026-10-14')).texto), /Ana Núñez/);
  assert.match(textoVisible((await agenda('?dia=2027-02-10')).texto), /Ana Núñez/);
});

test('H2-E2 FR-015 cada cita indica inicio, fin, paciente, servicio y estado', async () => {
  citaDe(`${HOY}T15:00`, 'reservada');
  const texto = textoVisible((await agenda()).texto);
  assert.match(texto, /15:00 a 15:45/);
  assert.match(texto, /Ana Núñez/);
  assert.match(texto, /Sesión de fisioterapia/);
  assert.match(texto, /Reservada/);
});

test('H2-E2 FR-015 los huecos libres indican inicio y fin', async () => {
  citaDe(`${HOY}T15:00`, 'reservada');
  const texto = textoVisible((await agenda()).texto);
  assert.match(texto, /Libre 12:00 a 15:00/);
  assert.match(texto, /Libre 15:45 a 20:00/);
});

test('FR-015 citas y huecos aparecen en orden horario', async () => {
  citaDe(`${HOY}T16:00`, 'reservada');
  citaDe(`${HOY}T13:00`, 'reservada');
  const texto = textoVisible((await agenda()).texto);
  const orden = ['Libre 12:00 a 13:00', '13:00 a 13:45', 'Libre 13:45 a 16:00', '16:00 a 16:45', 'Libre 16:45 a 20:00']
    .map((trozo) => texto.indexOf(trozo));
  assert.ok(orden.every((posicion) => posicion >= 0), JSON.stringify(orden));
  assert.deepEqual(orden, [...orden].sort((a, b) => a - b));
});

test('H2-E3 FR-017 una cita cancelada o no asistida sigue visible, se distingue y su tramo está libre', async () => {
  citaDe(`${HOY}T15:00`, 'cancelada');
  citaDe(`${HOY}T17:00`, 'no_asistida');
  const r = await agenda();
  const texto = textoVisible(r.texto);
  assert.match(texto, /Cancelada/);
  assert.match(texto, /No asistida/);
  assert.match(texto, /Libre 12:00 a 20:00/);
  assert.equal((r.texto.match(/cita--libera/g) ?? []).length, 2);
});

test('FR-017 el estado siempre se comunica con texto', async () => {
  citaDe(`${HOY}T13:00`, 'reservada');
  citaDe(`${HOY}T14:00`, 'completada');
  citaDe(`${HOY}T15:00`, 'cancelada');
  citaDe(`${HOY}T16:00`, 'no_asistida');
  const texto = textoVisible((await agenda()).texto);
  for (const etiqueta of ['Reservada', 'Completada', 'Cancelada', 'No asistida']) {
    assert.match(texto, new RegExp(etiqueta));
  }
});

test('H2-E4 FR-018 hoy solo se ofrece reservar en el tramo que no ha pasado', async () => {
  const r = await agenda();
  const enlaces = [...r.texto.matchAll(/href="\/citas\/nueva\?profesional=\d+&amp;dia=([\d-]+)&amp;hora=([\d:]+)"/g)];
  assert.deepEqual(enlaces.map((m) => [m[1], m[2]]), [[HOY, '12:00']]);
  assert.match(textoVisible(r.texto), /Libre 09:00 a 12:00 Ya ha pasado/);
});

test('H2-E4 FR-018 un día pasado no ofrece reservar en ningún tramo', async () => {
  const r = await agenda('?dia=2026-11-10');
  assert.doesNotMatch(r.texto, /href="\/citas\/nueva\?profesional/);
});

test('FR-006 un día futuro ofrece reservar en cada hueco con sus datos rellenados', async () => {
  citaDe('2026-11-12T10:00', 'reservada');
  const r = await agenda(`?profesional=${e.a.fisio}&dia=2026-11-12`);
  assert.match(r.texto, new RegExp(`href="/citas/nueva\\?profesional=${e.a.fisio}&amp;dia=2026-11-12&amp;hora=09:00"`));
  assert.match(r.texto, new RegExp(`href="/citas/nueva\\?profesional=${e.a.fisio}&amp;dia=2026-11-12&amp;hora=10:45"`));
});

test('FR-012 un sábado la agenda dice que la clínica no abre', async () => {
  const r = await agenda('?dia=2026-11-14');
  assert.equal(r.estado, 200);
  assert.match(textoVisible(r.texto), /La clínica no abre este día/);
  assert.doesNotMatch(r.texto, /href="\/citas\/nueva\?profesional/);
});

test('FR-023 la agenda indica «Horas en hora peninsular»', async () => {
  assert.match(textoVisible((await agenda()).texto), /Horas en hora peninsular/);
});

test('FR-023 la agenda indica «Horas en hora de Canarias»', async () => {
  const r = await peticion(await arrancar(), { ruta: '/agenda', cookie: sesionDePrueba(e.bd, e.b.id) });
  assert.match(textoVisible(r.texto), /Horas en hora de Canarias/);
});

test('FR-024 las fechas y las horas de la agenda usan el formato español', async () => {
  citaDe(`${HOY}T15:00`, 'reservada');
  const texto = textoVisible((await agenda()).texto);
  assert.match(texto, /11\/11\/2026/);
  assert.doesNotMatch(texto, /2026-11-11/);
  assert.doesNotMatch(texto, /\b(AM|PM)\b/i);
});

test('CL hueco liberado y vuelto a ocupar: la cancelada y la nueva se ven sin confundirse', async () => {
  citaDe(`${HOY}T15:00`, 'cancelada');
  citaDe(`${HOY}T15:00`, 'reservada', { paciente: e.a.pacientes[1] });
  const r = await agenda();
  const texto = textoVisible(r.texto);
  assert.match(texto, /Ana Núñez.*Cancelada/);
  assert.match(texto, /Óscar Peña.*Reservada/);
  assert.equal((r.texto.match(/cita--libera/g) ?? []).length, 1);
  assert.match(texto, /Libre 12:00 a 15:00/);
  assert.match(texto, /Libre 15:45 a 20:00/);
});

test('CL reloj del dispositivo: la agenda no depende del dispositivo y no usa su reloj', async () => {
  const servidor = await arrancar();
  const uno = await peticion(servidor, { ruta: '/agenda', cookie: `${cookie}; zona=America/New_York` });
  const otro = await peticion(servidor, { ruta: '/agenda', cookie });
  assert.equal(uno.texto, otro.texto);
  const carpeta = new URL('../../src/web/estaticos/', import.meta.url);
  for (const archivo of readdirSync(carpeta).filter((nombre) => nombre.endsWith('.js'))) {
    assert.doesNotMatch(readFileSync(new URL(archivo, carpeta), 'utf8'), /new Date\(|Date\.now/);
  }
});

test('FR-004 un profesional de otra clínica responde 404', async () => {
  assert.equal((await agenda(`?profesional=${e.b.fisio}`)).estado, 404);
});

test('FR-014 un día que no existe responde 404 con ayuda, sin fallar', async () => {
  const r = await agenda('?dia=2026-02-31');
  assert.equal(r.estado, 404);
  assert.match(r.texto, /Volver a la agenda/);
});

test('FR-027 el nombre del paciente se escapa en la agenda', async () => {
  const nombre = '<img src=x onerror=alert(1)>';
  const { lastInsertRowid } = e.bd.prepare('INSERT INTO paciente (clinica_id, nombre, telefono) VALUES (?, ?, ?)')
    .run(e.a.id, nombre, '600000009');
  citaDe(`${HOY}T15:00`, 'reservada', { paciente: Number(lastInsertRowid) });
  const r = await agenda();
  assert.doesNotMatch(r.texto, /<img/);
  assert.match(r.texto, /&lt;img/);
});

test('FR-024 ir a otro día se escribe como dd/mm/aaaa, sin depender del idioma del navegador', async () => {
  const r = await agenda('?dia=12/11/2026');
  assert.equal(r.estado, 200);
  assert.ok(textoVisible(r.texto).includes('12/11/2026'));
  assert.doesNotMatch(r.texto, /type="date"/);
  assert.ok(r.texto.includes('<input type="text" name="dia" value="12/11/2026"'));
});

test('FR-024 FR-027 un día mal escrito en la agenda explica el formato', async () => {
  const r = await agenda('?dia=31/02/2026');
  assert.equal(r.estado, 404);
  assert.ok(textoVisible(r.texto).includes('Escribe la fecha como dd/mm/aaaa'));
});

test('FR-006 un hueco donde no cabe ningún servicio se ve libre, pero no ofrece reservar', async () => {
  citaDe('2026-11-12T09:30', 'reservada');
  const r = await agenda(`?profesional=${e.a.fisio}&dia=2026-11-12`);
  assert.ok(!r.texto.includes('hora=09:00"'));
  assert.ok(textoVisible(r.texto).includes('Libre 09:00 a 09:30 No cabe ningún servicio'));
});

test('FR-006 un hueco justo del servicio más corto sí ofrece reservar', async () => {
  citaDe('2026-11-12T09:45', 'reservada');
  const r = await agenda(`?profesional=${e.a.fisio}&dia=2026-11-12`);
  assert.ok(r.texto.includes('hora=09:00"'));
});
