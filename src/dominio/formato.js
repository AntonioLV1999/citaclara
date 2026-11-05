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

export function hora(texto) {
  return texto.slice(11, 16);
}

export function euros(centimos) {
  const enteros = String(Math.trunc(centimos / 100)).replace(/\B(?=(\d{3})+$)/g, '.');
  return `${enteros},${String(centimos % 100).padStart(2, '0')} €`;
}

export function etiquetaEstado(estado) {
  return ETIQUETAS_ESTADO[estado];
}

export function etiquetaZona(zona) {
  return ETIQUETAS_ZONA[zona];
}

export function nombreDia(numero) {
  return NOMBRES_DIA[numero];
}
