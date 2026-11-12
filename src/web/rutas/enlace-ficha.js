// 002/FR-002, RP7: recepción copia y anula el enlace personal de la ficha desde una cita de la agenda.
import { citaPorId } from '../../datos/citas.js';
import { anularEnlace, pacientePorId } from '../../datos/pacientes.js';
import { pagina, paginaNoEncontrada, redireccion } from '../plantilla.js';
import { vistaAnularEnlace, vistaEnlace } from '../vistas/enlace-ficha.js';

function verEnlace({
  bd, clinica, parametros, consulta, direccion, momentoFijado,
}) {
  const cita = citaPorId(bd, clinica.id, parametros.id);
  if (!cita) return paginaNoEncontrada(clinica, momentoFijado);
  const { enlace } = pacientePorId(bd, clinica.id, cita.paciente_id);
  return pagina(vistaEnlace({
    clinica, cita, enlaceCompleto: `${direccion}/e/${enlace}`, nuevo: consulta.nuevo === '1', momentoFijado,
  }));
}

function confirmarAnulacion({
  bd, clinica, parametros, momentoFijado,
}) {
  const cita = citaPorId(bd, clinica.id, parametros.id);
  if (!cita) return paginaNoEncontrada(clinica, momentoFijado);
  return pagina(vistaAnularEnlace({ clinica, cita, momentoFijado }));
}

/** No envía nada: recepción da el enlace nuevo al paciente por su cuenta. */
function anular({
  bd, clinica, parametros, momentoFijado,
}) {
  const cita = citaPorId(bd, clinica.id, parametros.id);
  if (!cita) return paginaNoEncontrada(clinica, momentoFijado);
  anularEnlace(bd, clinica.id, cita.paciente_id);
  return redireccion(`/citas/${cita.id}/enlace?nuevo=1`);
}

export const rutasEnlaceFicha = [
  { metodo: 'GET', patron: '/citas/:id/enlace', manejador: verEnlace },
  { metodo: 'GET', patron: '/citas/:id/enlace/anular', manejador: confirmarAnulacion },
  { metodo: 'POST', patron: '/citas/:id/enlace/anular', manejador: anular },
];
