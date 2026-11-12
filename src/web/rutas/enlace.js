// Ruta única de los dos tipos de enlace del paciente (contracts/modelo-acceso.md de la 002).
import { COOKIE_PACIENTE, resolverEnlace } from '../../servicios/acceso-paciente.js';
import { paginaDemasiadosIntentos, paginaEnlaceNoValido, redireccion } from '../plantilla.js';

// `Lax`, no `Strict`: el paciente llega desde WhatsApp, un SMS o el correo (research.md §3 de la 002).
const ATRIBUTOS_COOKIE = 'HttpOnly; SameSite=Lax; Path=/';

function abrirEnlace(contexto) {
  const resultado = resolverEnlace(contexto, contexto.parametros.token);
  if (resultado.bloqueado) return paginaDemasiadosIntentos();
  if (resultado.noValido) return paginaEnlaceNoValido();
  // 303: el token sale de la barra de direcciones en cuanto se abre la sesión.
  return redireccion(resultado.destino, `${COOKIE_PACIENTE}=${resultado.token}; ${ATRIBUTOS_COOKIE}`);
}

export const rutasEnlace = [
  { metodo: 'GET', patron: '/e/:token', publica: true, sinReferente: true, manejador: abrirEnlace },
];
