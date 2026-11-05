import { buscarPacientes } from '../../datos/pacientes.js';
import { pagina } from '../plantilla.js';
import { vistaResultadosPaciente } from '../vistas/alta.js';

function buscar({ bd, clinica, consulta }) {
  const texto = consulta.q ?? '';
  if (!texto.trim()) return pagina('');
  return pagina(vistaResultadosPaciente(buscarPacientes(bd, clinica.id, texto)));
}

export const rutasPacientes = [
  { metodo: 'GET', patron: '/pacientes/buscar', manejador: buscar },
];
