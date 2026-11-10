import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const ESQUEMA = readFileSync(new URL('./esquema.sql', import.meta.url), 'utf8');
export const VERSION_ESQUEMA = 2;

/** El archivo de datos es de otra versión del esquema: no se migra, se regenera con la semilla. */
export class EsquemaAntiguo extends Error {
  constructor(ruta) {
    super(`El archivo de datos ${ruta} es de una versión anterior de CitaClara y no se puede usar. `
      + 'Bórralo y ejecuta npm run semilla para crearlo de nuevo.');
    this.name = 'EsquemaAntiguo';
  }
}

const hayTablas = (bd) =>
  bd.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get().n > 0;

/** Comprueba la versión antes de cualquier cosa que escriba en el archivo, como pasar a WAL. */
function comprobarVersion(bd, ruta) {
  if (!hayTablas(bd)) return;
  if (bd.prepare('PRAGMA user_version').get().user_version !== VERSION_ESQUEMA) {
    bd.close();
    throw new EsquemaAntiguo(ruta);
  }
}

export function abrirBd(ruta) {
  const bd = new DatabaseSync(ruta);
  bd.exec('PRAGMA busy_timeout = 5000');
  comprobarVersion(bd, ruta);
  bd.exec('PRAGMA journal_mode = WAL');
  bd.exec('PRAGMA foreign_keys = ON');
  // Esquema y versión en una sola transacción: otro proceso nunca ve tablas sin versión.
  transaccionInmediata(bd, () => {
    if (hayTablas(bd)) return;
    bd.exec(ESQUEMA);
    bd.exec(`PRAGMA user_version = ${VERSION_ESQUEMA}`);
  });
  return bd;
}

/** `BEGIN IMMEDIATE` toma el único turno de escritura antes de leer: nada se intercala (RN1). */
export function transaccionInmediata(bd, fn) {
  bd.exec('BEGIN IMMEDIATE');
  try {
    const resultado = fn();
    bd.exec('COMMIT');
    return resultado;
  } catch (error) {
    if (bd.isTransaction) bd.exec('ROLLBACK');
    throw error;
  }
}
