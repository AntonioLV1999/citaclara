import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const ESQUEMA = readFileSync(new URL('./esquema.sql', import.meta.url), 'utf8');

export function abrirBd(ruta) {
  const bd = new DatabaseSync(ruta);
  bd.exec('PRAGMA busy_timeout = 5000');
  bd.exec('PRAGMA journal_mode = WAL');
  bd.exec('PRAGMA foreign_keys = ON');
  bd.exec(ESQUEMA);
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
