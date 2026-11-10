import { transaccionInmediata } from '../datos/bd.js';
import { cambiarEstado, citaPorId } from '../datos/citas.js';
import { accionesPermitidas, estadoDeAccion } from '../dominio/estados.js';
import { etiquetaEstado } from '../dominio/formato.js';
import { ahoraLocal } from '../dominio/tiempo.js';
import { cancelarCita } from './cancelar.js';

const NO_ENCONTRADA = { ok: false, motivo: 'no_encontrado' };

const estadoDefinitivo = (cita) => ({
  ok: false,
  motivo: 'rechazo',
  cita,
  mensaje: `Esta cita ya está ${etiquetaEstado(cita.estado).toLowerCase()} y no se puede cambiar.`,
});

/** Recepción cancela por la operación única, con su canal y sin plazo (FR-038, RN5). */
function cancelarDesdeRecepcion(contexto, id) {
  const r = cancelarCita(contexto, id, 'recepcion');
  if (!r) return NO_ENCONTRADA;
  if (r.resultado === 'cancelada_ahora') return { ok: true, cita: r.cita };
  // `ya_cancelada` y `no_cancelable` llevan el mensaje de H3-E5. `fuera_de_plazo` no ocurre con recepción.
  return estadoDefinitivo(r.cita);
}

/** Devuelve `{ ok: true, cita }`, o `{ ok: false, motivo, mensaje, cita }` con motivo `rechazo` o `no_encontrado`. */
export function aplicarAccion(contexto, id, accion) {
  const estado = estadoDeAccion(accion);
  if (!estado) return NO_ENCONTRADA;
  if (accion === 'cancelar') return cancelarDesdeRecepcion(contexto, id);

  const { bd, clinica } = contexto;
  return transaccionInmediata(bd, () => {
    const cita = citaPorId(bd, clinica.id, id);
    if (!cita) return NO_ENCONTRADA;
    if (cita.estado !== 'reservada') return estadoDefinitivo(cita);
    if (!accionesPermitidas(cita, ahoraLocal(contexto, clinica.zona_horaria)).includes(accion)) {
      return {
        ok: false,
        motivo: 'rechazo',
        cita,
        mensaje: 'Esta cita todavía no ha empezado. Hasta entonces solo se puede cancelar.',
      };
    }
    cambiarEstado(bd, cita.id, estado);
    return { ok: true, cita };
  });
}
