// Servidor de las pruebas de interfaz de la cancelación desde el correo (003): base temporal, semilla por
// defecto y el mismo reloj fijado que el de recepción, el 04/11/2026 a las 10:00. Es aparte porque
// cancelar desde el correo llena la lista de huecos liberados de la 002, que cambiaría lo que ven los
// tests de la 001.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBd } from '../../src/datos/bd.js';
import { cargar } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { ejecutarRecordatorios } from '../../src/servicios/recordatorios.js';
import { crearServidor } from '../../src/web/servidor.js';
import { ENLACES_E2E } from './enlaces-e2e.js';

const MOMENTO = '2026-11-04T10:00';
const bd = abrirBd(join(mkdtempSync(join(tmpdir(), 'citaclara-correo-e2e-')), 'e2e.db'));
cargar(bd, generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO }));

// Los recordatorios del 04/11/2026 y del 05/11/2026, como los habrían enviado las ejecuciones de sus
// vísperas. Los enlaces se guardan por paciente para cancelar-correo.spec.js.
const enlaces = {};
for (const momentoFijado of ['2026-11-03T08:00', '2026-11-04T08:00']) {
  ejecutarRecordatorios({ bd, ahora: () => new Date(), momentoFijado }, {
    direccion: `http://127.0.0.1:${process.env.PORT}`,
    registro: null,
    salida: () => {},
    enviar: ({ texto }) => {
      const nombre = texto.match(/\r\nHola, (.+):\r\n/)[1];
      enlaces[nombre] = texto.match(/\/e\/[0-9a-f]{32}/)[0];
    },
  });
}
writeFileSync(ENLACES_E2E, JSON.stringify(enlaces, null, 2));

crearServidor({
  bd, ahora: () => new Date(), momentoFijado: MOMENTO, direccion: `http://127.0.0.1:${process.env.PORT}`,
}).listen(Number(process.env.PORT), '127.0.0.1');
