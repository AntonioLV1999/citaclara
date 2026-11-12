// Búsqueda de los dos tipos de enlace del paciente (RP6): el personal y el de cancelación.

export function pacientePorEnlace(bd, token) {
  return bd.prepare('SELECT * FROM paciente WHERE enlace = ?').get(token);
}

/** La cita del enlace de cancelación cuyo hash es `tokenHash`, o `undefined`. */
export function enlaceCancelacionPorHash(bd, tokenHash) {
  return bd.prepare(`
    SELECT cita.id, cita.paciente_id, cita.clinica_id, cita.inicio
    FROM enlace_cancelacion JOIN cita ON cita.id = enlace_cancelacion.cita_id
    WHERE enlace_cancelacion.token_hash = ?
  `).get(tokenHash);
}
