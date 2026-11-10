// Servidor de las pruebas de interfaz: base temporal, semilla por defecto y reloj fijado (FR-043)
// en el miércoles de la primera semana futura, a las 10:00. Todas las pantallas llevan el aviso.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBd } from '../../src/datos/bd.js';
import { cargar } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { crearServidor } from '../../src/web/servidor.js';

const bd = abrirBd(join(mkdtempSync(join(tmpdir(), 'citaclara-e2e-')), 'e2e.db'));
cargar(bd, generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO }));

crearServidor({ bd, ahora: () => new Date(), momentoFijado: '2026-11-04T10:00' })
  .listen(Number(process.env.PORT), '127.0.0.1');
