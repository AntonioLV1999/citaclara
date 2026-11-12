// `npm run recordatorios` (003/FR-002): lanza a mano el proceso para todas las clínicas. Repetirlo no
// duplica nada (RR1). Usa los mismos ajustes que el servidor (FR-003), leídos con leerConfiguracion.
import { mkdirSync } from 'node:fs';
import { ConfiguracionNoValida, leerConfiguracion } from './configuracion.js';
import { abrirBd, EsquemaAntiguo } from './datos/bd.js';
import { ejecutarRecordatorios } from './servicios/recordatorios.js';
import { crearEscritorEml } from './servicios/salida-correo.js';

function terminar(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

let configuracion;
try {
  configuracion = leerConfiguracion(process.env);
} catch (error) {
  if (error instanceof ConfiguracionNoValida) terminar(error.message);
  throw error;
}
const { momentoFijado, direccion, smtpConfigurado } = configuracion;

mkdirSync('datos', { recursive: true });
let bd;
try {
  bd = abrirBd('datos/citaclara.db');
} catch (error) {
  if (error instanceof EsquemaAntiguo) terminar(error.message);
  throw error;
}

const resumenes = ejecutarRecordatorios({ bd, ahora: () => new Date(), momentoFijado }, {
  direccion, enviar: crearEscritorEml(), smtpConfigurado,
});
bd.close();
// Código 1 si alguna cita ha fallado, para que quien lo lance lo note (contracts/proceso-recordatorios.md).
process.exitCode = resumenes.some((r) => r.fallidos > 0) ? 1 : 0;
