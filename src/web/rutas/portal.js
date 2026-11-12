// Portal del paciente (002): rutas de paciente, con la sesión y el alcance que declara cada una.
import { cerrarSesionPaciente, COOKIE_PACIENTE } from '../../servicios/acceso-paciente.js';
import { html, layoutPortal, pagina, paginaHasSalido } from '../plantilla.js';

function portal({ clinica, paciente }) {
  const contenido = html`<h1>Tus citas</h1>
    <p class="portal__paciente">${paciente.nombre}</p>`;
  return pagina(layoutPortal({ titulo: 'Tus citas', clinica, contenido }));
}

/** Cierra solo la sesión de paciente: la de recepción, si la hay, sigue abierta (FR-037 de la 001). */
function salir(contexto) {
  cerrarSesionPaciente(contexto, contexto.tokenPaciente);
  return { ...paginaHasSalido(), cookie: `${COOKIE_PACIENTE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` };
}

export const rutasPortal = [
  { metodo: 'GET', patron: '/portal', paciente: true, alcance: 'ficha', manejador: portal },
  { metodo: 'POST', patron: '/portal/salir', paciente: true, alcance: 'cualquiera', manejador: salir },
];
