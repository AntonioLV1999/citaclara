const CITA_COMPLETA = `
  SELECT cita.*, paciente.nombre AS paciente_nombre, paciente.telefono AS paciente_telefono,
    paciente.email AS paciente_email, servicio.nombre AS servicio_nombre
  FROM cita
  JOIN paciente ON paciente.id = cita.paciente_id
  JOIN servicio ON servicio.id = cita.servicio_id
`;

/** Una cancelada solo se inserta así desde la semilla, que carga la historia en su estado definitivo. */
export function insertarCita(bd, {
  clinicaId, profesionalId, servicioId, pacienteId, inicio, fin, estado = 'reservada',
  origenCancelacion = null, momentoCancelacion = null,
}) {
  const { lastInsertRowid } = bd.prepare(`
    INSERT INTO cita (clinica_id, profesional_id, servicio_id, paciente_id, inicio, fin, estado,
      origen_cancelacion, momento_cancelacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(clinicaId, profesionalId, servicioId, pacienteId, inicio, fin, estado, origenCancelacion, momentoCancelacion);
  return Number(lastInsertRowid);
}

export function citasDelDia(bd, clinicaId, profesionalId, dia) {
  return bd.prepare(`${CITA_COMPLETA}
    WHERE cita.clinica_id = ? AND cita.profesional_id = ? AND cita.inicio >= ? AND cita.inicio <= ?
    ORDER BY cita.inicio, cita.id
  `).all(clinicaId, profesionalId, `${dia}T00:00`, `${dia}T23:59`);
}

export function citaQueSolapa(bd, profesionalId, inicio, fin) {
  return bd.prepare(`${CITA_COMPLETA}
    WHERE cita.profesional_id = ? AND cita.estado IN ('reservada', 'completada')
      AND cita.inicio < ? AND ? < cita.fin
    ORDER BY cita.inicio
  `).get(profesionalId, fin, inicio);
}

export function citaPorId(bd, clinicaId, id) {
  return bd.prepare(`${CITA_COMPLETA} WHERE cita.clinica_id = ? AND cita.id = ?`).get(clinicaId, id);
}

const CIERRES = new Set(['completada', 'no_asistida']);

/** Cierra una cita reservada. Cancelar no pasa por aquí, sino por la operación única (FR-038). */
export function cambiarEstado(bd, id, estado) {
  if (!CIERRES.has(estado)) throw new Error(`cambiarEstado no admite el estado «${estado}»`);
  bd.prepare("UPDATE cita SET estado = ? WHERE id = ? AND estado = 'reservada'").run(estado, id);
}

/**
 * FR-036: estado, origen y momento en una sola escritura. Solo la importa src/servicios/cancelar.js
 * (FR-038), y un test lo comprueba.
 */
export function registrarCancelacion(bd, id, origen, momento) {
  bd.prepare(`UPDATE cita SET estado = 'cancelada', origen_cancelacion = ?, momento_cancelacion = ?
    WHERE id = ? AND estado = 'reservada'`).run(origen, momento, id);
}
