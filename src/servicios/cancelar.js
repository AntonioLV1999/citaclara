// Operación única de cancelar (FR-038): la única forma de cancelar una cita, para todos los canales.
// Contrato: specs/001-nucleo-agenda/contracts/operacion-cancelar.md
import { transaccionInmediata } from '../datos/bd.js';
import { citaPorId, registrarCancelacion } from '../datos/citas.js';
import { dentroDePlazo, limiteCancelacion } from '../dominio/estados.js';
import { ahoraLocal } from '../dominio/tiempo.js';

export const CANALES = ['recepcion', 'portal', 'correo'];

/**
 * Cancela la cita `citaId` de `contexto.clinica` por `canal`. Devuelve `null` si la cita no existe en
 * esa clínica, o un resultado con `cita`: `ya_cancelada` (`origen`, `momento`), `no_cancelable`
 * (`estado`), `fuera_de_plazo` (`limite`) o `cancelada_ahora` (`origen`, `momento`).
 * Comprobar y escribir es una sola transacción: entre cancelaciones simultáneas, solo una prospera.
 */
export function cancelarCita(contexto, citaId, canal) {
  if (!CANALES.includes(canal)) throw new Error(`Canal de cancelación no válido: «${canal}»`);
  const { bd, clinica } = contexto;

  return transaccionInmediata(bd, () => {
    const cita = citaPorId(bd, clinica.id, citaId);
    if (!cita) return null;
    if (cita.estado === 'cancelada') {
      return { resultado: 'ya_cancelada', cita, origen: cita.origen_cancelacion, momento: cita.momento_cancelacion };
    }
    if (cita.estado !== 'reservada') return { resultado: 'no_cancelable', cita, estado: cita.estado };

    const ahora = ahoraLocal(contexto, clinica.zona_horaria);
    // RN8 solo limita al paciente; recepción cancela en cualquier momento (RN5).
    if (canal !== 'recepcion' && !dentroDePlazo(cita.inicio, ahora)) {
      return { resultado: 'fuera_de_plazo', cita, limite: limiteCancelacion(cita.inicio) };
    }
    registrarCancelacion(bd, cita.id, canal, ahora);
    return { resultado: 'cancelada_ahora', cita: citaPorId(bd, clinica.id, cita.id), origen: canal, momento: ahora };
  });
}
