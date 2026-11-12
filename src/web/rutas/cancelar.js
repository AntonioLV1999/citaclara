// Cancelar desde el correo (003, RR4, RR6, FR-011 a FR-016): rutas de paciente de alcance `cita`, a las
// que lleva el enlace del recordatorio (`GET /e/:token` de la 002). Contrato: contracts/pantalla-cancelar.md
import { profesionalPorId } from '../../datos/catalogo.js';
import { dentroDePlazo, limiteCancelacion } from '../../dominio/estados.js';
import { ahoraLocal } from '../../dominio/tiempo.js';
import { cancelarCita } from '../../servicios/cancelar.js';
import { pagina, paginaEnlaceNoValido } from '../plantilla.js';
import {
  vistaCancelada, vistaConfirmar, vistaFueraDePlazo, vistaYaCancelada,
} from '../vistas/cancelar.js';

/**
 * RR6: el enlace vale hasta el inicio de la cita. La sesión puede seguir abierta después, así que se
 * vuelve a comprobar en cada petición; caducado, la respuesta es la uniforme de la 002 (002/FR-003).
 */
function citaVigente(contexto) {
  const { citaDelAlcance: cita, clinica } = contexto;
  if (!cita || ahoraLocal(contexto, clinica.zona_horaria) >= cita.inicio) return null;
  return cita;
}

/** FR-015: abrir no cambia nada. Solo elige la pantalla según el estado y el plazo de RN8. */
function mostrar(contexto) {
  const cita = citaVigente(contexto);
  if (!cita) return paginaEnlaceNoValido();
  const { bd, clinica } = contexto;
  if (cita.estado === 'cancelada') return pagina(vistaYaCancelada({ clinica }));
  // RN5 de la 001: antes del inicio una cita no se completa ni se marca como no asistida.
  if (cita.estado !== 'reservada') return paginaEnlaceNoValido();
  if (!dentroDePlazo(cita.inicio, ahoraLocal(contexto, clinica.zona_horaria))) {
    return pagina(vistaFueraDePlazo({ clinica, limite: limiteCancelacion(cita.inicio) }));
  }
  return pagina(vistaConfirmar({ clinica, cita, profesional: profesionalPorId(bd, clinica.id, cita.profesional_id) }));
}

/**
 * FR-014: la confirmación la decide FR-038 de la 001 en este momento, aunque la pantalla se abriera antes.
 * Respuesta directa, sin redirección: si el navegador reenvía el formulario, FR-038 da «ya cancelada».
 */
function confirmar(contexto) {
  const cita = citaVigente(contexto);
  if (!cita) return paginaEnlaceNoValido();
  const {
    bd, clinica, ahora, momentoFijado,
  } = contexto;
  const r = cancelarCita({
    bd, clinica, ahora, momentoFijado,
  }, cita.id, 'correo');
  if (r?.resultado === 'cancelada_ahora') return pagina(vistaCancelada({ clinica, cita: r.cita }));
  if (r?.resultado === 'ya_cancelada') return pagina(vistaYaCancelada({ clinica }));
  if (r?.resultado === 'fuera_de_plazo') return pagina(vistaFueraDePlazo({ clinica, limite: r.limite }), 409);
  // `no_cancelable` o la cita ya no existe: igual que un enlace caducado (research.md §7).
  return paginaEnlaceNoValido();
}

export const rutasCancelar = [
  { metodo: 'GET', patron: '/cancelar', paciente: true, alcance: 'cita', manejador: mostrar },
  { metodo: 'POST', patron: '/cancelar', paciente: true, alcance: 'cita', manejador: confirmar },
];
