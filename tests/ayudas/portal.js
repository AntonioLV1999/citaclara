// Ayudas de los tests de la 002: la semilla por defecto, el reloj de los ejemplos y los enlaces.
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBd } from '../../src/datos/bd.js';
import { cargar } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { reiniciarIntentos } from '../../src/servicios/acceso-paciente.js';
import { crearServidor } from '../../src/web/servidor.js';
import { detener, escuchar, peticion, sesionDePrueba } from './escenario.js';

export const AHORA = '2026-11-04T12:00';
export const DIRECCION = 'https://citas.example.com';

/** Otro servidor sobre la misma base, con su propio reloj (caso límite del plazo con la página abierta). */
export function servidorSobre(bd, { momentoFijado = AHORA, relojReal, direccion = DIRECCION } = {}) {
  const opciones = { bd, ahora: () => new Date(), momentoFijado, direccion };
  if (relojReal) opciones.relojReal = relojReal;
  return escuchar(crearServidor(opciones));
}

/** Base temporal con la semilla por defecto y un servidor con el reloj de los ejemplos (FR-043 de la 001). */
export async function escenarioSemilla({ momentoFijado = AHORA, relojReal } = {}) {
  reiniciarIntentos();
  const carpeta = mkdtempSync(join(tmpdir(), 'citaclara-portal-'));
  const ruta = join(carpeta, 'portal.db');
  const bd = abrirBd(ruta);
  const datos = generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO });
  cargar(bd, datos);
  const clinica = bd.prepare('SELECT * FROM clinica WHERE nombre = ?').get('Clínica Eleva');
  const servidor = await servidorSobre(bd, { momentoFijado, relojReal });
  return {
    bd,
    ruta,
    datos,
    clinica,
    servidor,
    recepcion: () => sesionDePrueba(bd, clinica.id),
    async cerrar() {
      await detener(servidor);
      bd.close();
      rmSync(carpeta, { recursive: true, force: true });
    },
  };
}

export function fichaPorNombre(bd, nombre) {
  const ficha = bd.prepare('SELECT * FROM paciente WHERE nombre = ?').get(nombre);
  if (!ficha) throw new Error(`No hay ninguna ficha de ${nombre}`);
  return ficha;
}

export function citaDe(bd, pacienteId, inicio) {
  const cita = bd.prepare('SELECT * FROM cita WHERE paciente_id = ? AND inicio = ?').get(pacienteId, inicio);
  if (!cita) throw new Error(`El paciente ${pacienteId} no tiene cita el ${inicio}`);
  return cita;
}

export const filaCita = (bd, id) => bd.prepare('SELECT * FROM cita WHERE id = ?').get(id);

/** Abre `/e/<enlace>` y devuelve la cabecera `Cookie` de la sesión de paciente. */
export async function entrarComoPaciente(servidor, enlace) {
  const r = await peticion(servidor, { ruta: `/e/${enlace}` });
  if (r.estado !== 303) throw new Error(`El enlace no ha entrado: ${r.estado}`);
  return r.cookies[0].split(';')[0];
}

/** Lo que hará la 003 con cada recordatorio: un token al azar, guardado como SHA-256 (modelo-acceso.md). */
export function enlaceCancelacionDePrueba(bd, citaId) {
  const token = randomBytes(16).toString('hex');
  bd.prepare('INSERT INTO enlace_cancelacion (token_hash, cita_id) VALUES (?, ?)')
    .run(createHash('sha256').update(token).digest('hex'), citaId);
  return token;
}

/** 002/FR-025: generado fuera de la semilla, con la forma de un enlace válido. */
export function tokenInventado() {
  return randomBytes(16).toString('hex');
}
