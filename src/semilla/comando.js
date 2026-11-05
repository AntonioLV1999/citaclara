import { mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { abrirBd } from '../datos/bd.js';
import { fecha } from '../dominio/formato.js';
import { diaDeSemana, esFechaValida } from '../dominio/tiempo.js';
import { cargar, resumen } from './carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from './datos-base.js';
import { generar } from './generador.js';

const USO = 'Uso: npm run semilla -- --lunes AAAA-MM-DD';

function leerLunes() {
  let valores;
  try {
    ({ values: valores } = parseArgs({ options: { lunes: { type: 'string', default: LUNES_POR_DEFECTO } } }));
  } catch {
    return { error: `No se entiende ese parámetro. ${USO}` };
  }
  const { lunes } = valores;
  if (!esFechaValida(lunes)) return { error: `«${lunes}» no es una fecha válida. ${USO}` };
  if (diaDeSemana(lunes) !== 1) return { error: `El ${fecha(lunes)} no es lunes. Elige un lunes. ${USO}` };
  return { lunes };
}

const porcentaje = (parte, total) => ((parte / total) * 100).toFixed(1).replace('.', ',');

function imprimir(lunes, r) {
  console.log(`Clínica Eleva · lunes de referencia ${fecha(lunes)}`);
  console.log(`Pacientes: ${r.pacientes} · Citas de historia: ${r.historia}`);
  console.log(`  Completadas: ${r.completadas} (${porcentaje(r.completadas, r.historia)} %) · `
    + `No asistidas: ${r.noAsistidas} (${porcentaje(r.noAsistidas, r.historia)} %) · `
    + `Canceladas: ${r.canceladas} (${porcentaje(r.canceladas, r.historia)} %)`);
  console.log(`Reservas futuras: ${r.futuras}`);
  console.log(`Resumen de contenido: ${r.contenido}`);
  console.log(`Resumen sin fechas: ${r.sinFechas}`);
}

const { lunes, error } = leerLunes();
if (error) {
  console.error(error);
  process.exitCode = 1;
} else {
  const datos = generar({ semilla: SEMILLA, lunes });
  mkdirSync('datos', { recursive: true });
  const bd = abrirBd('datos/citaclara.db');
  cargar(bd, datos);
  bd.close();
  imprimir(lunes, resumen(datos));
}
