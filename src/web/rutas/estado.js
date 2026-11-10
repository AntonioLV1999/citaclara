import { citaPorId } from '../../datos/citas.js';
import { estadoDeAccion } from '../../dominio/estados.js';
import { aplicarAccion } from '../../servicios/cambio-estado.js';
import { pagina, paginaMensaje, paginaNoEncontrada, redireccion } from '../plantilla.js';
import { vistaConfirmar } from '../vistas/confirmar.js';

const agendaDe = ({ profesional_id: profesional, inicio }) => `/agenda?profesional=${profesional}&dia=${inicio.slice(0, 10)}`;

function confirmar({ bd, clinica, parametros, consulta }) {
  const cita = citaPorId(bd, clinica.id, parametros.id);
  if (!cita || !estadoDeAccion(consulta.accion)) return paginaNoEncontrada(clinica);
  return pagina(vistaConfirmar({ clinica, cita, accion: consulta.accion }));
}

function aplicar(contexto) {
  const { bd, clinica, ahora, momentoFijado, parametros, formulario } = contexto;
  // El contexto de la operación única es exactamente el del contrato (operacion-cancelar.md).
  const resultado = aplicarAccion({ bd, clinica, ahora, momentoFijado }, parametros.id, formulario.accion);
  if (resultado.ok) return redireccion(agendaDe(resultado.cita));
  if (resultado.motivo === 'no_encontrado') return paginaNoEncontrada(clinica);
  return paginaMensaje(409, 'No se ha podido cambiar la cita', resultado.mensaje, clinica, {
    ruta: agendaDe(resultado.cita),
    texto: 'Volver a la agenda',
  });
}

export const rutasEstado = [
  { metodo: 'GET', patron: '/citas/:id/confirmar', manejador: confirmar },
  { metodo: 'POST', patron: '/citas/:id/estado', manejador: aplicar },
];
