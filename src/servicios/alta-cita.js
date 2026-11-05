import { transaccionInmediata } from '../datos/bd.js';
import { profesionalPorId, servicioPorId } from '../datos/catalogo.js';
import { citaQueSolapa, insertarCita } from '../datos/citas.js';
import { crearPaciente, pacientePorId } from '../datos/pacientes.js';
import { hora } from '../dominio/formato.js';
import { calcularFin, MENSAJES, validarAlta, validarPaciente } from '../dominio/reglas.js';
import { ahoraEnZona } from '../dominio/tiempo.js';

/** Interrumpe la transacción para deshacerla toda: ni cita ni ficha (FR-010, FR-013). */
class Rechazo extends Error {
  constructor(motivo, mensaje) {
    super(mensaje);
    this.resultado = { ok: false, motivo, mensaje };
  }
}

const invalido = (mensaje) => new Rechazo('invalido', mensaje);
const noEncontrado = () => new Rechazo('no_encontrado', 'No encontrado');

function pacienteDeLaCita(bd, clinicaId, formulario) {
  if (formulario.paciente) {
    if (!pacientePorId(bd, clinicaId, formulario.paciente)) throw noEncontrado();
    return Number(formulario.paciente);
  }
  const nombre = formulario.paciente_nombre?.trim();
  const telefono = formulario.paciente_telefono?.trim();
  const email = formulario.paciente_email?.trim() || null;
  const error = validarPaciente({ nombre, telefono, email });
  if (error) throw invalido(error);
  return crearPaciente(bd, { clinicaId, nombre, telefono, email });
}

function insertarVigilandoSolape(bd, cita, profesional) {
  try {
    return insertarCita(bd, cita);
  } catch (error) {
    if (!error.message.includes('SOLAPE')) throw error;
    // El aborto solo deshace la inserción: seguimos en la transacción y la cita que estorba es estable.
    const otra = citaQueSolapa(bd, cita.profesionalId, cita.inicio, cita.fin);
    throw new Rechazo(
      'solape',
      `${profesional.nombre} ya tiene una cita de ${hora(otra.inicio)} a ${hora(otra.fin)} con ${otra.paciente_nombre}. Elige otra hora.`,
    );
  }
}

function registrar({ bd, clinica, ahora }, formulario) {
  const profesional = profesionalPorId(bd, clinica.id, formulario.profesional);
  const servicio = servicioPorId(bd, clinica.id, formulario.servicio);
  if (!profesional || !servicio) throw noEncontrado();
  if (servicio.especialidad !== profesional.especialidad) {
    throw invalido(`${profesional.nombre} no atiende ese servicio. Elige uno de ${profesional.especialidad.toLowerCase()}.`);
  }

  const { dia, hora: horaInicio } = formulario;
  const error = validarAlta({
    dia,
    hora: horaInicio,
    duracionMin: servicio.duracion_min,
    ahora: ahoraEnZona(ahora(), clinica.zona_horaria),
  });
  if (error) throw invalido(error);

  const pacienteId = pacienteDeLaCita(bd, clinica.id, formulario);
  const inicio = `${dia}T${horaInicio}`;
  const cita = {
    clinicaId: clinica.id,
    profesionalId: profesional.id,
    servicioId: servicio.id,
    pacienteId,
    inicio,
    fin: calcularFin(inicio, servicio.duracion_min),
  };
  return { ok: true, id: insertarVigilandoSolape(bd, cita, profesional) };
}

/** Devuelve `{ ok: true, id }` o `{ ok: false, motivo, mensaje }` con motivo `solape`, `invalido` o `no_encontrado`. */
export function crearCita(contexto, formulario) {
  const { profesional, servicio, dia, hora: horaInicio } = formulario;
  if (!profesional || !servicio || !dia || !horaInicio) {
    return { ok: false, motivo: 'invalido', mensaje: MENSAJES.faltanDatos };
  }
  try {
    return transaccionInmediata(contexto.bd, () => registrar(contexto, formulario));
  } catch (error) {
    if (error instanceof Rechazo) return error.resultado;
    throw error;
  }
}
