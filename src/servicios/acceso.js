import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { clinicaPorId, todasLasClinicas } from '../datos/catalogo.js';
import { borrarSesion, crearSesion, sesionPorHash } from '../datos/sesiones.js';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function hashClave(clave, sal) {
  return scryptSync(clave, sal, 64).toString('hex');
}

/** Compara con todas las clínicas, sin salir antes, para no delatar nada por el tiempo de respuesta. */
export function comprobarClave(bd, clave) {
  let encontrada = null;
  for (const clinica of todasLasClinicas(bd)) {
    const intento = Buffer.from(hashClave(clave, clinica.clave_sal), 'hex');
    const guardada = Buffer.from(clinica.clave_hash, 'hex');
    if (intento.length === guardada.length && timingSafeEqual(intento, guardada)) encontrada ??= clinica;
  }
  return encontrada;
}

export function abrirSesion(bd, clinicaId) {
  const token = randomBytes(32).toString('hex');
  crearSesion(bd, hashToken(token), clinicaId);
  return token;
}

export function clinicaDeSesion(bd, token) {
  const sesion = sesionPorHash(bd, hashToken(token));
  return sesion && clinicaPorId(bd, sesion.clinica_id);
}

export function cerrarSesion(bd, token) {
  borrarSesion(bd, hashToken(token));
}
