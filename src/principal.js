import { mkdirSync } from 'node:fs';
import { abrirBd } from './datos/bd.js';
import { crearServidor } from './web/servidor.js';

const puerto = Number(process.env.PORT ?? 3000);

mkdirSync('datos', { recursive: true });
const bd = abrirBd('datos/citaclara.db');

crearServidor({ bd, ahora: () => new Date() }).listen(puerto, () => {
  console.log(`CitaClara en http://localhost:${puerto}`);
});
