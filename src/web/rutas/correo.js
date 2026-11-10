import { citaPorId } from '../../datos/citas.js';
import { guardarCorreo } from '../../servicios/correo-ficha.js';
import { pagina, paginaNoEncontrada, redireccion } from '../plantilla.js';
import { agendaDeLaCita, vistaCorreo } from '../vistas/correo.js';

function formulario({ bd, clinica, parametros, momentoFijado }) {
  const cita = citaPorId(bd, clinica.id, parametros.id);
  if (!cita) return paginaNoEncontrada(clinica, momentoFijado);
  return pagina(vistaCorreo({ clinica, cita, momentoFijado }));
}

function guardar(contexto) {
  const { clinica, parametros, formulario: enviado, momentoFijado } = contexto;
  const resultado = guardarCorreo(contexto, parametros.id, enviado.email);
  if (resultado.ok) return redireccion(agendaDeLaCita(resultado.cita));
  if (resultado.motivo === 'no_encontrado') return paginaNoEncontrada(clinica, momentoFijado);
  // FR-019: se conserva lo escrito para que la persona lo corrija.
  return pagina(vistaCorreo({
    clinica, cita: resultado.cita, valor: enviado.email, mensaje: resultado.mensaje, momentoFijado,
  }), 422);
}

export const rutasCorreo = [
  { metodo: 'GET', patron: '/citas/:id/correo', manejador: formulario },
  { metodo: 'POST', patron: '/citas/:id/correo', manejador: guardar },
];
