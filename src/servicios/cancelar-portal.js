// Cancelar desde el portal (002, RP1, RP4, FR-015 a FR-017): comprueba la ficha y deja la cancelación
// a la operación única de la 001 (FR-038), con el canal «portal». El portal solo elige el mensaje.
import { citaPorId } from '../datos/citas.js';
import { cancelarCita } from './cancelar.js';

const DEL_PACIENTE = new Set(['portal', 'correo']);
const NO_ENCONTRADA = { caso: 'no_encontrada' };

/**
 * Devuelve `{ caso }`: `no_encontrada`, `hecha` (cancelada ahora, o ya cancelada por el paciente),
 * `ya_cancelada_por_clinica`, `fuera_de_plazo` (con `limite`) o `no_cancelable` (con `estado`).
 */
export function cancelarDesdePortal(contexto, citaId) {
  const {
    bd, clinica, paciente, ahora, momentoFijado,
  } = contexto;
  // RP1, antes de cancelar. La comprobación no envejece: `cita_rn4` impide cambiar el paciente.
  const cita = citaPorId(bd, clinica.id, citaId);
  if (!cita || cita.paciente_id !== paciente.id) return NO_ENCONTRADA;

  const r = cancelarCita({
    bd, clinica, ahora, momentoFijado,
  }, cita.id, 'portal');
  if (!r) return NO_ENCONTRADA;
  if (r.resultado === 'cancelada_ahora') return { caso: 'hecha' };
  if (r.resultado === 'ya_cancelada') return { caso: DEL_PACIENTE.has(r.origen) ? 'hecha' : 'ya_cancelada_por_clinica' };
  if (r.resultado === 'fuera_de_plazo') return { caso: 'fuera_de_plazo', limite: r.limite };
  return { caso: 'no_cancelable', estado: r.estado };
}
