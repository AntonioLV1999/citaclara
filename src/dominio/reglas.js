import { APERTURA, CIERRE } from './huecos.js';
import { esDiaLaborable, esFechaValida, sumarMinutos } from './tiempo.js';

export const MENSAJES = {
  pasado: 'Esa hora ya ha pasado. Elige una hora a partir de ahora.',
  horario: 'La clínica abre de lunes a viernes, de 09:00 a 20:00. Elige una hora dentro de ese horario.',
  horaNoValida: 'Las citas empiezan en punto, y cuarto, y media o menos cuarto. Elige una de esas horas.',
  dia: 'Ese día no es válido. Escribe la fecha como dd/mm/aaaa, por ejemplo 05/11/2026.',
  faltanDatos: 'Falta algún dato de la cita. Elige profesional, servicio, día y hora.',
  paciente: 'Escribe el nombre y un teléfono de al menos 9 dígitos.',
  correo: 'Ese correo no parece válido. Revísalo o déjalo en blanco.',
};

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TELEFONO = /^\+?[\d ]+$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function calcularFin(inicio, duracionMin) {
  return sumarMinutos(inicio, duracionMin);
}

/** Devuelve el mensaje de la primera regla incumplida, o `null` si el alta es válida. */
export function validarAlta({ dia, hora, duracionMin, ahora }) {
  if (!esFechaValida(dia)) return MENSAJES.dia;
  const partes = hora.match(HORA);
  if (!partes || Number(partes[2]) % 15 !== 0) return MENSAJES.horaNoValida;

  const inicio = `${dia}T${hora}`;
  if (inicio < ahora) return MENSAJES.pasado;

  const fin = calcularFin(inicio, duracionMin);
  const dentroDeHorario = esDiaLaborable(dia) && inicio >= `${dia}T${APERTURA}` && fin <= `${dia}T${CIERRE}`;
  return dentroDeHorario ? null : MENSAJES.horario;
}

/** FR-013: el correo es opcional; si existe, con forma de correo. Lo usan el alta y FR-041. */
export function validarCorreo(email) {
  return email && !CORREO.test(email) ? MENSAJES.correo : null;
}

export function validarPaciente({ nombre, telefono, email }) {
  const digitos = (telefono ?? '').replace(/\D/g, '');
  if (!nombre?.trim() || !TELEFONO.test(telefono ?? '') || digitos.length < 9) return MENSAJES.paciente;
  return validarCorreo(email);
}
