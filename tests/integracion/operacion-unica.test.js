import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';
import { cambiarEstado } from '../../src/datos/citas.js';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

function archivosDeSrc() {
  return readdirSync(SRC, { recursive: true })
    .filter((archivo) => /\.(js|sql)$/.test(archivo))
    .map((archivo) => ({ archivo: archivo.replaceAll('\\', '/'), texto: readFileSync(join(SRC, archivo), 'utf8') }));
}

test('FR-038 SC-013 solo el servicio de cancelar importa la escritura de la cancelación', () => {
  const importan = archivosDeSrc()
    .filter(({ texto }) => /import\s*\{[^}]*\bregistrarCancelacion\b[^}]*\}/.test(texto))
    .map(({ archivo }) => archivo);
  assert.deepEqual(importan, ['servicios/cancelar.js']);
  const nombran = archivosDeSrc()
    .filter(({ texto }) => /\bregistrarCancelacion\b/.test(texto))
    .map(({ archivo }) => archivo)
    .sort();
  assert.deepEqual(nombran, ['datos/citas.js', 'servicios/cancelar.js']);
});

test('FR-038 SC-013 ningún archivo de src salvo datos/citas.js actualiza la tabla de citas', () => {
  const actualizan = archivosDeSrc()
    .filter(({ texto }) => /\bUPDATE\s+cita\b/i.test(texto))
    .map(({ archivo }) => archivo);
  assert.deepEqual(actualizan, ['datos/citas.js']);
});

test('FR-038 cambiarEstado no admite cancelar, y la cita no cambia', () => {
  const e = crearEscenario();
  try {
    const id = citaDirecta(e.bd, {
      clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: '2026-11-16T10:00',
    });
    const antes = e.bd.prepare('SELECT * FROM cita WHERE id = ?').get(id);
    for (const estado of ['cancelada', 'reservada', 'pendiente']) {
      assert.throws(() => cambiarEstado(e.bd, id, estado), estado);
    }
    assert.deepEqual(e.bd.prepare('SELECT * FROM cita WHERE id = ?').get(id), antes);
  } finally {
    e.cerrar();
  }
});
