import { createHash } from 'node:crypto';
import { sumarDias, sumarMinutos } from '../dominio/tiempo.js';
import { hashClave } from '../servicios/acceso.js';
import { crearAzar } from './azar.js';
import {
  APELLIDOS, CLAVE, CLINICA, NOMBRES, NUMERO_PACIENTES, PROFESIONALES, SERVICIOS,
} from './datos-base.js';

const SEMANAS_HISTORIA = 8;
const SEMANAS_FUTURAS = 2;
const DIAS_LABORABLES = 5;
const APERTURA_MIN = 9 * 60;
const BLOQUES_DE_UNA_HORA = 11; // De 09:00 a 20:00. Ningún servicio dura más de un bloque.

const sinAcentos = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** FR-029: enlace personal de demostración del paciente n, de 1 a 40. Ficticio y público, como la clave. */
function enlaceDe(semilla, numero) {
  return createHash('sha256').update(`citaclara-enlace-${semilla}-${numero}`).digest('hex').slice(0, 32);
}

function generarPacientes(azar, semilla) {
  const combinaciones = NOMBRES.flatMap((nombre) => APELLIDOS.map((apellido) => [nombre, apellido]));
  const elegidas = azar.barajar(combinaciones).slice(0, NUMERO_PACIENTES);
  return elegidas.map(([nombre, apellido], i) => ({
    nombre: `${nombre} ${apellido}`,
    // Ningún número nacional español empieza por 0: no puede ser de una persona real (FR-034).
    telefono: `000 100 ${String(i + 1).padStart(3, '0')}`,
    email: i % 4 === 3 ? null : `${sinAcentos(nombre)}.${sinAcentos(apellido)}@example.com`,
    enlace: enlaceDe(semilla, i + 1),
  }));
}

/** Reparte citas en bloques de una hora distintos: dentro de un día, un profesional no puede solapar. */
function generarTramos(azar) {
  const tramos = [];
  for (let semana = -SEMANAS_HISTORIA; semana < SEMANAS_FUTURAS; semana += 1) {
    for (let dia = 0; dia < DIAS_LABORABLES; dia += 1) {
      PROFESIONALES.forEach((_, profesional) => {
        const cantidad = semana < 0 ? azar.entero(3, 5) : azar.entero(1, 3);
        const bloques = azar.barajar([...Array(BLOQUES_DE_UNA_HORA).keys()]).slice(0, cantidad);
        for (const bloque of bloques) tramos.push({ semana, dia, profesional, bloque });
      });
    }
  }
  return tramos.sort((a, b) =>
    a.semana - b.semana || a.dia - b.dia || a.bloque - b.bloque || a.profesional - b.profesional);
}

/** Recuentos exactos sobre la lista barajada, no sorteo cita a cita: así se garantizan los márgenes. */
function asignarEstados(azar, tramos) {
  const historia = tramos.filter((t) => t.semana < 0);
  const noAsistidas = Math.round(0.10 * historia.length);
  const canceladas = Math.round(0.08 * historia.length);
  const estados = new Map(azar.barajar(historia).map((tramo, i) => {
    if (i < noAsistidas) return [tramo, 'no_asistida'];
    return [tramo, i < noAsistidas + canceladas ? 'cancelada' : 'completada'];
  }));
  return tramos.map((tramo) => ({ ...tramo, estado: estados.get(tramo) ?? 'reservada' }));
}

function servicioDe(especialidad, primera) {
  return SERVICIOS.findIndex((s) => s.especialidad === especialidad && s.primera === primera);
}

/** Recorre en orden cronológico: la primera visita se repite solo si no llegó a completarse (FR-033). */
function asignarPacientesYServicios(azar, tramos) {
  const atendidos = new Set();
  return tramos.map(({ semana, dia, profesional, bloque, estado }) => {
    const paciente = azar.entero(0, NUMERO_PACIENTES - 1);
    const { especialidad } = PROFESIONALES[profesional];
    const clave = `${paciente}|${especialidad}`;
    const servicio = servicioDe(especialidad, !atendidos.has(clave));
    if (estado === 'completada' || estado === 'reservada') atendidos.add(clave);

    const { duracion_min: duracion } = SERVICIOS[servicio];
    const margen = azar.entero(0, (60 - duracion) / 15) * 15;
    return { semana, dia, minuto: APERTURA_MIN + bloque * 60 + margen, profesional, servicio, paciente, estado };
  });
}

/** Las fechas se calculan solo al final: cambiar de lunes no puede alterar el contenido (FR-032). */
function ponerFechas(cita, lunes) {
  const dia = sumarDias(lunes, cita.semana * 7 + cita.dia);
  const inicio = sumarMinutos(`${dia}T00:00`, cita.minuto);
  const conFechas = { ...cita, inicio, fin: sumarMinutos(inicio, SERVICIOS[cita.servicio].duracion_min) };
  // FR-029, FR-036: las canceladas de la historia nacen canceladas por recepción en su inicio.
  // Las demás no llevan estos campos, ni siquiera vacíos: lo exigen los resúmenes de FR-030.
  if (cita.estado !== 'cancelada') return conFechas;
  return { ...conFechas, origen_cancelacion: 'recepcion', momento_cancelacion: inicio };
}

/** Función pura: todo sale de la semilla y del lunes, nunca del reloj ni del azar del sistema. */
export function generar({ semilla, lunes }) {
  const azar = crearAzar(semilla);
  const pacientes = generarPacientes(azar, semilla);
  const tramos = asignarEstados(azar, generarTramos(azar));
  const citas = asignarPacientesYServicios(azar, tramos).map((cita) => ponerFechas(cita, lunes));
  const claveSal = `citaclara-semilla-${semilla}`;
  return {
    lunes,
    // Orden: nombre, zona_horaria, telefono, clave_hash, clave_sal (FR-030, historial D4).
    clinica: { ...CLINICA, clave_hash: hashClave(CLAVE, claveSal), clave_sal: claveSal },
    profesionales: PROFESIONALES.map((p) => ({ ...p })),
    servicios: SERVICIOS.map((s) => ({ ...s })),
    pacientes,
    citas,
  };
}
