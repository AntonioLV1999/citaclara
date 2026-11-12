// Modelo común de acceso del paciente (RP6): sesiones, resolución de enlaces y límite de intentos.
// Contrato: specs/002-portal-paciente/contracts/modelo-acceso.md. Lo usa también la 003.
import { createHash, randomBytes } from 'node:crypto';
import { clinicaPorId } from '../datos/catalogo.js';
import { citaPorId } from '../datos/citas.js';
import { pacientePorId } from '../datos/pacientes.js';
import {
  borrarSesionPaciente, crearSesionPaciente, sesionPacientePorHash, tocarSesionPaciente,
} from '../datos/sesiones-paciente.js';

/** 002/FR-005: cookie propia del paciente, aparte de la de recepción (`sesion`). */
export const COOKIE_PACIENTE = 'sesion_paciente';

/** 002/FR-004: la sesión se cierra tras 30 minutos sin actividad, en tiempo real. */
const INACTIVIDAD_MS = 30 * 60_000;

const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

/** Abre una sesión de la ficha (`citaId` nulo) o de una sola cita, y devuelve su token. */
export function abrirSesionPaciente({ bd, relojReal }, pacienteId, citaId = null) {
  const token = randomBytes(32).toString('hex');
  crearSesionPaciente(bd, { tokenHash: sha256(token), pacienteId, citaId, ahoraReal: relojReal() });
  return token;
}

function encajaAlcance(sesion, alcance) {
  if (alcance === 'ficha') return sesion.cita_id === null;
  if (alcance === 'cita') return sesion.cita_id !== null;
  return alcance === 'cualquiera';
}

/**
 * Devuelve `{ paciente, clinica, citaDelAlcance }` si el token abre una sesión viva con ese alcance
 * (`ficha`, `cita` o `cualquiera`), y la renueva; si no, `null`. Una sesión caducada se borra.
 */
export function sesionDePaciente({ bd, relojReal }, token, alcance) {
  if (!token) return null;
  const tokenHash = sha256(token);
  const sesion = sesionPacientePorHash(bd, tokenHash);
  if (!sesion) return null;
  const ahoraReal = relojReal();
  if (ahoraReal - sesion.ultima_actividad > INACTIVIDAD_MS) {
    borrarSesionPaciente(bd, tokenHash);
    return null;
  }
  if (!encajaAlcance(sesion, alcance)) return null;
  tocarSesionPaciente(bd, tokenHash, ahoraReal);
  return {
    paciente: pacientePorId(bd, sesion.clinica_id, sesion.paciente_id),
    clinica: clinicaPorId(bd, sesion.clinica_id),
    citaDelAlcance: sesion.cita_id === null ? null : citaPorId(bd, sesion.clinica_id, sesion.cita_id),
  };
}

export function cerrarSesionPaciente({ bd }, token) {
  if (token) borrarSesionPaciente(bd, sha256(token));
}
