// Proceso hijo del test 004/SC-002: recepción cierra citas, con su propia conexión al archivo
// compartido, mientras el proceso principal abre el panel.
import { setTimeout as esperar } from 'node:timers/promises';
import { abrirBd } from '../../src/datos/bd.js';
import { cambiarEstado } from '../../src/datos/citas.js';

const [ruta] = process.argv.slice(2);
const bd = abrirBd(ruta);

process.on('message', async ({ ids, pausaMs }) => {
  if (!ids) {
    bd.close();
    process.disconnect();
    return;
  }
  for (const id of ids) {
    cambiarEstado(bd, id, 'completada');
    process.send({ cerrada: id });
    await esperar(pausaMs);
  }
  process.send({ fin: true });
});

process.send({ listo: true });
