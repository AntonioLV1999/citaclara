import { esDiaLaborable, sumarMinutos } from './tiempo.js';

export const APERTURA = '09:00';
export const CIERRE = '20:00';

const ocupa = ({ estado }) => estado === 'reservada' || estado === 'completada';

/** Primer múltiplo de 15 minutos que no ha pasado: el primer inicio que RN2 y FR-011 admiten. */
function primerInicioPosible(ahora) {
  const minutos = Number(ahora.slice(14, 16));
  return sumarMinutos(ahora, (15 - (minutos % 15)) % 15);
}

function tramosLibres(dia, citas) {
  const cierre = `${dia}T${CIERRE}`;
  const ordenadas = citas.filter(ocupa).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const tramos = [];
  let cursor = `${dia}T${APERTURA}`;
  for (const { inicio, fin } of ordenadas) {
    if (inicio > cursor) tramos.push({ inicio: cursor, fin: inicio });
    if (fin > cursor) cursor = fin;
  }
  if (cursor < cierre) tramos.push({ inicio: cursor, fin: cierre });
  return tramos;
}

/** Tramos libres `[inicio, fin)` del día, cada uno con su indicador `reservable` (FR-016, FR-018). */
export function calcularHuecos({ dia, citas, ahora }) {
  if (!esDiaLaborable(dia)) return [];
  const primero = primerInicioPosible(ahora);
  return tramosLibres(dia, citas).flatMap(({ inicio, fin }) => {
    if (fin <= primero) return [{ inicio, fin, reservable: false }];
    if (inicio >= primero) return [{ inicio, fin, reservable: true }];
    return [{ inicio, fin: primero, reservable: false }, { inicio: primero, fin, reservable: true }];
  });
}
