import { transaccionInmediata } from './bd.js';
import { borrarSesionesDeFicha } from './sesiones-paciente.js';

function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const sinEspacios = (texto) => texto.replace(/\s/g, '');

/**
 * Sin `enlace`, la ficha recibe el del generador único del almacén (002/FR-001): las fichas del alta
 * ya nacen con enlace. La semilla trae los suyos de demostración (FR-029).
 */
export function crearPaciente(bd, { clinicaId, nombre, telefono, email, enlace }) {
  if (enlace === undefined) {
    const { lastInsertRowid } = bd
      .prepare('INSERT INTO paciente (clinica_id, nombre, telefono, email) VALUES (?, ?, ?, ?)')
      .run(clinicaId, nombre, telefono, email);
    return Number(lastInsertRowid);
  }
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

/**
 * 002/FR-002: sustituye el enlace personal de la ficha por uno nuevo del generador único y lo devuelve,
 * o `undefined` si la ficha no es de la clínica. No cambia ninguna cita.
 */
export function anularEnlace(bd, clinicaId, pacienteId) {
  return transaccionInmediata(bd, () => {
    const { changes } = bd.prepare('UPDATE paciente SET enlace = lower(hex(randomblob(16))) WHERE clinica_id = ? AND id = ?')
      .run(clinicaId, pacienteId);
    if (changes === 0) return undefined;
    // RP7: el enlace anterior, los de cancelación y las sesiones caen a la vez.
    bd.prepare('DELETE FROM enlace_cancelacion WHERE cita_id IN (SELECT id FROM cita WHERE paciente_id = ?)').run(pacienteId);
    borrarSesionesDeFicha(bd, pacienteId);
    return pacientePorId(bd, clinicaId, pacienteId).enlace;
  });
}
