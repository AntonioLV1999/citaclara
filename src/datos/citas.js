const CITA_COMPLETA = `
  SELECT cita.*, paciente.nombre AS paciente_nombre, servicio.nombre AS servicio_nombre
  FROM cita
  JOIN paciente ON paciente.id = cita.paciente_id
  JOIN servicio ON servicio.id = cita.servicio_id
`;

export function insertarCita(bd, { clinicaId, profesionalId, servicioId, pacienteId, inicio, fin, estado = 'reservada' }) {
  const { lastInsertRowid } = bd.prepare(`
    INSERT INTO cita (clinica_id, profesional_id, servicio_id, paciente_id, inicio, fin, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(clinicaId, profesionalId, servicioId, pacienteId, inicio, fin, estado);
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

export function cambiarEstado(bd, id, estado) {
  bd.prepare("UPDATE cita SET estado = ? WHERE id = ? AND estado = 'reservada'").run(estado, id);
}
