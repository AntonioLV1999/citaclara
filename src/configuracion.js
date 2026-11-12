// 003/FR-003: ajustes que comparten el servidor y el proceso de recordatorios, leídos en un solo sitio
// para que los dos entiendan igual el momento de referencia (FR-043 de la 001) y la dirección (FR-042).
// Mensajes: contracts/configuracion.md de la 001 y contracts/modelo-acceso.md de la 002.
import { esDireccionValida } from './dominio/direccion.js';
import { esMomentoValido } from './dominio/tiempo.js';

const MOMENTO_NO_VALIDO = 'El momento de referencia CITACLARA_AHORA no es válido. '
  + 'Escríbelo como AAAA-MM-DDTHH:MM, por ejemplo 2026-11-04T12:00.';
const DIRECCION_NO_VALIDA = 'La dirección pública CITACLARA_DIRECCION no es válida. '
  + 'Escríbela como http://… o https://…, sin barra al final, por ejemplo https://citas.example.com.';

/** Ajuste mal escrito: quien arranca escribe el mensaje y no sigue. */
export class ConfiguracionNoValida extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ConfiguracionNoValida';
  }
}

/** `{ momentoFijado, direccion, puerto, smtpConfigurado }`, o lanza `ConfiguracionNoValida`. */
export function leerConfiguracion(entorno) {
  const puerto = Number(entorno.PORT ?? 3000);

  const momentoFijado = entorno.CITACLARA_AHORA || null;
  if (momentoFijado !== null && !esMomentoValido(momentoFijado)) throw new ConfiguracionNoValida(MOMENTO_NO_VALIDO);

  const direccion = entorno.CITACLARA_DIRECCION || `http://localhost:${puerto}`;
  if (!esDireccionValida(direccion)) throw new ConfiguracionNoValida(DIRECCION_NO_VALIDA);

  // 003/FR-018: solo se avisa de él; el envío sigue simulado mientras no se cumpla FR-039 de la 001.
  const smtpConfigurado = Boolean(entorno.CITACLARA_SMTP);

  return {
    momentoFijado, direccion, puerto, smtpConfigurado,
  };
}
