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
