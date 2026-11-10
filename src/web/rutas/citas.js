import { profesionales, profesionalPorId, serviciosDeEspecialidad } from '../../datos/catalogo.js';
import { citasDelDia } from '../../datos/citas.js';
import { pacientesDeClinica } from '../../datos/pacientes.js';
import { calcularHuecos } from '../../dominio/huecos.js';
import { ahoraLocal, esFechaValida, leerDia } from '../../dominio/tiempo.js';
import { crearCita } from '../../servicios/alta-cita.js';
import { pagina, paginaNoEncontrada, redireccion } from '../plantilla.js';
import { vistaAlta } from '../vistas/alta.js';

const ESTADO_DE_RECHAZO = { solape: 409, invalido: 422 };

function paginaAlta(contexto, valores, rechazo) {
  const { bd, clinica, momentoFijado } = contexto;
  const lista = profesionales(bd, clinica.id);
  const profesional = valores.profesional
    ? profesionalPorId(bd, clinica.id, valores.profesional)
    : lista[0];
  if (!profesional) return paginaNoEncontrada(clinica, momentoFijado);

  const momento = ahoraLocal(contexto, clinica.zona_horaria);
  const dia = valores.dia || momento.slice(0, 10);
  const conDia = { ...valores, dia };
  const huecos = rechazo && esFechaValida(dia)
    ? calcularHuecos({ dia, citas: citasDelDia(bd, clinica.id, profesional.id, dia), ahora: momento })
    : undefined;

  return pagina(vistaAlta({
    clinica,
    profesionales: lista,
    profesional,
    servicios: serviciosDeEspecialidad(bd, clinica.id, profesional.especialidad),
    pacientes: pacientesDeClinica(bd, clinica.id),
    valores: conDia,
    mensaje: rechazo?.mensaje,
    huecos,
    momentoFijado,
  }), rechazo ? ESTADO_DE_RECHAZO[rechazo.motivo] : 200);
}

function formularioNuevo(contexto) {
  const { profesional, servicio, dia, hora } = contexto.consulta;
  return paginaAlta(contexto, { profesional, servicio, dia, hora });
}

/** Cambiar de profesional repinta el formulario con lo escrito, sin escribir nada (FR-019). */
function repintarFormulario(contexto) {
  return paginaAlta(contexto, { ...contexto.formulario, dia: leerDia(contexto.formulario.dia) });
}

function registrarCita(contexto) {
  const { clinica, momentoFijado } = contexto;
  const formulario = { ...contexto.formulario, dia: leerDia(contexto.formulario.dia) };
  const resultado = crearCita(contexto, formulario);
  if (resultado.ok) {
    return redireccion(`/agenda?profesional=${encodeURIComponent(formulario.profesional)}&dia=${encodeURIComponent(formulario.dia)}`);
  }
  if (resultado.motivo === 'no_encontrado') return paginaNoEncontrada(clinica, momentoFijado);
  return paginaAlta(contexto, formulario, resultado);
}

export const rutasCitas = [
  { metodo: 'GET', patron: '/citas/nueva', manejador: formularioNuevo },
  { metodo: 'POST', patron: '/citas/nueva', manejador: repintarFormulario },
  { metodo: 'POST', patron: '/citas', manejador: registrarCita },
];
