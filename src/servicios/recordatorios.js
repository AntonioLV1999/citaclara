// Proceso de recordatorios (003, FR-001 a FR-006): por clínica, avisa de cada cita reservada de mañana
// una sola vez (RR1) y deja un resumen. Contrato: specs/003-recordatorios-cita/contracts/proceso-recordatorios.md
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { todasLasClinicas } from '../datos/catalogo.js';
import {
  anularEnvio, citasDeLaVentana, nuevoToken, reservarEnvio,
} from '../datos/recordatorios.js';
import { etiquetaZona, fecha, hora } from '../dominio/formato.js';
import { componerRecordatorio, diaEscrito, ventana } from '../dominio/recordatorio.js';
import { ahoraLocal } from '../dominio/tiempo.js';
import { crearEscritorEml } from './salida-correo.js';

export const REGISTRO = 'datos/recordatorios.log';

const AVISO_SMTP = 'Hay un servidor de correo configurado, pero el envío real está desactivado hasta que se '
  + 'cumplan las condiciones para usar datos reales. Los recordatorios se han escrito en datos/salida-correo/.';

const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

/** «hora peninsular» o «hora de Canarias», la zona del resumen (FR-008). */
const zonaDelResumen = (zona) => etiquetaZona(zona).replace(/^Horas en /, '');

function lineaResumen(clinica, ahora, r) {
  return `${fecha(ahora)} ${hora(ahora)} (${zonaDelResumen(clinica.zona_horaria)}) · ${clinica.nombre} · `
    + `citas del ${diaEscrito(r.ventana)}: ${r.enviados} enviados, ${r.sinCorreo} sin correo, ${r.fallidos} fallidos`;
}

/** Una clínica: reserva cada cita, envía fuera de la transacción y, si falla, anula la reserva (FR-005). */
function procesarClinica(contexto, clinica, { direccion, enviar }) {
  const { bd } = contexto;
  const ahora = ahoraLocal(contexto, clinica.zona_horaria);
  const hoy = ahora.slice(0, 10);
  const v = ventana(hoy);
  const resumen = {
    clinica, hoy, ventana: v.dia, enviados: 0, sinCorreo: 0, fallidos: 0,
  };
  const errores = [];

  for (const candidata of citasDeLaVentana(bd, clinica.id, v)) {
    // RR2: sin correo no hay aviso; el resumen solo la cuenta.
    if (!candidata.paciente_email) {
      resumen.sinCorreo += 1;
      continue;
    }
    const token = nuevoToken(bd);
    const tokenHash = sha256(token);
    const cita = reservarEnvio(bd, {
      citaId: candidata.id, desde: v.desde, hasta: v.hasta, ahora, tokenHash,
    });
    // Ya recordada por otra ejecución, o cambiada desde la consulta: no se hace nada con ella.
    if (!cita) continue;

    const texto = componerRecordatorio({
      clinica,
      paciente: { nombre: cita.paciente_nombre, email: cita.paciente_email },
      cita,
      profesional: { nombre: cita.profesional_nombre },
      servicio: { nombre: cita.servicio_nombre },
      ahora,
      enlace: `${direccion}/e/${token}`,
    });
    try {
      enviar({ citaId: cita.id, para: cita.paciente_email, texto });
      resumen.enviados += 1;
    } catch (error) {
      anularEnvio(bd, cita.id, tokenHash);
      resumen.fallidos += 1;
      // Para diagnosticar: el número de la cita y el error, nunca la dirección de correo (FR-006).
      errores.push(`Cita ${cita.id}: no se ha podido enviar el recordatorio (${error.message})`);
    }
  }
  return { resumen, lineas: [lineaResumen(clinica, ahora, resumen), ...errores] };
}

/**
 * Ejecuta el proceso para `clinicas` (todas, por defecto) y devuelve un resumen por clínica:
 * `{ clinica, hoy, ventana, enviados, sinCorreo, fallidos }`. Las líneas del resumen van a `salida` y
 * al final de `registro` (`null`, ninguno). Un error que no sea de una cita detiene el proceso.
 */
export function ejecutarRecordatorios(contexto, {
  clinicas = todasLasClinicas(contexto.bd),
  direccion,
  enviar = crearEscritorEml(),
  smtpConfigurado = false,
  registro = REGISTRO,
  salida = console.log,
} = {}) {
  const resumenes = [];
  const lineas = [];
  for (const clinica of clinicas) {
    const r = procesarClinica(contexto, clinica, { direccion, enviar });
    resumenes.push(r.resumen);
    lineas.push(...r.lineas);
  }
  // 003/FR-018: hay servidor, pero el envío sigue simulado mientras no se cumpla FR-039 de la 001.
  if (smtpConfigurado) lineas.push(AVISO_SMTP);

  for (const linea of lineas) salida(linea);
  if (registro && lineas.length) {
    mkdirSync(dirname(registro), { recursive: true });
    appendFileSync(registro, `${lineas.join('\n')}\n`, 'utf8');
  }
  return resumenes;
}
