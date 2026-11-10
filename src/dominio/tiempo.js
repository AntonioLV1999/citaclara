// Las fechas y horas son texto en hora local de la clínica: `AAAA-MM-DD` y `AAAA-MM-DDTHH:MM`.
// La aritmética usa UTC como calendario neutro, de modo que el cambio de hora y la zona del
// proceso no intervienen: las 10:00 siguen siendo las 10:00 (FR-025).

const dosDigitos = (n) => String(n).padStart(2, '0');

function aInstante(texto) {
  const [y, m, d, h = 0, min = 0] = texto.match(/\d+/g).map(Number);
  return Date.UTC(y, m - 1, d, h, min);
}

function aTexto(instante) {
  const f = new Date(instante);
  const dia = `${f.getUTCFullYear()}-${dosDigitos(f.getUTCMonth() + 1)}-${dosDigitos(f.getUTCDate())}`;
  return `${dia}T${dosDigitos(f.getUTCHours())}:${dosDigitos(f.getUTCMinutes())}`;
}

export function ahoraEnZona(date, zona) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const p = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function sumarMinutos(texto, minutos) {
  return aTexto(aInstante(texto) + minutos * 60_000);
}

export function minutosEntre(inicio, fin) {
  return (aInstante(fin) - aInstante(inicio)) / 60_000;
}

export function sumarDias(dia, dias) {
  return sumarMinutos(`${dia}T00:00`, dias * 1440).slice(0, 10);
}

/** 0 es domingo, 1 es lunes y 6 es sábado. */
export function diaDeSemana(texto) {
  return new Date(aInstante(texto)).getUTCDay();
}

export function esDiaLaborable(texto) {
  const dia = diaDeSemana(texto);
  return dia >= 1 && dia <= 5;
}

export function esFechaValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  return aTexto(aInstante(texto)).startsWith(texto);
}

/** Momento local exacto `AAAA-MM-DDTHH:MM`, con una fecha y una hora que existen. */
export function esMomentoValido(texto) {
  const partes = typeof texto === 'string' && texto.match(/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d$/);
  return Boolean(partes) && esFechaValida(partes[1]);
}

/**
 * «Ahora» en hora local de la clínica (FR-043): el momento de referencia si existe, que no avanza,
 * y si no, la hora real. Las esperas no se miden con esto, sino con el tiempo real.
 */
export function ahoraLocal(contexto, zona) {
  return contexto.momentoFijado ?? ahoraEnZona(contexto.ahora(), zona);
}

/** Convierte el día escrito como `dd/mm/aaaa` a `AAAA-MM-DD`. Lo demás sigue igual, y lo valida `esFechaValida`. */
export function leerDia(texto) {
  const limpio = texto?.trim();
  const partes = limpio?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!partes) return limpio;
  const [, dia, mes, anio] = partes;
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}
