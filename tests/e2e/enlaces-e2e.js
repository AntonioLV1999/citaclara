// Archivo en el que servidor-e2e.js deja los enlaces de cancelación de sus recordatorios (003).
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const ENLACES_E2E = join(tmpdir(), 'citaclara-e2e-enlaces.json');
