import { leerDatosPanel } from '../../datos/analitica.js';
import { calcularPanel, periodoDe } from '../../dominio/analitica.js';
import { ahoraLocal } from '../../dominio/tiempo.js';
import { pagina } from '../plantilla.js';
import { vistaAnalitica } from '../vistas/analitica.js';

/** Spec 004: solo lectura y un único periodo, así que la consulta de la URL no se usa. */
function analitica(contexto) {
  const { bd, clinica, momentoFijado } = contexto;
  // FR-016: «hoy» con la fecha local de la clínica, o el momento de referencia de FR-043 de la 001.
  const ahora = ahoraLocal(contexto, clinica.zona_horaria);
  const hoy = ahora.slice(0, 10);
  const datos = leerDatosPanel(bd, clinica.id, periodoDe(hoy));
  return pagina(vistaAnalitica({ clinica, panel: calcularPanel({ hoy, ahora, ...datos }), momentoFijado }));
}

export const rutasAnalitica = [
  { metodo: 'GET', patron: '/analitica', manejador: analitica },
];
