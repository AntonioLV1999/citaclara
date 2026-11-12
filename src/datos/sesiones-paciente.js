// Sesiones de paciente (002/FR-005, FR-037 de la 001): tabla y cookie propias, aparte de recepción.

export function crearSesionPaciente(bd, { tokenHash, pacienteId, citaId = null, ahoraReal }) {
  bd.prepare('INSERT INTO sesion_paciente (token_hash, paciente_id, cita_id, ultima_actividad) VALUES (?, ?, ?, ?)')
    .run(tokenHash, pacienteId, citaId, ahoraReal);
}

/** La sesión, con la clínica de su ficha. */
export function sesionPacientePorHash(bd, tokenHash) {
  return bd.prepare(`
    SELECT sesion_paciente.*, paciente.clinica_id
    FROM sesion_paciente JOIN paciente ON paciente.id = sesion_paciente.paciente_id
    WHERE sesion_paciente.token_hash = ?
  `).get(tokenHash);
}

export function tocarSesionPaciente(bd, tokenHash, ahoraReal) {
  bd.prepare('UPDATE sesion_paciente SET ultima_actividad = ? WHERE token_hash = ?').run(ahoraReal, tokenHash);
}

export function borrarSesionPaciente(bd, tokenHash) {
  bd.prepare('DELETE FROM sesion_paciente WHERE token_hash = ?').run(tokenHash);
}

/** RP7: todas las sesiones de la ficha, de los dos alcances. */
export function borrarSesionesDeFicha(bd, pacienteId) {
  bd.prepare('DELETE FROM sesion_paciente WHERE paciente_id = ?').run(pacienteId);
}
