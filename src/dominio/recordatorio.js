// Recordatorio de cita (003): la ventana de cada ejecución (RR3) y el correo que la avisa (FR-007 a
// FR-010). Funciones puras, sin almacén ni ficheros. Contrato: contracts/correo-recordatorio.md.
import { etiquetaZona, fecha, hora, nombreDia } from './formato.js';
import { diaDeSemana, sumarDias } from './tiempo.js';

/**
 * RR3: las citas del día natural siguiente a `hoy`, en hora local de la clínica. Es aritmética de
 * calendario sobre texto, así que un día de 23 o 25 horas sigue siendo un día entero (FR-004).
 */
export function ventana(hoy) {
  const dia = sumarDias(hoy, 1);
  return { dia, desde: `${dia}T00:00`, hasta: `${sumarDias(hoy, 2)}T00:00` };
}

/** «martes 03/11/2026»: el día de la semana en minúscula y la fecha (FR-008). */
export function diaEscrito(texto) {
  return `${nombreDia(diaDeSemana(texto)).toLowerCase()} ${fecha(texto)}`;
}

// Solo modo simulado: `.invalid` está reservado y no recibe correo (research.md §6).
const REMITENTE = 'recordatorios@citaclara.invalid';
const CRLF = '\r\n';
const DIAS_RFC = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MESES_RFC = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// RFC 2047: una palabra codificada no pasa de 75 caracteres; 45 bytes dan 60 de base64, más 12 de marco.
const BYTES_POR_PALABRA = 45;

/** Cabecera con texto no ASCII en palabras RFC 2047 en base64, sin partir ningún carácter. */
function codificar(texto) {
  const palabras = [];
  let trozo = '';
  for (const caracter of texto) {
    if (Buffer.byteLength(trozo + caracter) > BYTES_POR_PALABRA) {
      palabras.push(trozo);
      trozo = '';
    }
    trozo += caracter;
  }
  palabras.push(trozo);
  return palabras.map((p) => `=?UTF-8?B?${Buffer.from(p, 'utf8').toString('base64')}?=`).join(`${CRLF} `);
}

/** Minutos de desfase de `zona` respecto a UTC en el instante `instante`. */
function desfaseEn(instante, zona) {
  const nombre = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' })
    .formatToParts(instante).find((p) => p.type === 'timeZoneName').value;
  const [, signo, horas, minutos = '0'] = nombre.match(/^GMT(?:([+-])(\d{2}):?(\d{2})?)?$/) ?? [];
  if (!signo) return 0;
  return (signo === '-' ? -1 : 1) * (Number(horas) * 60 + Number(minutos));
}

/** `Date` de RFC 5322 para el momento local `ahora` de `zona`: «Mon, 02 Nov 2026 08:00:00 +0100». */
function fechaRfc(ahora, zona) {
  const [y, m, d, h, min] = ahora.match(/\d+/g).map(Number);
  const comoUtc = Date.UTC(y, m - 1, d, h, min);
  // El desfase se mira en el instante real; se recalcula por si la primera estimación cruza el cambio de hora.
  let desfase = desfaseEn(new Date(comoUtc), zona);
  desfase = desfaseEn(new Date(comoUtc - desfase * 60_000), zona);
  const absoluto = Math.abs(desfase);
  const dos = (n) => String(n).padStart(2, '0');
  const zonaRfc = `${desfase < 0 ? '-' : '+'}${dos(Math.floor(absoluto / 60))}${dos(absoluto % 60)}`;
  return `${DIAS_RFC[diaDeSemana(ahora)]}, ${dos(d)} ${MESES_RFC[m - 1]} ${y} ${dos(h)}:${dos(min)}:00 ${zonaRfc}`;
}

/**
 * El `.eml` del recordatorio de `cita`, en texto plano con líneas CRLF (FR-009). De la ficha solo
 * lleva el nombre, y el correo solo en `To` (FR-010). Sin `Message-ID`: con los mismos datos y el
 * mismo `ahora`, el mensaje solo cambia en el enlace (HU3-E5).
 */
export function componerRecordatorio({
  clinica, paciente, cita, profesional, servicio, ahora, enlace,
}) {
  const dia = diaEscrito(cita.inicio);
  const cabeceras = [
    `From: ${codificar(clinica.nombre)} <${REMITENTE}>`,
    `To: ${paciente.email}`,
    `Subject: ${codificar(`Recordatorio de tu cita del ${dia} a las ${hora(cita.inicio)}`)}`,
    `Date: ${fechaRfc(ahora, clinica.zona_horaria)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  const cuerpo = [
    `Hola, ${paciente.nombre}:`,
    '',
    `Te recordamos tu cita en ${clinica.nombre}.`,
    '',
    `Día: ${dia}`,
    `Hora: ${hora(cita.inicio)}`,
    `Profesional: ${profesional.nombre}`,
    `Servicio: ${servicio.nombre}`,
    `${etiquetaZona(clinica.zona_horaria)}.`,
    '',
    'Si no vas a poder venir, cancela la cita en este enlace y el hueco quedará libre para otra persona:',
    // Solo en su línea, para que los programas de correo lo conviertan en enlace (FR-007).
    enlace,
    '',
    'Al abrir el enlace verás la cita y tendrás que confirmar la cancelación.',
  ];
  return `${[...cabeceras, '', ...cuerpo].join(CRLF)}${CRLF}`;
}
