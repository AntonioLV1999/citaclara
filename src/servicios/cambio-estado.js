import { transaccionInmediata } from '../datos/bd.js';
import { cambiarEstado, citaPorId } from '../datos/citas.js';
import { accionesPermitidas, estadoDeAccion } from '../dominio/estados.js';
import { etiquetaEstado } from '../dominio/formato.js';
import { ahoraEnZona } from '../dominio/tiempo.js';

const NO_ENCONTRADA = { ok: false, motivo: 'no_encontrado' };

/** Devuelve `{ ok: true, cita }`, o `{ ok: false, motivo, mensaje, cita }` con motivo `rechazo` o `no_encontrado`. */
export function aplicarAccion({ bd, clinica, ahora }, id, accion) {
  const estado = estadoDeAccion(accion);
  if (!estado) return NO_ENCONTRADA;

  return transaccionInmediata(bd, () => {
    const cita = citaPorId(bd, clinica.id, id);
    if (!cita) return NO_ENCONTRADA;
    if (cita.estado !== 'reservada') {
      const actual = etiquetaEstado(cita.estado).toLowerCase();
      return { ok: false, motivo: 'rechazo', cita, mensaje: `Esta cita ya está ${actual} y no se puede cambiar.` };
    }
    if (!accionesPermitidas(cita, ahoraEnZona(ahora(), clinica.zona_horaria)).includes(accion)) {
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
