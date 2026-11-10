// Proceso hijo del test SC-013: una conexión propia al archivo compartido y un canal fijo.
import { abrirBd } from '../../src/datos/bd.js';
import { clinicaPorId } from '../../src/datos/catalogo.js';
import { cancelarCita } from '../../src/servicios/cancelar.js';

const [ruta, clinicaId, canal, momentoFijado] = process.argv.slice(2);
const bd = abrirBd(ruta);
const contexto = { bd, clinica: clinicaPorId(bd, Number(clinicaId)), ahora: () => new Date(), momentoFijado };

process.on('message', ({ instante, citaId }) => {
  // Barrera: todos los procesos esperan activamente hasta el mismo instante.
  while (Date.now() < instante);
  try {
    const { resultado, origen, momento } = cancelarCita(contexto, citaId, canal);
    process.send({ resultado, origen, momento });
  } catch (error) {
    process.send({ resultado: 'error', detalle: error.message });
  }
});

process.send({ listo: true });
