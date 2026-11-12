// Ayudas de los tests de la 003: ejecutar el proceso con un envío en memoria y el reloj fijado.
import { createHash } from 'node:crypto';
import { ejecutarRecordatorios } from '../../src/servicios/recordatorios.js';
import { tokenDelMensaje } from './correo.js';

export const DIRECCION = 'https://citas.example.com';

export const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

/**
 * Ejecuta el proceso con el momento fijado en `momento` y guarda los mensajes en memoria. `enviar`
 * permite provocar fallos: recibe el mensaje y la lista de los ya enviados.
 */
export function ejecutarEnMemoria(bd, momento, {
  clinicas, enviar, smtpConfigurado = false, registro = null, direccion = DIRECCION,
} = {}) {
  const mensajes = [];
  const lineas = [];
  const resumenes = ejecutarRecordatorios({ bd, ahora: () => new Date(), momentoFijado: momento }, {
    clinicas,
    direccion,
    smtpConfigurado,
    registro,
    salida: (linea) => lineas.push(linea),
    enviar(mensaje) {
      if (enviar) enviar(mensaje, mensajes);
      mensajes.push(mensaje);
    },
  });
  return { mensajes, lineas, resumenes };
}

export const recordatorioDe = (bd, citaId) => bd.prepare('SELECT * FROM recordatorio WHERE cita_id = ?').get(citaId);
export const enlacesDe = (bd, citaId) => bd.prepare('SELECT * FROM enlace_cancelacion WHERE cita_id = ?').all(citaId);
export const tokenDe = (mensaje) => tokenDelMensaje(mensaje.texto);

export function ponerCorreo(bd, pacienteId, email) {
  bd.prepare('UPDATE paciente SET email = ? WHERE id = ?').run(email, pacienteId);
}
