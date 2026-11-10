function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const sinEspacios = (texto) => texto.replace(/\s/g, '');

export function crearPaciente(bd, { clinicaId, nombre, telefono, email }) {
  const { lastInsertRowid } = bd
    .prepare('INSERT INTO paciente (clinica_id, nombre, telefono, email) VALUES (?, ?, ?, ?)')
    .run(clinicaId, nombre, telefono, email);
  return Number(lastInsertRowid);
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
