import { mkdirSync } from 'node:fs';
import { abrirBd, EsquemaAntiguo } from './datos/bd.js';
import { esDireccionValida } from './dominio/direccion.js';
import { esMomentoValido } from './dominio/tiempo.js';
import { crearServidor } from './web/servidor.js';

const MOMENTO_NO_VALIDO = 'El momento de referencia CITACLARA_AHORA no es válido. '
  + 'Escríbelo como AAAA-MM-DDTHH:MM, por ejemplo 2026-11-04T12:00.';
const DIRECCION_NO_VALIDA = 'La dirección pública CITACLARA_DIRECCION no es válida. '
  + 'Escríbela como http://… o https://…, sin barra al final, por ejemplo https://citas.example.com.';

function terminar(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

const puerto = Number(process.env.PORT ?? 3000);

// FR-043: se comprueba antes de tocar nada; con un valor mal escrito el servidor no arranca.
const momentoFijado = process.env.CITACLARA_AHORA || null;
if (momentoFijado !== null && !esMomentoValido(momentoFijado)) terminar(MOMENTO_NO_VALIDO);

// FR-042: dirección pública de la que cuelgan los enlaces de paciente. Igual que el momento.
const direccion = process.env.CITACLARA_DIRECCION || `http://localhost:${puerto}`;
if (!esDireccionValida(direccion)) terminar(DIRECCION_NO_VALIDA);

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
