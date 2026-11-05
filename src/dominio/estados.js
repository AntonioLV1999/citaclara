export const ACCIONES = {
  completar: { texto: 'Completada', titulo: 'Marcar la cita como completada', estado: 'completada' },
  'no-asistio': { texto: 'No asistió', titulo: 'Marcar que el paciente no asistió', estado: 'no_asistida' },
  cancelar: { texto: 'Cancelar', titulo: 'Cancelar la cita', estado: 'cancelada' },
};

export function estadoDeAccion(accion) {
  return Object.hasOwn(ACCIONES, accion) ? ACCIONES[accion].estado : undefined;
}

/** RN4: solo se actúa sobre citas reservadas. RN5: cerrarla exige que haya llegado su hora de inicio. */
export function accionesPermitidas(cita, ahora) {
  if (cita.estado !== 'reservada') return [];
  return cita.inicio <= ahora ? ['completar', 'no-asistio', 'cancelar'] : ['cancelar'];
}
