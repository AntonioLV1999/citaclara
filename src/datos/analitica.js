// Lecturas del panel de analítica (spec 004). Solo SELECT: el panel no escribe nada (RA8).

/**
 * FR-015: todas las cifras de una apertura salen de un único instante. En modo WAL, una
 * transacción de lectura ve una sola instantánea aunque otro proceso escriba, y no toma el turno
 * de escritura, así que no retrasa ninguna reserva.
 */
export function transaccionLectura(bd, fn) {
  bd.exec('BEGIN');
  try {
    const resultado = fn();
    bd.exec('COMMIT');
    return resultado;
  } catch (error) {
    if (bd.isTransaction) bd.exec('ROLLBACK');
    throw error;
  }
}

/** Profesionales, servicios y citas del periodo de la clínica, sin ningún dato de pacientes (FR-012). */
export function leerDatosPanel(bd, clinicaId, periodo) {
  return transaccionLectura(bd, () => ({
    profesionales: bd.prepare('SELECT id, nombre FROM profesional WHERE clinica_id = ? ORDER BY id').all(clinicaId),
    servicios: bd.prepare(`SELECT id, nombre, duracion_min, precio_centimos FROM servicio
      WHERE clinica_id = ? ORDER BY id`).all(clinicaId),
    citas: bd.prepare(`
      SELECT cita.profesional_id, cita.servicio_id, cita.estado, cita.inicio,
        servicio.duracion_min, servicio.precio_centimos
      FROM cita
      JOIN servicio ON servicio.id = cita.servicio_id
      WHERE cita.clinica_id = ? AND cita.inicio >= ? AND cita.inicio < ?
      ORDER BY cita.inicio, cita.id
    `).all(clinicaId, `${periodo.inicio}T00:00`, `${periodo.lunesEnCurso}T00:00`),
  }));
}
