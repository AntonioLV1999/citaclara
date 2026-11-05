import { profesionales, profesionalPorId } from '../../datos/catalogo.js';
import { citasDelDia } from '../../datos/citas.js';
import { accionesPermitidas } from '../../dominio/estados.js';
import { calcularHuecos } from '../../dominio/huecos.js';
import { MENSAJES } from '../../dominio/reglas.js';
import { ahoraEnZona, esFechaValida, leerDia } from '../../dominio/tiempo.js';
import { pagina, paginaMensaje, paginaNoEncontrada, redireccion } from '../plantilla.js';
import { vistaAgenda } from '../vistas/agenda.js';

function agenda({ bd, ahora, clinica, consulta }) {
  const lista = profesionales(bd, clinica.id);
  const profesional = consulta.profesional ? profesionalPorId(bd, clinica.id, consulta.profesional) : lista[0];
  const momento = ahoraEnZona(ahora(), clinica.zona_horaria);
  const hoy = momento.slice(0, 10);
  const dia = leerDia(consulta.dia) || hoy;
  if (!profesional) return paginaNoEncontrada(clinica);
  if (!esFechaValida(dia)) return paginaMensaje(404, 'Ese día no es válido', MENSAJES.dia, clinica);

  const citas = citasDelDia(bd, clinica.id, profesional.id, dia);
  return pagina(vistaAgenda({
    clinica,
    profesionales: lista,
    profesional,
    dia,
    hoy,
    citas: citas.map((cita) => ({ ...cita, acciones: accionesPermitidas(cita, momento) })),
    huecos: calcularHuecos({ dia, citas, ahora: momento }),
  }));
}

export const rutasAgenda = [
  { metodo: 'GET', patron: '/', manejador: () => redireccion('/agenda') },
  { metodo: 'GET', patron: '/agenda', manejador: agenda },
];
