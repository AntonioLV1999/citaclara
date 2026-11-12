// Proceso hijo del test SC-003: una conexión propia al archivo compartido y la carpeta de salida común.
import { abrirBd } from '../../src/datos/bd.js';
import { clinicaPorId } from '../../src/datos/catalogo.js';
import { ejecutarRecordatorios } from '../../src/servicios/recordatorios.js';
import { crearEscritorEml } from '../../src/servicios/salida-correo.js';

const [ruta, clinicaId, momentoFijado, carpeta] = process.argv.slice(2);
const bd = abrirBd(ruta);
const contexto = { bd, ahora: () => new Date(), momentoFijado };
const opciones = {
  clinicas: [clinicaPorId(bd, Number(clinicaId))],
  direccion: 'http://localhost:3000',
  enviar: crearEscritorEml(carpeta),
  registro: null,
  salida: () => {},
};

process.on('message', ({ instante }) => {
  // Barrera: todos los procesos esperan activamente hasta el mismo instante.
  while (Date.now() < instante);
  try {
    const [{ enviados, fallidos }] = ejecutarRecordatorios(contexto, opciones);
    process.send({ enviados, fallidos });
  } catch (error) {
    process.send({ error: error.message });
  }
});

process.send({ listo: true });
