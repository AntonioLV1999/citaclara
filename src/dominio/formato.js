import { diaDeSemana } from './tiempo.js';

const ETIQUETAS_ESTADO = {
  reservada: 'Reservada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistida: 'No asistida',
};

const ETIQUETAS_ZONA = {
  'Europe/Madrid': 'Horas en hora peninsular',
  'Atlantic/Canary': 'Horas en hora de Canarias',
};

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function fecha(texto) {
  const [anio, mes, dia] = texto.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Valor de un campo de día: `dd/mm/aaaa`, o lo escrito tal cual si no tiene forma de fecha. */
export function fechaEscrita(texto) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? fecha(texto) : texto;
}

export function hora(texto) {
  return texto.slice(11, 16);
}

export function euros(centimos) {
  const enteros = String(Math.trunc(centimos / 100)).replace(/\B(?=(\d{3})+$)/g, '.');
  return `${enteros},${String(centimos % 100).padStart(2, '0')} €`;
}

const millares = (entero) => String(entero).replace(/\B(?=(\d{3})+$)/g, '.');

/**
 * 004/RA7: un porcentaje a partir de sus dos enteros, redondeado una sola vez a un decimal con la
 * mitad hacia arriba. Las décimas se calculan con enteros, sin coma flotante.
 */
export function porcentaje(numerador, denominador) {
  if (denominador === 0) return 'Sin datos';
  const decimas = Math.floor((2000 * numerador + denominador) / (2 * denominador));
  return `${millares(Math.trunc(decimas / 10))},${decimas % 10} %`;
}

/** 004/FR-014: horas exactas. Los minutos son múltiplos de 15, así que bastan dos decimales. */
export function horas(minutos) {
  const centesimas = String((minutos % 60) * 100 / 60).padStart(2, '0').replace(/0+$/, '');
  return `${millares(Math.trunc(minutos / 60))}${centesimas ? `,${centesimas}` : ''} h`;
}

export function etiquetaEstado(estado) {
  return ETIQUETAS_ESTADO[estado];
}

const ORIGENES_DEL_PACIENTE = new Set(['portal', 'correo']);

/**
 * FR-027: la etiqueta de una cita. Una cancelada por el paciente lleva la fecha y la hora de la
 * cancelación, sin decir por qué canal; la cita sin cerrar sigue siendo «Reservada».
 */
export function etiquetaCita(cita) {
  if (cita.estado === 'cancelada' && ORIGENES_DEL_PACIENTE.has(cita.origen_cancelacion)) {
    const momento = cita.momento_cancelacion;
    return `Cancelada por el paciente el ${fecha(momento)} a las ${hora(momento)}`;
  }
  return etiquetaEstado(cita.estado);
}

export function etiquetaZona(zona) {
  return ETIQUETAS_ZONA[zona];
}

export function nombreDia(numero) {
  return NOMBRES_DIA[numero];
}

/** FR-043, HU5-E5: aviso de las pantallas de recepción mientras el reloj está fijado. */
export function avisoRelojFijado(momento) {
  const dia = nombreDia(diaDeSemana(momento)).toLowerCase();
  return `Reloj de demostración: la hora está fijada en el ${dia} ${fecha(momento)} a las ${hora(momento)} y no avanza.`;
}
