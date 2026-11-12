import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { clinicaPorId } from '../../src/datos/catalogo.js';
import { cancelarCita } from '../../src/servicios/cancelar.js';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';
import { esDiaLaborable, sumarDias, sumarMinutos } from '../../src/dominio/tiempo.js';

const RONDAS = 1000;
const ADELANTO_MS = 6;
// El «ahora» de trabajador.js: todos los bloques son posteriores y quedan dentro del plazo de RN8.
const AHORA = '2026-11-09T08:00';
const RESERVAR = fileURLToPath(new URL('./trabajador.js', import.meta.url));
const CANCELAR = fileURLToPath(new URL('./trabajador-cancelar.js', import.meta.url));

/** Cada ronda usa un bloque de dos horas propio: lo único que compite es lo que ocurre en ella. */
function bloques(cantidad) {
  const lista = [];
  for (let dia = '2027-01-04'; lista.length < cantidad; dia = sumarDias(dia, 1)) {
    if (!esDiaLaborable(dia)) continue;
    for (const hora of ['09:00', '11:00', '13:00', '15:00', '17:00']) lista.push(`${dia}T${hora}`);
  }
  return lista.slice(0, cantidad);
}

const siguienteMensaje = (proceso) => once(proceso, 'message').then(([mensaje]) => mensaje);

async function terminar(procesos, e) {
  // En Windows el archivo sigue abierto hasta que el proceso termina de verdad.
  await Promise.all(procesos.map((proceso) => {
    const salida = proceso.exitCode === null ? once(proceso, 'exit') : null;
    proceso.kill();
    return salida;
  }));
  e.cerrar();
}

function solapes(bd) {
  return bd.prepare(`
    SELECT count(*) AS n FROM cita a JOIN cita b
      ON a.id < b.id AND a.profesional_id = b.profesional_id AND a.inicio < b.fin AND b.inicio < a.fin
    WHERE a.estado IN ('reservada', 'completada') AND b.estado IN ('reservada', 'completada')
  `).get().n;
}

const formularioDe = (e, inicio) => ({
  profesional: e.a.fisio, servicio: e.a.primeraFisio, paciente: e.a.pacientes[1], dia: inicio.slice(0, 10), hora: inicio.slice(11, 16),
});
const citaReservada = (e, inicio) => citaDirecta(e.bd, {
  clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.primeraFisio, paciente: e.a.pacientes[0], inicio,
});

test('002/SC-005 002/H4-E3 RN1 1.000 rondas de reservas simultáneas sobre un tramo recién liberado por el portal: una sola prospera', { timeout: 300_000 }, async (t) => {
  const e = crearEscenario();
  const { NODE_TEST_CONTEXT, ...entorno } = process.env;
  const procesos = Array.from({ length: 4 }, () => fork(RESERVAR, [e.ruta, String(e.a.id)], { env: entorno }));
  const contexto = { bd: e.bd, clinica: clinicaPorId(e.bd, e.a.id), ahora: () => new Date(), momentoFijado: AHORA };
  try {
    await Promise.all(procesos.map(siguienteMensaje));
    const victorias = new Map();

    for (const [ronda, bloque] of bloques(RONDAS).entries()) {
      const liberada = citaReservada(e, bloque);
      assert.equal(cancelarCita(contexto, liberada, 'portal').resultado, 'cancelada_ahora');

      const exacto = ronda % 2 === 0;
      const instante = Date.now() + ADELANTO_MS;
      const respuestas = procesos.map(siguienteMensaje);
      procesos.forEach((proceso, i) => {
        // Cruce parcial: 4 citas de 60 minutos separadas 15 minutos se solapan todas entre sí.
        proceso.send({ instante, formulario: formularioDe(e, exacto ? bloque : sumarMinutos(bloque, i * 15)) });
      });
      const resultados = await Promise.all(respuestas);

      const ganadores = resultados.flatMap((r, i) => (r.ok ? [i] : []));
      assert.equal(ganadores.length, 1, `ronda ${ronda}: ${JSON.stringify(resultados)}`);
      for (const r of resultados.filter((x) => !x.ok)) assert.equal(r.motivo, 'solape', `ronda ${ronda}: ${JSON.stringify(r)}`);
      victorias.set(ganadores[0], (victorias.get(ganadores[0]) ?? 0) + 1);
    }

    assert.equal(solapes(e.bd), 0);
    assert.equal(e.bd.prepare("SELECT count(*) AS n FROM cita WHERE estado = 'reservada'").get().n, RONDAS);
    t.diagnostic(`victorias por proceso: ${JSON.stringify([...victorias])}`);
    assert.ok(victorias.size >= 2, `ganadores: ${JSON.stringify([...victorias])}`);
  } finally {
    await terminar(procesos, e);
  }
});

test('002/SC-005 002/H4-E4 1.000 rondas de reservas a la vez que la cancelación del portal: cero solapes', { timeout: 300_000 }, async (t) => {
  const e = crearEscenario();
  const { NODE_TEST_CONTEXT, ...entorno } = process.env;
  const cancelador = fork(CANCELAR, [e.ruta, String(e.a.id), 'portal', AHORA], { env: entorno });
  const reservas = Array.from({ length: 3 }, () => fork(RESERVAR, [e.ruta, String(e.a.id)], { env: entorno }));
  const procesos = [cancelador, ...reservas];
  try {
    await Promise.all(procesos.map(siguienteMensaje));
    let conReserva = 0;

    for (const [ronda, bloque] of bloques(RONDAS).entries()) {
      const citaId = citaReservada(e, bloque);
      const instante = Date.now() + ADELANTO_MS;
      const respuestas = procesos.map(siguienteMensaje);
      cancelador.send({ instante, citaId });
      for (const proceso of reservas) proceso.send({ instante, formulario: formularioDe(e, bloque) });
      const [cancelacion, ...resultados] = await Promise.all(respuestas);

      assert.equal(cancelacion.resultado, 'cancelada_ahora', `ronda ${ronda}: ${JSON.stringify(cancelacion)}`);
      const ganadores = resultados.filter((r) => r.ok);
      assert.ok(ganadores.length <= 1, `ronda ${ronda}: ${JSON.stringify(resultados)}`);
      for (const r of resultados.filter((x) => !x.ok)) assert.equal(r.motivo, 'solape', `ronda ${ronda}: ${JSON.stringify(r)}`);
      if (ganadores.length === 1) {
        // La reserva solo prospera si la cancelación ya está registrada en la base.
        conReserva += 1;
        assert.equal(e.bd.prepare('SELECT estado FROM cita WHERE id = ?').get(citaId).estado, 'cancelada');
      }
      assert.equal(solapes(e.bd), 0, `ronda ${ronda}`);
    }

    t.diagnostic(`rondas en las que una reserva llegó tras la cancelación: ${conReserva} de ${RONDAS}`);
    // Si siempre ganara uno de los dos lados, la prueba no demostraría simultaneidad.
    assert.ok(conReserva > 0 && conReserva < RONDAS, `rondas con reserva: ${conReserva}`);
    assert.equal(solapes(e.bd), 0);
  } finally {
    await terminar(procesos, e);
  }
});
