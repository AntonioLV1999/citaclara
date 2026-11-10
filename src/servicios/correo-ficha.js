// FR-041: añadir, corregir o quitar el correo de la ficha desde una cita de la agenda.
import { citaPorId } from '../datos/citas.js';
import { cambiarCorreo } from '../datos/pacientes.js';
import { validarCorreo } from '../dominio/reglas.js';

/**
 * Guarda `texto` como correo de la ficha del paciente de la cita; vacío lo quita. No toca la cita, ni
 * el nombre ni el teléfono, y no envía nada. Devuelve `{ ok: true, cita }`,
 * `{ ok: false, motivo: 'no_encontrado' }` o `{ ok: false, motivo: 'rechazo', mensaje, cita }`.
 */
export function guardarCorreo({ bd, clinica }, citaId, texto) {
  const cita = citaPorId(bd, clinica.id, citaId);
  if (!cita) return { ok: false, motivo: 'no_encontrado' };
  const email = (texto ?? '').trim() || null;
  const mensaje = validarCorreo(email);
  if (mensaje) return { ok: false, motivo: 'rechazo', mensaje, cita };
  cambiarCorreo(bd, clinica.id, cita.paciente_id, email);
  return { ok: true, cita };
}
