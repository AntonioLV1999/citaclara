function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const sinEspacios = (texto) => texto.replace(/\s/g, '');

/** Las fichas del alta nacen sin enlace: generarlo es de la 002. La semilla sí lo trae (FR-029). */
export function crearPaciente(bd, { clinicaId, nombre, telefono, email, enlace = null }) {
  const { lastInsertRowid } = bd
    .prepare('INSERT INTO paciente (clinica_id, nombre, telefono, email, enlace) VALUES (?, ?, ?, ?, ?)')
    .run(clinicaId, nombre, telefono, email, enlace);
  return Number(lastInsertRowid);
}

/** FR-041: solo cambia el correo de la ficha. Nombre y teléfono no se editan fuera del alta. */
export function cambiarCorreo(bd, clinicaId, pacienteId, email) {
  bd.prepare('UPDATE paciente SET email = ? WHERE clinica_id = ? AND id = ?').run(email, clinicaId, pacienteId);
}

export function pacientePorId(bd, clinicaId, id) {
  return bd.prepare('SELECT * FROM paciente WHERE clinica_id = ? AND id = ?').get(clinicaId, id);
}

export function pacientesDeClinica(bd, clinicaId) {
  return bd.prepare('SELECT * FROM paciente WHERE clinica_id = ? ORDER BY nombre').all(clinicaId);
}

/** SQLite no sabe ignorar acentos, y una clínica pequeña tiene pocas fichas: se filtra en Node. */
export function buscarPacientes(bd, clinicaId, texto) {
  const buscado = normalizar(texto);
  if (!buscado) return [];
  const telefono = sinEspacios(buscado);
  return pacientesDeClinica(bd, clinicaId).filter((paciente) =>
    normalizar(paciente.nombre).includes(buscado) || sinEspacios(paciente.telefono).includes(telefono));
}
