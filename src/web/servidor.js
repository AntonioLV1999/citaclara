import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { clinicaDeSesion } from '../servicios/acceso.js';
import {
  paginaDemasiadoGrande, paginaFallo, paginaNoEncontrada, paginaSinSesion, redireccion,
} from './plantilla.js';
import { rutasAcceso } from './rutas/acceso.js';
import { rutasAgenda } from './rutas/agenda.js';
import { rutasCitas } from './rutas/citas.js';
import { rutasEstado } from './rutas/estado.js';
import { rutasPacientes } from './rutas/pacientes.js';

const CARPETA_ESTATICOS = new URL('./estaticos/', import.meta.url);
const TIPOS_ESTATICOS = { css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8' };
// Un nombre simple no puede salir de la carpeta: ni barras, ni puntos dobles, ni escapes.
const ESTATICO = /^\/estaticos\/([a-z0-9-]+)\.(css|js)$/;
const TAMANO_MAXIMO_FORMULARIO = 64 * 1024;

class FormularioDemasiadoGrande extends Error {}

function compilarRuta(ruta) {
  const expresion = ruta.patron.replace(/:([a-z]+)/g, '(?<$1>[^/]+)');
  return { ...ruta, expresion: new RegExp(`^${expresion}$`) };
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

function enviar(res, { estado, cuerpo = '', ubicacion, cookie }) {
  const cabeceras = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };
  if (ubicacion) cabeceras.location = ubicacion;
  if (cookie) cabeceras['set-cookie'] = cookie;
  res.writeHead(estado, cabeceras);
  res.end(cuerpo);
}

async function servirEstatico(camino, res, clinica) {
  const [, nombre, extension] = camino.match(ESTATICO) ?? [];
  if (!nombre) return enviar(res, paginaNoEncontrada(clinica));
  try {
    const cuerpo = await readFile(new URL(`${nombre}.${extension}`, CARPETA_ESTATICOS));
    return res.writeHead(200, { 'content-type': TIPOS_ESTATICOS[extension] }).end(cuerpo);
  } catch (error) {
    if (error.code === 'ENOENT') return enviar(res, paginaNoEncontrada(clinica));
    throw error;
  }
}

async function atender({ bd, ahora, rutas }, req, res) {
  const [camino, consulta = ''] = req.url.split('?');
  const token = leerCookie(req, 'sesion');
  const clinica = token ? clinicaDeSesion(bd, token) : undefined;

  if (camino.startsWith('/estaticos/')) return servirEstatico(camino, res, clinica);

  const encontrada = buscarRuta(rutas, req.method, camino);

  // requerirSesion: se aplica a todo, salvo lo que una ruta declare público.
  if (!clinica && !encontrada?.ruta.publica) {
    return enviar(res, req.method === 'GET' ? redireccion('/acceso') : paginaSinSesion());
  }
  if (!encontrada) return enviar(res, paginaNoEncontrada(clinica));

  const formulario = req.method === 'POST' ? await leerFormulario(req) : {};
  const respuesta = await encontrada.ruta.manejador({
    bd,
    ahora,
    clinica,
    token,
    parametros: encontrada.parametros,
    consulta: Object.fromEntries(new URLSearchParams(consulta)),
    formulario,
  });
  return enviar(res, respuesta);
}

export function crearServidor({ bd, ahora, rutasExtra = [] }) {
  const rutas = [
    ...rutasAcceso, ...rutasAgenda, ...rutasCitas, ...rutasEstado, ...rutasPacientes, ...rutasExtra,
  ].map(compilarRuta);
  const servidor = createServer((req, res) => {
    atender({ bd, ahora, rutas }, req, res).catch((error) => {
      if (error instanceof FormularioDemasiadoGrande) return enviar(res, paginaDemasiadoGrande());
      console.error(error);
      if (res.headersSent) return res.destroy();
      return enviar(res, paginaFallo());
    });
  });
  servidor.rutasRegistradas = rutas.map(({ metodo, patron, publica = false }) => ({ metodo, patron, publica }));
  return servidor;
}
