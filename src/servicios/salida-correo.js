// Modo simulado del envío (003/FR-018, FR-019): cada recordatorio es un fichero `.eml` propio.
// No abre ninguna conexión de red: este módulo solo escribe en disco.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const CARPETA_SALIDA = 'datos/salida-correo';

/**
 * Devuelve `enviar(mensaje)`, que escribe `mensaje.texto` en `recordatorio-<cita>-<8 hex>.eml`. La parte
 * al azar evita chocar con ficheros de una semilla anterior, que reutiliza números de cita, y `wx`
 * hace que nunca se sobrescriba uno existente (FR-019): si chocara, falla y la cita cuenta como fallida.
 */
export function crearEscritorEml(carpeta = CARPETA_SALIDA) {
  return function enviar(mensaje) {
    mkdirSync(carpeta, { recursive: true });
    const nombre = `recordatorio-${mensaje.citaId}-${randomBytes(4).toString('hex')}.eml`;
    writeFileSync(join(carpeta, nombre), mensaje.texto, { encoding: 'utf8', flag: 'wx' });
    return nombre;
  };
}
