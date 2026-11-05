import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { crearEscenario } from '../ayudas/escenario.js';
import { sumarDias, sumarMinutos, esDiaLaborable } from '../../src/dominio/tiempo.js';

const PROCESOS = 4;
const RONDAS = 1000;
const ADELANTO_MS = 6;
const TRABAJADOR = fileURLToPath(new URL('./trabajador.js', import.meta.url));

/** Cada ronda usa un bloque de dos horas propio: lo único que compite es lo que ocurre en ella. */
function bloques(cantidad) {
  const lista = [];
  for (let dia = '2027-01-04'; lista.length < cantidad; dia = sumarDias(dia, 1)) {
    if (!esDiaLaborable(dia)) continue;
    for (const hora of ['09:00', '11:00', '13:00', '15:00', '17:00']) lista.push(`${dia}T${hora}`);
  }
  return lista.slice(0, cantidad);
}

function siguienteMensaje(proceso) {
  return once(proceso, 'message').then(([mensaje]) => mensaje);
}

test('SC-001 H1-E7 RN1 1.000 rondas simultáneas entre procesos: una sola alta por ronda y cero solapes', { timeout: 300_000 }, async (t) => {
  const e = crearEscenario();
  const { NODE_TEST_CONTEXT, ...entorno } = process.env;
  const procesos = Array.from({ length: PROCESOS }, () => fork(TRABAJADOR, [e.ruta, String(e.a.id)], { env: entorno }));
  try {
    await Promise.all(procesos.map(siguienteMensaje));

    const victorias = new Map();
    const formularioDe = (inicio) => ({
      profesional: e.a.fisio,
      servicio: e.a.primeraFisio,
      paciente: e.a.pacientes[0],
      dia: inicio.slice(0, 10),
      hora: inicio.slice(11, 16),
    });

    for (const [ronda, bloque] of bloques(RONDAS).entries()) {
      const exacto = ronda % 2 === 0;
      const instante = Date.now() + ADELANTO_MS;
      const respuestas = procesos.map(siguienteMensaje);
      procesos.forEach((proceso, i) => {
        // Cruce parcial: 4 citas de 60 minutos separadas 15 minutos se solapan todas entre sí.
        const inicio = exacto ? bloque : sumarMinutos(bloque, i * 15);
        proceso.send({ instante, formulario: formularioDe(inicio) });
      });
      const resultados = await Promise.all(respuestas);

      const ganadores = resultados.flatMap((r, i) => (r.ok ? [i] : []));
      assert.equal(ganadores.length, 1, `ronda ${ronda}: ${JSON.stringify(resultados)}`);
      for (const r of resultados.filter((x) => !x.ok)) {
        assert.equal(r.motivo, 'solape', `ronda ${ronda}: ${JSON.stringify(r)}`);
      }
      victorias.set(ganadores[0], (victorias.get(ganadores[0]) ?? 0) + 1);
    }

    assert.equal(e.bd.prepare('SELECT count(*) AS n FROM cita').get().n, RONDAS);
    const solapes = e.bd.prepare(`
      SELECT count(*) AS n FROM cita a JOIN cita b
        ON a.id < b.id AND a.profesional_id = b.profesional_id AND a.inicio < b.fin AND b.inicio < a.fin
    `).get().n;
    assert.equal(solapes, 0);

    // Si siempre ganara el mismo proceso, la prueba no demostraría simultaneidad.
    t.diagnostic(`victorias por proceso: ${JSON.stringify([...victorias])}`);
    assert.ok(victorias.size >= 2, `ganadores: ${JSON.stringify([...victorias])}`);
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
