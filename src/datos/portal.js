// Consultas del portal del paciente (002). Solo leen: el portal no escribe citas (RP5).

/** RP1, 002/FR-008: las citas de una ficha, sin el precio. */
export function citasDeFicha(bd, clinicaId, pacienteId) {
  return bd.prepare(`
    SELECT cita.id, cita.inicio, cita.fin, cita.estado, cita.origen_cancelacion, cita.momento_cancelacion,
      servicio.nombre AS servicio_nombre, profesional.nombre AS profesional_nombre
    FROM cita
    JOIN servicio ON servicio.id = cita.servicio_id
    JOIN profesional ON profesional.id = cita.profesional_id
    WHERE cita.clinica_id = ? AND cita.paciente_id = ?
    ORDER BY cita.inicio, cita.id
  `).all(clinicaId, pacienteId);
}

/** RP1: una cita de la ficha, con los mismos datos que `citasDeFicha`, o `undefined` si no es suya. */
export function citaDeFicha(bd, clinicaId, pacienteId, citaId) {
  return citasDeFicha(bd, clinicaId, pacienteId).find((cita) => String(cita.id) === String(citaId));
}

/**
 * 002/FR-019: tramos de citas canceladas por el paciente (portal o correo) que aún no han empezado y
 * en los que nada ocupa al profesional. Uno por profesional, inicio y fin, del más cercano al más lejano.
 * Se calcula en cada carga: no hay nada que mantener ni que limpiar.
 */
export function huecosLiberados(bd, clinicaId, ahora) {
  return bd.prepare(`
    SELECT DISTINCT hueco.profesional_id, profesional.nombre AS profesional_nombre, hueco.inicio, hueco.fin
    FROM cita AS hueco
    JOIN profesional ON profesional.id = hueco.profesional_id
    WHERE hueco.clinica_id = ? AND hueco.estado = 'cancelada' AND hueco.origen_cancelacion IN ('portal', 'correo')
      AND hueco.inicio > ?
      AND NOT EXISTS (
        SELECT 1 FROM cita AS ocupa
        WHERE ocupa.profesional_id = hueco.profesional_id AND ocupa.estado IN ('reservada', 'completada')
          AND ocupa.inicio < hueco.fin AND hueco.inicio < ocupa.fin
      )
    ORDER BY hueco.inicio, profesional.nombre
  `).all(clinicaId, ahora);
}
