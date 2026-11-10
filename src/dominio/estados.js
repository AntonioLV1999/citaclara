import { sumarMinutos } from './tiempo.js';

export const ACCIONES = {
  completar: { texto: 'Completada', titulo: 'Marcar la cita como completada', estado: 'completada' },
  'no-asistio': { texto: 'No asistió', titulo: 'Marcar que el paciente no asistió', estado: 'no_asistida' },
  cancelar: { texto: 'Cancelar', titulo: 'Cancelar la cita', estado: 'cancelada' },
};

/** RN8: el paciente cancela hasta 2 horas antes del inicio, sobre el reloj local de la clínica. */
const PLAZO_DEL_PACIENTE_MIN = 120;

export function estadoDeAccion(accion) {
  return Object.hasOwn(ACCIONES, accion) ? ACCIONES[accion].estado : undefined;
}

/** FR-040: única definición de cita sin cerrar. Deja de ser futura en su minuto de inicio exacto. */
export function sinCerrar(cita, ahora) {
  return cita.estado === 'reservada' && cita.inicio <= ahora;
}

/** RN8: último minuto en que el paciente puede cancelar, en `AAAA-MM-DDTHH:MM`. */
export function limiteCancelacion(inicio) {
  return sumarMinutos(inicio, -PLAZO_DEL_PACIENTE_MIN);
}

/** RN8: «ahora» va en minutos, sin segundos, así que el minuto límite entra entero. */
export function dentroDePlazo(inicio, ahora) {
  return ahora <= limiteCancelacion(inicio);
}

/** RN4: solo se actúa sobre citas reservadas. RN5: cerrarla exige que haya llegado su hora de inicio. */
export function accionesPermitidas(cita, ahora) {
  if (cita.estado !== 'reservada') return [];
  return sinCerrar(cita, ahora) ? ['completar', 'no-asistio', 'cancelar'] : ['cancelar'];
}
