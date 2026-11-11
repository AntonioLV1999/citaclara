// Cifras del panel de analítica (spec 004). Funciones puras: reciben las citas del periodo ya
// leídas y devuelven recuentos, minutos y céntimos enteros. Los porcentajes se guardan como su par
// de enteros y solo se redondean al mostrarlos (RA7).
import { sinCerrar } from './estados.js';
import { APERTURA, CIERRE } from './huecos.js';
import { diaDeSemana, esDiaLaborable, minutosEntre, sumarDias } from './tiempo.js';

const SEMANAS = 8;

/** RA1: las 8 últimas semanas completas, de lunes a domingo, anteriores a la semana en curso. */
export function periodoDe(hoy) {
  const lunesEnCurso = sumarDias(hoy, -((diaDeSemana(hoy) + 6) % 7));
  const inicio = sumarDias(lunesEnCurso, -7 * SEMANAS);
  const semanas = Array.from({ length: SEMANAS }, (_, i) => ({
    inicio: sumarDias(inicio, 7 * i),
    fin: sumarDias(inicio, 7 * i + 6),
  }));
  return { inicio, fin: sumarDias(lunesEnCurso, -1), lunesEnCurso, semanas };
}

/** RA2: índice de la semana de la fecha local de inicio, o -1 si queda fuera del periodo. */
export function semanaDe(periodo, inicio) {
  const dias = minutosEntre(`${periodo.inicio}T00:00`, `${inicio.slice(0, 10)}T00:00`) / 1440;
  const semana = Math.floor(dias / 7);
  return semana >= 0 && semana < SEMANAS ? semana : -1;
}

/**
 * RA4: minutos del horario de FR-012 de la 001 en una semana, para un profesional. El horario no
 * depende de la fecha ni del cambio de hora, así que vale cualquier semana de lunes a domingo.
 */
export function capacidadSemanal() {
  const lunes = '2026-11-02';
  const jornada = minutosEntre(`${lunes}T${APERTURA}`, `${lunes}T${CIERRE}`);
  let minutos = 0;
  for (let i = 0; i < 7; i += 1) {
    if (esDiaLaborable(sumarDias(lunes, i))) minutos += jornada;
  }
  return minutos;
}

/** Qué cuenta cada cita: la sin cerrar es la de FR-040 de la 001, y no suma en nada (RA6). */
export function clasificar(cita, ahora) {
  if (cita.estado === 'reservada') return sinCerrar(cita, ahora) ? 'sin_cerrar' : 'fuera';
  return cita.estado;
}

export function calcularPanel({ hoy, ahora, citas }) {
  const periodo = periodoDe(hoy);
  const delPeriodo = citas.filter((cita) => semanaDe(periodo, cita.inicio) !== -1);
  return {
    periodo,
    sinCerrar: delPeriodo.filter((cita) => clasificar(cita, ahora) === 'sin_cerrar').length,
    capacidadSemanal: capacidadSemanal(),
  };
}
