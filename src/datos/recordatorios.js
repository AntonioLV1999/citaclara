// Recordatorios de cita (003): citas de la ventana, reserva del envío y su anulación.
// Consultas: specs/003-recordatorios-cita/data-model.md.
import { transaccionInmediata } from './bd.js';

const CITA_DEL_RECORDATORIO = `
  SELECT cita.id, cita.clinica_id, cita.estado, cita.inicio, cita.fin,
    paciente.nombre AS paciente_nombre, paciente.email AS paciente_email,
    profesional.nombre AS profesional_nombre, servicio.nombre AS servicio_nombre
  FROM cita
  JOIN paciente ON paciente.id = cita.paciente_id
  JOIN profesional ON profesional.id = cita.profesional_id
  JOIN servicio ON servicio.id = cita.servicio_id
`;

/**
 * RR2, RR3 y RR1: las citas reservadas de la ventana que aún no tienen recordatorio, con o sin correo
 * en la ficha, en un orden fijo para que el resumen y los ficheros salgan siempre igual.
 */
export function citasDeLaVentana(bd, clinicaId, { desde, hasta }) {
  return bd.prepare(`${CITA_DEL_RECORDATORIO}
    WHERE cita.clinica_id = ? AND cita.estado = 'reservada' AND cita.inicio >= ? AND cita.inicio < ?
      AND NOT EXISTS (SELECT 1 FROM recordatorio WHERE recordatorio.cita_id = cita.id)
    ORDER BY cita.inicio, cita.id
  `).all(clinicaId, desde, hasta);
}

/** Un token del generador único de la 002 (002/FR-025, contracts/modelo-acceso.md de la 002). */
export function nuevoToken(bd) {
  return bd.prepare('SELECT lower(hex(randomblob(16))) AS token').get().token;
}

/**
 * Reserva del envío (RR1): vuelve a leer la cita y la ficha, comprueba RR2 y que no tenga recordatorio,
 * e inserta a la vez el `recordatorio` y su `enlace_cancelacion`. Devuelve la cita con los datos del
 * mensaje, o `null` si ya no toca enviarlo. `BEGIN IMMEDIATE`: dos ejecuciones no reservan la misma.
 */
export function reservarEnvio(bd, {
  citaId, desde, hasta, ahora, tokenHash,
}) {
  return transaccionInmediata(bd, () => {
    const cita = bd.prepare(`${CITA_DEL_RECORDATORIO} WHERE cita.id = ?`).get(citaId);
    if (!cita || cita.estado !== 'reservada' || !cita.paciente_email) return null;
    if (cita.inicio < desde || cita.inicio >= hasta) return null;
    if (bd.prepare('SELECT 1 FROM recordatorio WHERE cita_id = ?').get(citaId)) return null;
    // 003/FR-018: en la v1 solo hay modo simulado. La dirección es la de la ficha ahora (RR2).
    bd.prepare("INSERT INTO recordatorio (cita_id, enviado_en, direccion, modo) VALUES (?, ?, ?, 'simulado')")
      .run(citaId, ahora, cita.paciente_email);
    bd.prepare('INSERT INTO enlace_cancelacion (token_hash, cita_id) VALUES (?, ?)').run(tokenHash, citaId);
    return cita;
  });
}

/** 003/FR-005: el envío ha fallado; la cita deja de contar como recordada y su enlace no vale. */
export function anularEnvio(bd, citaId, tokenHash) {
  transaccionInmediata(bd, () => {
    bd.prepare('DELETE FROM enlace_cancelacion WHERE token_hash = ? AND cita_id = ?').run(tokenHash, citaId);
    bd.prepare('DELETE FROM recordatorio WHERE cita_id = ?').run(citaId);
  });
}
