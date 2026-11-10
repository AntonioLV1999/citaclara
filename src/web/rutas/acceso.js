import { abrirSesion, cerrarSesion, comprobarClave } from '../../servicios/acceso.js';
import { pagina, redireccion } from '../plantilla.js';
import { vistaAcceso } from '../vistas/acceso.js';

const ATRIBUTOS_COOKIE = 'HttpOnly; SameSite=Strict; Path=/';

function entrar({ bd, formulario, momentoFijado }) {
  const clinica = comprobarClave(bd, formulario.clave ?? '');
  if (!clinica) {
    return pagina(vistaAcceso({ mensaje: 'La clave no es correcta. Revísala e inténtalo de nuevo.', momentoFijado }), 401);
  }
  return redireccion('/agenda', `sesion=${abrirSesion(bd, clinica.id)}; ${ATRIBUTOS_COOKIE}`);
}

function salir({ bd, token }) {
  cerrarSesion(bd, token);
  return redireccion('/acceso', `sesion=; ${ATRIBUTOS_COOKIE}; Max-Age=0`);
}

export const rutasAcceso = [
  { metodo: 'GET', patron: '/acceso', publica: true, manejador: ({ momentoFijado }) => pagina(vistaAcceso({ momentoFijado })) },
  { metodo: 'POST', patron: '/acceso', publica: true, manejador: entrar },
  { metodo: 'POST', patron: '/salir', manejador: salir },
];
