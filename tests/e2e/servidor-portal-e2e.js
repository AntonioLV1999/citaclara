// Servidor de las pruebas de interfaz del portal (002): base temporal, semilla por defecto y reloj
// fijado (FR-043 de la 001) en el momento de los ejemplos de la spec, el 04/11/2026 a las 12:00.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBd } from '../../src/datos/bd.js';
import { cargar } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { crearServidor } from '../../src/web/servidor.js';

const bd = abrirBd(join(mkdtempSync(join(tmpdir(), 'citaclara-portal-e2e-')), 'e2e.db'));
cargar(bd, generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO }));

crearServidor({
  bd, ahora: () => new Date(), momentoFijado: '2026-11-04T12:00', direccion: 'http://127.0.0.1:3101',
}).listen(Number(process.env.PORT), '127.0.0.1');
