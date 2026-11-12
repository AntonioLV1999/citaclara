import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { clinicaDeSesion } from '../servicios/acceso.js';
import { COOKIE_PACIENTE, sesionDePaciente } from '../servicios/acceso-paciente.js';
import {
  paginaDemasiadoGrande, paginaFallo, paginaNoEncontrada, paginaSesionTerminada, paginaSinSesion, redireccion,
} from './plantilla.js';
import { rutasAcceso } from './rutas/acceso.js';
import { rutasAgenda } from './rutas/agenda.js';
import { rutasCitas } from './rutas/citas.js';
import { rutasCorreo } from './rutas/correo.js';
import { rutasEnlace } from './rutas/enlace.js';
import { rutasEnlaceFicha } from './rutas/enlace-ficha.js';
import { rutasEstado } from './rutas/estado.js';
import { rutasPacientes } from './rutas/pacientes.js';
import { rutasPortal } from './rutas/portal.js';

const CARPETA_ESTATICOS = new URL('./estaticos/', import.meta.url);
const TIPOS_ESTATICOS = { css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8' };
// Un nombre simple no puede salir de la carpeta: ni barras, ni puntos dobles, ni escapes.
const ESTATICO = /^\/estaticos\/([a-z0-9-]+)\.(css|js)$/;
const TAMANO_MAXIMO_FORMULARIO = 64 * 1024;
const DIRECCION_POR_DEFECTO = 'http://localhost:3000';

class FormularioDemasiadoGrande extends Error {}

/** Una ruta de paciente (002) no pasa por el filtro de recepción: es pública para él (FR-026). */
function compilarRuta(ruta) {
  const expresion = ruta.patron.replace(/:([a-z]+)/g, '(?<$1>[^/]+)');
  const paciente = ruta.paciente === true;
  return {
    ...ruta, paciente, alcance: ruta.alcance ?? null, publica: ruta.publica === true || paciente, expresion: new RegExp(`^${expresion}$`),
  };
}

function buscarRuta(rutas, metodo, camino) {
  for (const ruta of rutas) {
    const coincidencia = ruta.metodo === metodo && camino.match(ruta.expresion);
    if (coincidencia) return { ruta, parametros: { ...coincidencia.groups } };
  }
  return null;
}

function leerCookie(req, nombre) {
  for (const parte of (req.headers.cookie ?? '').split(';')) {
    const [clave, valor] = parte.trim().split('=');
    if (clave === nombre) return valor;
  }
  return undefined;
}

async function leerFormulario(req) {
  let texto = '';
  let demasiado = false;
  req.setEncoding('utf8');
  // Se lee hasta el final sin guardar el exceso: cortar aquí cerraría la conexión sin respuesta.
  for await (const trozo of req) {
    demasiado ||= texto.length + trozo.length > TAMANO_MAXIMO_FORMULARIO;
    if (!demasiado) texto += trozo;
  }
  if (demasiado) throw new FormularioDemasiadoGrande();
  return Object.fromEntries(new URLSearchParams(texto));
}

function enviar(res, { estado, cuerpo = '', ubicacion, cookie }, { sinReferente = false } = {}) {
  const cabeceras = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };
  // 002/FR-025: el portal y el enlace no dejan salir su dirección en el referente.
  if (sinReferente) cabeceras['referrer-policy'] = 'no-referrer';
  if (ubicacion) cabeceras.location = ubicacion;
  if (cookie) cabeceras['set-cookie'] = cookie;
  res.writeHead(estado, cabeceras);
  res.end(cuerpo);
}

async function servirEstatico(camino, res, clinica, momentoFijado) {
  const [, nombre, extension] = camino.match(ESTATICO) ?? [];
  if (!nombre) return enviar(res, paginaNoEncontrada(clinica, momentoFijado));
  try {
    const cuerpo = await readFile(new URL(`${nombre}.${extension}`, CARPETA_ESTATICOS));
    return res.writeHead(200, { 'content-type': TIPOS_ESTATICOS[extension] }).end(cuerpo);
  } catch (error) {
    if (error.code === 'ENOENT') return enviar(res, paginaNoEncontrada(clinica, momentoFijado));
    throw error;
  }
}

/**
 * 002/FR-005: una ruta de paciente solo lee la cookie del paciente y su sesión, con el alcance que
 * declara. Sin sesión válida responde igual siempre, y nunca usa la sesión de recepción.
 */
async function atenderPaciente(base, ruta, req, res) {
  const opciones = { sinReferente: true };
  const token = leerCookie(req, COOKIE_PACIENTE);
  const sesion = sesionDePaciente(base, token, ruta.alcance);
  if (!sesion) return enviar(res, paginaSesionTerminada(), opciones);
  const formulario = req.method === 'POST' ? await leerFormulario(req) : {};
  return enviar(res, await ruta.manejador({ ...base, ...sesion, tokenPaciente: token, formulario }), opciones);
}

async function atender({ rutas, ...entorno }, req, res) {
  const { bd, momentoFijado } = entorno;
  const [camino, consulta = ''] = req.url.split('?');
  const encontrada = buscarRuta(rutas, req.method, camino);
  const base = {
    ...entorno,
    ip: req.socket.remoteAddress,
    parametros: encontrada?.parametros ?? {},
    consulta: Object.fromEntries(new URLSearchParams(consulta)),
  };
  if (encontrada?.ruta.paciente) return atenderPaciente(base, encontrada.ruta, req, res);

  // FR-037: recepción solo lee la cookie `sesion` y solo busca en la tabla `sesion`. Una sesión de
  // paciente, en su propia cookie o puesta en esta, se trata igual que no tener sesión.
  const token = leerCookie(req, 'sesion');
  const clinica = token ? clinicaDeSesion(bd, token) : undefined;

  if (camino.startsWith('/estaticos/')) return servirEstatico(camino, res, clinica, momentoFijado);

  // requerirSesion: se aplica a todo, salvo lo que una ruta declare público.
  if (!clinica && !encontrada?.ruta.publica) {
    return enviar(res, req.method === 'GET' ? redireccion('/acceso') : paginaSinSesion(momentoFijado));
  }
  if (!encontrada) return enviar(res, paginaNoEncontrada(clinica, momentoFijado));

  const formulario = req.method === 'POST' ? await leerFormulario(req) : {};
  const respuesta = await encontrada.ruta.manejador({ ...base, clinica, token, formulario });
  return enviar(res, respuesta, { sinReferente: encontrada.ruta.sinReferente === true });
}

export function crearServidor({
  bd, ahora, momentoFijado = null, relojReal = Date.now, direccion = DIRECCION_POR_DEFECTO, rutasExtra = [],
}) {
  const rutas = [
    ...rutasAcceso, ...rutasAgenda, ...rutasCitas, ...rutasEstado, ...rutasCorreo, ...rutasPacientes,
    ...rutasEnlaceFicha, ...rutasEnlace, ...rutasPortal, ...rutasExtra,
  ].map(compilarRuta);
  const servidor = createServer((req, res) => {
    atender({
      bd, ahora, momentoFijado, relojReal, direccion, rutas,
    }, req, res).catch((error) => {
      if (error instanceof FormularioDemasiadoGrande) return enviar(res, paginaDemasiadoGrande(momentoFijado));
      console.error(error);
      if (res.headersSent) return res.destroy();
      return enviar(res, paginaFallo(momentoFijado));
    });
  });
  servidor.momentoFijado = momentoFijado;
  servidor.rutasRegistradas = rutas.map(({
    metodo, patron, publica, paciente, alcance,
  }) => ({
    metodo, patron, publica, paciente, alcance,
  }));
  return servidor;
}
