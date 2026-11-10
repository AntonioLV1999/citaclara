export function todasLasClinicas(bd) {
  return bd.prepare('SELECT * FROM clinica ORDER BY id').all();
}

export function clinicaPorId(bd, id) {
  return bd.prepare('SELECT * FROM clinica WHERE id = ?').get(id);
}

export function profesionales(bd, clinicaId) {
  return bd.prepare('SELECT * FROM profesional WHERE clinica_id = ? ORDER BY id').all(clinicaId);
}

export function profesionalPorId(bd, clinicaId, id) {
  return bd.prepare('SELECT * FROM profesional WHERE clinica_id = ? AND id = ?').get(clinicaId, id);
}

export function serviciosDeEspecialidad(bd, clinicaId, especialidad) {
  return bd.prepare('SELECT * FROM servicio WHERE clinica_id = ? AND especialidad = ? ORDER BY id')
    .all(clinicaId, especialidad);
}

export function servicioPorId(bd, clinicaId, id) {
  return bd.prepare('SELECT * FROM servicio WHERE clinica_id = ? AND id = ?').get(clinicaId, id);
}
