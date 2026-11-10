export function crearSesion(bd, tokenHash, clinicaId) {
  bd.prepare('INSERT INTO sesion (token_hash, clinica_id) VALUES (?, ?)').run(tokenHash, clinicaId);
}

export function sesionPorHash(bd, tokenHash) {
  return bd.prepare('SELECT * FROM sesion WHERE token_hash = ?').get(tokenHash);
}

export function borrarSesion(bd, tokenHash) {
  bd.prepare('DELETE FROM sesion WHERE token_hash = ?').run(tokenHash);
}
