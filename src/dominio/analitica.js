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

/** Principio II: un total que no cuadra con sus partes no se muestra nunca. */
function exigirCuadre(descripcion, ...sumas) {
  if (sumas.some((suma) => suma !== sumas[0])) throw new Error(`Las cifras del panel no cuadran: ${descripcion} (${sumas.join(' ≠ ')})`);
}

const sumar = (filas, campo) => filas.reduce((suma, fila) => suma + fila[campo], 0);

/** RA5: céntimos exactos del precio de cada completada, por servicio y en total. */
function calcularIngresos(servicios, completadas) {
  const filas = servicios.map((servicio) => {
    const suyas = completadas.filter((cita) => cita.servicio_id === servicio.id);
    return { servicio, completadas: suyas.length, centimos: sumar(suyas, 'precio_centimos') };
  });
  const total = sumar(filas, 'centimos');
  exigirCuadre('ingresos por servicio', total, sumar(completadas, 'precio_centimos'));
  return { servicios: filas, total };
}

/** Recuentos por estado de llegada y tasa de RA3 de un grupo de citas ya clasificadas. */
function recuentos(citas) {
  const de = (clase) => citas.filter((cita) => cita.clase === clase).length;
  const completadas = de('completada');
  const noAsistidas = de('no_asistida');
  return {
    completadas,
    noAsistidas,
    canceladas: de('cancelada'),
    tasa: { numerador: noAsistidas, denominador: completadas + noAsistidas },
  };
}

/** RA3 y RA7: la tasa de cada profesional y la de la clínica, esta desde los recuentos totales. */
function calcularNoAsistencia(profesionales, citas) {
  const filas = profesionales.map((profesional) => ({
    profesional,
    ...recuentos(citas.filter((cita) => cita.profesional_id === profesional.id)),
  }));
  const clinica = recuentos(citas);
  for (const campo of ['completadas', 'noAsistidas', 'canceladas']) {
    exigirCuadre(`${campo} por profesional`, clinica[campo], sumar(filas, campo));
  }
  return { profesionales: filas, clinica };
}

const minutosCompletados = (citas) => sumar(citas.filter((cita) => cita.clase === 'completada'), 'duracion_min');

/**
 * RA4: tiempo de las completadas, por la duración de su servicio, entre la capacidad del horario.
 * Las no asistidas, las canceladas y las reservadas no cuentan.
 */
function calcularOcupacion(profesionales, citas, periodo, semanal) {
  const capacidadPeriodo = semanal * periodo.semanas.length;
  const ocupacion = (minutos, capacidad) => ({ numerador: minutos, denominador: capacidad });
  const filas = profesionales.map((profesional) => {
    const suyas = citas.filter((cita) => cita.profesional_id === profesional.id);
    const semanas = periodo.semanas.map((_, i) => {
      const minutos = minutosCompletados(suyas.filter((cita) => cita.semana === i));
      return { minutos, ocupacion: ocupacion(minutos, semanal) };
    });
    const minutos = minutosCompletados(suyas);
    return { profesional, semanas, periodo: { capacidad: capacidadPeriodo, minutos, ocupacion: ocupacion(minutos, capacidadPeriodo) } };
  });
  const capacidad = capacidadPeriodo * profesionales.length;
  const minutos = minutosCompletados(citas);
  exigirCuadre('minutos por profesional', minutos, filas.reduce((suma, fila) => suma + fila.periodo.minutos, 0));
  return { profesionales: filas, clinica: { capacidad, minutos, ocupacion: ocupacion(minutos, capacidad) } };
}

export function calcularPanel({ hoy, ahora, profesionales, servicios, citas }) {
  const periodo = periodoDe(hoy);
  const delPeriodo = citas
    .map((cita) => ({ ...cita, semana: semanaDe(periodo, cita.inicio), clase: clasificar(cita, ahora) }))
    .filter((cita) => cita.semana !== -1);
  const completadas = delPeriodo.filter((cita) => cita.clase === 'completada');
  const semanal = capacidadSemanal();
  return {
    periodo,
    sinCerrar: delPeriodo.filter((cita) => cita.clase === 'sin_cerrar').length,
    capacidadSemanal: semanal,
    ingresos: calcularIngresos(servicios, completadas),
    noAsistencia: calcularNoAsistencia(profesionales, delPeriodo),
    ocupacion: calcularOcupacion(profesionales, delPeriodo, periodo, semanal),
  };
}
