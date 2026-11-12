// Portal del paciente (002): rutas de paciente, con la sesión y el alcance que declara cada una.
import { citaDeFicha, citasDeFicha } from '../../datos/portal.js';
import { limiteCancelacion } from '../../dominio/estados.js';
import { citasDelPaciente } from '../../dominio/portal.js';
import { ahoraLocal } from '../../dominio/tiempo.js';
import { cerrarSesionPaciente, COOKIE_PACIENTE } from '../../servicios/acceso-paciente.js';
import { cancelarDesdePortal } from '../../servicios/cancelar-portal.js';
import { pagina, paginaCitaNoEncontrada, paginaHasSalido } from '../plantilla.js';
import { vistaConfirmarCancelacion, vistaPortal, vistaResultadoCancelacion } from '../vistas/portal.js';

const YA_CANCELADA = 'Esta cita ya está cancelada. No tienes que hacer nada más.';
const ahoraDe = (contexto) => ahoraLocal(contexto, contexto.clinica.zona_horaria);

/** RP1: solo las citas de la ficha de la sesión, con el «ahora» de la clínica (FR-043 de la 001). */
function paginaPortal(contexto, { aviso, estado = 200 } = {}) {
  const { bd, clinica, paciente } = contexto;
  const { proximas, historial } = citasDelPaciente(citasDeFicha(bd, clinica.id, paciente.id), ahoraDe(contexto));
  return pagina(vistaPortal({
    clinica, paciente, proximas, historial, aviso,
  }), estado);
}

/** La cita de la ficha tal como la ve el paciente ahora, o `undefined` si no es suya (RP1). */
function citaVista(contexto) {
  const { bd, clinica, paciente, parametros } = contexto;
  const cita = citaDeFicha(bd, clinica.id, paciente.id, parametros.id);
  if (!cita) return undefined;
  const { proximas, historial } = citasDelPaciente([cita], ahoraDe(contexto));
  return [...proximas, ...historial][0];
}

/** Lo que ve quien abre la confirmación de una cita que ya no es próxima: lo mismo que al intentarlo. */
function casoDelHistorial(cita) {
  if (cita.estado === 'reservada') return { caso: 'fuera_de_plazo', limite: limiteCancelacion(cita.inicio) };
  if (cita.estado === 'cancelada') return { caso: cita.origen_cancelacion === 'recepcion' ? 'ya_cancelada_por_clinica' : 'hecha' };
  return { caso: 'no_cancelable', estado: cita.estado };
}

function responder(contexto, cita, resultado, estadoDeRechazo) {
  const { clinica } = contexto;
  if (resultado.caso === 'ya_cancelada_por_clinica') return paginaPortal(contexto, { aviso: YA_CANCELADA, estado: estadoDeRechazo });
  const estado = resultado.caso === 'hecha' ? 200 : estadoDeRechazo;
  return pagina(vistaResultadoCancelacion({ clinica, cita, ...resultado }), estado);
}

function confirmar(contexto) {
  const cita = citaVista(contexto);
  if (!cita) return paginaCitaNoEncontrada(contexto.clinica);
  // Solo las próximas son cancelables o llevan su límite (citasDelPaciente).
  const proxima = cita.cancelable || cita.limite !== undefined;
  if (proxima) return pagina(vistaConfirmarCancelacion({ clinica: contexto.clinica, cita }));
  return responder(contexto, cita, casoDelHistorial(cita), 200);
}

/** Respuesta directa, sin redirección: si el navegador reenvía el formulario, FR-038 da «ya cancelada». */
function cancelar(contexto) {
  const resultado = cancelarDesdePortal(contexto, contexto.parametros.id);
  if (resultado.caso === 'no_encontrada') return paginaCitaNoEncontrada(contexto.clinica);
  return responder(contexto, citaVista(contexto), resultado, 409);
}

/** Cierra solo la sesión de paciente: la de recepción, si la hay, sigue abierta (FR-037 de la 001). */
function salir(contexto) {
  cerrarSesionPaciente(contexto, contexto.tokenPaciente);
  return { ...paginaHasSalido(), cookie: `${COOKIE_PACIENTE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` };
}

export const rutasPortal = [
  { metodo: 'GET', patron: '/portal', paciente: true, alcance: 'ficha', manejador: (contexto) => paginaPortal(contexto) },
  { metodo: 'GET', patron: '/portal/citas/:id/cancelar', paciente: true, alcance: 'ficha', manejador: confirmar },
  { metodo: 'POST', patron: '/portal/citas/:id/cancelar', paciente: true, alcance: 'ficha', manejador: cancelar },
  { metodo: 'POST', patron: '/portal/salir', paciente: true, alcance: 'cualquiera', manejador: salir },
];
