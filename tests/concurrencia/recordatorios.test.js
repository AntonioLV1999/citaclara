import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';
import { ponerCorreo } from '../ayudas/recordatorios.js';

const PROCESOS = 4;
const RONDAS = 1000;
const ADELANTO_MS = 6;
const MOMENTO_FIJADO = '2026-11-02T08:00';
const INICIO = '2026-11-03T10:00';
const TRABAJADOR = fileURLToPath(new URL('./trabajador-recordatorios.js', import.meta.url));

function siguienteMensaje(proceso) {
  return once(proceso, 'message').then(([mensaje]) => mensaje);
}

test('003/H1-E3 003/SC-003 RR1 1.000 rondas de 4 ejecuciones simultáneas: un recordatorio y un fichero por cita', { timeout: 600_000 }, async (t) => {
  const e = crearEscenario();
  const carpeta = mkdtempSync(join(tmpdir(), 'citaclara-salida-'));
  e.a.pacientes.forEach((id, i) => ponerCorreo(e.bd, id, `paciente${i}@example.com`));
  const { NODE_TEST_CONTEXT, ...entorno } = process.env;
  const procesos = Array.from({ length: PROCESOS }, () =>
    fork(TRABAJADOR, [e.ruta, String(e.a.id), MOMENTO_FIJADO, carpeta], { env: entorno }));
  // Tres citas a la vez con tres profesionales: cada ronda las cancela y crea otras en el mismo tramo.
  const plazas = [[e.a.fisio, e.a.sesion], [e.a.fisio2, e.a.sesion], [e.a.nutri, e.a.consulta]];
  const cancelar = e.bd.prepare(`UPDATE cita SET estado = 'cancelada', origen_cancelacion = 'recepcion',
    momento_cancelacion = ? WHERE id = ?`);
  try {
    await Promise.all(procesos.map(siguienteMensaje));

    const victorias = new Map();
    let anteriores = [];
    for (let ronda = 0; ronda < RONDAS; ronda += 1) {
      for (const id of anteriores) cancelar.run(MOMENTO_FIJADO, id);
      const citas = plazas.map(([profesional, servicio], i) => citaDirecta(e.bd, {
        clinica: e.a.id, profesional, servicio, paciente: e.a.pacientes[i], inicio: INICIO,
      }));
      const instante = Date.now() + ADELANTO_MS;
      const respuestas = procesos.map(siguienteMensaje);
      for (const proceso of procesos) proceso.send({ instante });
      const resultados = await Promise.all(respuestas);

      assert.deepEqual(resultados.filter((r) => r.error || r.fallidos), [], `ronda ${ronda}`);
      assert.equal(resultados.reduce((suma, r) => suma + r.enviados, 0), 3, `ronda ${ronda}: ${JSON.stringify(resultados)}`);
      const ficheros = readdirSync(carpeta);
      for (const id of citas) {
        const filas = e.bd.prepare('SELECT count(*) AS n FROM recordatorio WHERE cita_id = ?').get(id).n;
        assert.equal(filas, 1, `ronda ${ronda}, cita ${id}`);
        assert.equal(ficheros.filter((f) => f.startsWith(`recordatorio-${id}-`)).length, 1, `ronda ${ronda}, cita ${id}`);
      }
      resultados.forEach((r, i) => { if (r.enviados) victorias.set(i, (victorias.get(i) ?? 0) + 1); });
      anteriores = citas;
    }

    // Si siempre enviara el mismo proceso, la prueba no demostraría simultaneidad.
    t.diagnostic(`rondas con envíos por proceso: ${JSON.stringify([...victorias])}`);
    assert.ok(victorias.size >= 2, `procesos que enviaron: ${JSON.stringify([...victorias])}`);
    assert.equal(readdirSync(carpeta).length, RONDAS * 3);
  } finally {
    // En Windows el archivo sigue abierto hasta que el proceso termina de verdad.
    await Promise.all(procesos.map((proceso) => {
      const salida = proceso.exitCode === null ? once(proceso, 'exit') : null;
      proceso.kill();
      return salida;
    }));
    e.cerrar();
    rmSync(carpeta, { recursive: true, force: true });
  }
});
