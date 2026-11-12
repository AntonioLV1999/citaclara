import { mkdirSync } from 'node:fs';
import { ConfiguracionNoValida, leerConfiguracion } from './configuracion.js';
import { abrirBd, EsquemaAntiguo } from './datos/bd.js';
import { todasLasClinicas } from './datos/catalogo.js';
import { programarRecordatorios } from './servicios/programador.js';
import { ejecutarRecordatorios } from './servicios/recordatorios.js';
import { crearEscritorEml } from './servicios/salida-correo.js';
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
const {
  momentoFijado, direccion, puerto, smtpConfigurado,
} = configuracion;

mkdirSync('datos', { recursive: true });
let bd;
try {
  bd = abrirBd('datos/citaclara.db');
} catch (error) {
  if (error instanceof EsquemaAntiguo) terminar(error.message);
  throw error;
}

const contexto = { bd, ahora: () => new Date(), momentoFijado };
crearServidor({ ...contexto, direccion }).listen(puerto, () => {
  console.log(`CitaClara en http://localhost:${puerto}`);
});

// 003/FR-001: los recordatorios salen solos a las 08:00 de cada clínica. Solo los arranca este archivo:
// los servidores de los tests no tienen programador.
const enviar = crearEscritorEml();
programarRecordatorios({
  contexto,
  clinicas: () => todasLasClinicas(bd),
  relojReal: () => new Date(),
  ejecutar: (ctx, clinica) => ejecutarRecordatorios(ctx, {
    clinicas: [clinica], direccion, enviar, smtpConfigurado,
  }),
});
