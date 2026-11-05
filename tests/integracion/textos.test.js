import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { crearServidor } from '../../src/web/servidor.js';

const DIA = '2026-11-11';
const PROHIBIDO = /no_asistida|\breservada\b|\bcompletada\b(?! y)|SOLAPE|SQLITE|ESPECIALIDAD|INMUTABLE|undefined|null|NaN|\[object|Error:|\bat .*\.js/;
let e;
let servidor;
let cookie;
let ids;

before(async () => {
  e = crearEscenario();
  servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo(`${DIA}T12:00:00+01:00`) }));
  cookie = sesionDePrueba(e.bd, e.a.id);
  const base = { clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0] };
  ids = Object.fromEntries(['reservada', 'completada', 'cancelada', 'no_asistida'].map((estado, i) => [
    estado,
    citaDirecta(e.bd, { ...base, inicio: `${DIA}T1${i}:00`, estado }),
  ]));
  ids.futura = citaDirecta(e.bd, { ...base, inicio: `${DIA}T16:00` });
});
after(async () => {
  await detener(servidor);
  e.cerrar();
});

function comprobar(respuesta, descripcion) {
  const texto = textoVisible(respuesta.texto);
  assert.ok(texto.length > 0, descripcion);
  assert.doesNotMatch(texto, PROHIBIDO, `${descripcion}: ${texto}`);
}

const alta = (extra = {}) => peticion(servidor, {
  metodo: 'POST',
  ruta: '/citas',
  cookie,
  formulario: {
    profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], dia: DIA, hora: '10:00', ...extra,
  },
});

const estado = (id, accion) => peticion(servidor, {
  metodo: 'POST', ruta: `/citas/${id}/estado`, cookie, formulario: { accion },
});

test('FR-027 las pantallas no muestran jerga técnica ni valores internos', async () => {
  const pantallas = {
    acceso: await peticion(servidor, { ruta: '/acceso' }),
    'clave incorrecta': await peticion(servidor, { metodo: 'POST', ruta: '/acceso', formulario: { clave: 'x' } }),
    'sin sesión': await peticion(servidor, { metodo: 'POST', ruta: '/citas', formulario: {} }),
    agenda: await peticion(servidor, { ruta: `/agenda?profesional=${e.a.fisio}&dia=${DIA}`, cookie }),
    'día sin apertura': await peticion(servidor, { ruta: '/agenda?dia=2026-11-14', cookie }),
    alta: await peticion(servidor, { ruta: '/citas/nueva', cookie }),
    confirmación: await peticion(servidor, { ruta: `/citas/${ids.reservada}/confirmar?accion=cancelar`, cookie }),
    'no encontrada': await peticion(servidor, { ruta: '/no-existe', cookie }),
    búsqueda: await peticion(servidor, { ruta: '/pacientes/buscar?q=zzz', cookie }),
  };
  for (const [nombre, respuesta] of Object.entries(pantallas)) comprobar(respuesta, nombre);
});

test('FR-027 los mensajes de rechazo del alta no muestran jerga técnica', async () => {
  const rechazos = {
    solape: await alta(),
    pasado: await alta({ hora: '09:00' }),
    horario: await alta({ dia: '2026-11-14' }),
    'hora no válida': await alta({ hora: '10:07' }),
    'día no válido': await alta({ dia: 'ayer' }),
    'faltan datos': await alta({ servicio: '' }),
    'servicio incompatible': await alta({ profesional: e.a.nutri }),
    'datos del paciente': await alta({ paciente: '', paciente_nombre: 'A', paciente_telefono: '1' }),
    correo: await alta({
      paciente: '', paciente_nombre: 'A', paciente_telefono: '600000000', paciente_email: 'x', hora: '17:00',
    }),
  };
  for (const [nombre, respuesta] of Object.entries(rechazos)) {
    assert.ok([409, 422].includes(respuesta.estado), nombre);
    comprobar(respuesta, nombre);
    assert.match(textoVisible(respuesta.texto), /Elige|Escribe|Revísalo|Las citas empiezan/, nombre);
  }
});

test('FR-027 los mensajes de rechazo de estado no muestran valores internos', async () => {
  const noAsistida = await estado(ids.no_asistida, 'completar');
  assert.ok(textoVisible(noAsistida.texto).includes('Esta cita ya está no asistida y no se puede cambiar.'));
  assert.doesNotMatch(textoVisible(noAsistida.texto), /no_asistida/);
  comprobar(await estado(ids.cancelada, 'completar'), 'estado cancelada');
  comprobar(await estado(ids.futura, 'completar'), 'antes de hora');
});

test('FR-027 las etiquetas de estado se escriben como dice la spec', async () => {
  const texto = textoVisible((await peticion(servidor, { ruta: `/agenda?profesional=${e.a.fisio}&dia=${DIA}`, cookie })).texto);
  for (const etiqueta of ['Reservada', 'Completada', 'Cancelada', 'No asistida']) {
    assert.ok(texto.includes(etiqueta), etiqueta);
  }
});

test('FR-027 las páginas declaran el idioma español de España', async () => {
  for (const ruta of ['/agenda', '/citas/nueva', '/no-existe']) {
    assert.match((await peticion(servidor, { ruta, cookie })).texto, /<html lang="es-ES">/);
  }
});
