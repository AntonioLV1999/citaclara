import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';

const CANALES = ['portal', 'correo', 'portal', 'correo'];
const RONDAS = 1000;
const ADELANTO_MS = 6;
// Dentro del plazo de RN8 de una cita a las 18:00.
const MOMENTO_FIJADO = '2026-11-16T10:00';
const INICIO = '2026-11-16T18:00';
const TRABAJADOR = fileURLToPath(new URL('./trabajador-cancelar.js', import.meta.url));

function siguienteMensaje(proceso) {
  return once(proceso, 'message').then(([mensaje]) => mensaje);
}

test('H6-E9 SC-013 FR-038 1.000 rondas de cancelaciones simultáneas: un solo «cancelada ahora» y un solo origen por ronda', { timeout: 300_000 }, async (t) => {
  const e = crearEscenario();
  const { NODE_TEST_CONTEXT, ...entorno } = process.env;
  const procesos = CANALES.map((canal) =>
    fork(TRABAJADOR, [e.ruta, String(e.a.id), canal, MOMENTO_FIJADO], { env: entorno }));
  try {
    await Promise.all(procesos.map(siguienteMensaje));

    const victorias = new Map();
    const canalesGanadores = new Set();
    for (let ronda = 0; ronda < RONDAS; ronda += 1) {
      // Las canceladas no ocupan: cada ronda puede reservar de nuevo el mismo tramo.
      const citaId = citaDirecta(e.bd, {
        clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: INICIO,
      });
      const instante = Date.now() + ADELANTO_MS;
      const respuestas = procesos.map(siguienteMensaje);
      for (const proceso of procesos) proceso.send({ instante, citaId });
      const resultados = await Promise.all(respuestas);

      const ganadores = resultados.flatMap((r, i) => (r.resultado === 'cancelada_ahora' ? [i] : []));
      assert.equal(ganadores.length, 1, `ronda ${ronda}: ${JSON.stringify(resultados)}`);
      const [ganador] = ganadores;
      const { origen, momento } = resultados[ganador];
      assert.equal(origen, CANALES[ganador]);
      assert.equal(momento, MOMENTO_FIJADO);
      for (const [i, r] of resultados.entries()) {
        if (i === ganador) continue;
        assert.deepEqual(r, { resultado: 'ya_cancelada', origen, momento }, `ronda ${ronda}`);
      }
      const fila = e.bd.prepare('SELECT estado, origen_cancelacion, momento_cancelacion FROM cita WHERE id = ?').get(citaId);
      assert.deepEqual({ ...fila }, { estado: 'cancelada', origen_cancelacion: origen, momento_cancelacion: momento });

      victorias.set(ganador, (victorias.get(ganador) ?? 0) + 1);
      canalesGanadores.add(origen);
    }

    // Si siempre ganara el mismo proceso, la prueba no demostraría simultaneidad.
    t.diagnostic(`victorias por proceso: ${JSON.stringify([...victorias])}`);
    assert.ok(victorias.size >= 2, `ganadores: ${JSON.stringify([...victorias])}`);
    assert.deepEqual([...canalesGanadores].sort(), ['correo', 'portal']);
  } finally {
    // En Windows el archivo sigue abierto hasta que el proceso termina de verdad.
    await Promise.all(procesos.map((proceso) => {
      const salida = proceso.exitCode === null ? once(proceso, 'exit') : null;
      proceso.kill();
      return salida;
    }));
    e.cerrar();
  }
});
