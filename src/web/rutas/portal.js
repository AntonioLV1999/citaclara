// Portal del paciente (002): rutas de paciente, con la sesión y el alcance que declara cada una.
import { citasDeFicha } from '../../datos/portal.js';
import { citasDelPaciente } from '../../dominio/portal.js';
import { ahoraLocal } from '../../dominio/tiempo.js';
import { cerrarSesionPaciente, COOKIE_PACIENTE } from '../../servicios/acceso-paciente.js';
import { pagina, paginaHasSalido } from '../plantilla.js';
import { vistaPortal } from '../vistas/portal.js';

/** RP1: solo las citas de la ficha de la sesión, con el «ahora» de la clínica (FR-043 de la 001). */
export function paginaPortal(contexto, { aviso, estado = 200 } = {}) {
  const { bd, clinica, paciente } = contexto;
  const { proximas, historial } = citasDelPaciente(
    citasDeFicha(bd, clinica.id, paciente.id),
    ahoraLocal(contexto, clinica.zona_horaria),
  );
  return pagina(vistaPortal({
    clinica, paciente, proximas, historial, aviso,
  }), estado);
}

/** Cierra solo la sesión de paciente: la de recepción, si la hay, sigue abierta (FR-037 de la 001). */
function salir(contexto) {
  cerrarSesionPaciente(contexto, contexto.tokenPaciente);
  return { ...paginaHasSalido(), cookie: `${COOKIE_PACIENTE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` };
}

export const rutasPortal = [
  { metodo: 'GET', patron: '/portal', paciente: true, alcance: 'ficha', manejador: (contexto) => paginaPortal(contexto) },
  { metodo: 'POST', patron: '/portal/salir', paciente: true, alcance: 'cualquiera', manejador: salir },
];
