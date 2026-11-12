import { mkdirSync } from 'node:fs';
import { ConfiguracionNoValida, leerConfiguracion } from './configuracion.js';
import { abrirBd, EsquemaAntiguo } from './datos/bd.js';
import { crearServidor } from './web/servidor.js';

function terminar(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

// FR-042 y FR-043: se comprueba antes de tocar nada; con un valor mal escrito el servidor no arranca.
let configuracion;
try {
  configuracion = leerConfiguracion(process.env);
} catch (error) {
  if (error instanceof ConfiguracionNoValida) terminar(error.message);
  throw error;
}
const { momentoFijado, direccion, puerto } = configuracion;

mkdirSync('datos', { recursive: true });
let bd;
try {
  bd = abrirBd('datos/citaclara.db');
} catch (error) {
  if (error instanceof EsquemaAntiguo) terminar(error.message);
  throw error;
}

crearServidor({ bd, ahora: () => new Date(), momentoFijado, direccion }).listen(puerto, () => {
  console.log(`CitaClara en http://localhost:${puerto}`);
});
