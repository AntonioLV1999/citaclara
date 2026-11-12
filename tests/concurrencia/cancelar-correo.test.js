import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';
import { ejecutarEnMemoria, ponerCorreo, tokenDe } from '../ayudas/recordatorios.js';
import { esDiaLaborable, sumarDias, sumarMinutos } from '../../src/dominio/tiempo.js';

const RONDAS = 1000;
const ADELANTO_MS = 8;
// El «ahora» del servidor que cancela y de trabajador.js: todos los bloques quedan dentro del plazo de RN8.
const AHORA = '2026-11-09T08:00';
const CANCELAR = fileURLToPath(new URL('./trabajador-cancelar-correo.js', import.meta.url));
const RESERVAR = fileURLToPath(new URL('./trabajador.js', import.meta.url));

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

function solapes(bd) {
  return bd.prepare(`
    SELECT count(*) AS n FROM cita a JOIN cita b
      ON a.id < b.id AND a.profesional_id = b.profesional_id AND a.inicio < b.fin AND b.inicio < a.fin
    WHERE a.estado IN ('reservada', 'completada') AND b.estado IN ('reservada', 'completada')
  `).get().n;
}

test('003/FR-024 RR4 RN1 1.000 rondas de reservas a la vez que se cancela desde el correo: cero solapes y como mucho una reserva por tramo', { timeout: 600_000 }, async (t) => {
  const e = crearEscenario();
  const [paciente, otro] = e.a.pacientes;
  ponerCorreo(e.bd, paciente, 'ana@example.com');
  const { NODE_TEST_CONTEXT, ...entorno } = process.env;
  const cancelador = fork(CANCELAR, [e.ruta, AHORA], { env: entorno });
  const reservas = Array.from({ length: 3 }, () => fork(RESERVAR, [e.ruta, String(e.a.id)], { env: entorno }));
  const procesos = [cancelador, ...reservas];
  try {
    await Promise.all(procesos.map(siguienteMensaje));
    let conReserva = 0;

    for (const [ronda, bloque] of bloques(RONDAS).entries()) {
      const citaId = citaDirecta(e.bd, {
        clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.primeraFisio, paciente, inicio: bloque,
      });
      // El enlace es el del recordatorio de verdad, enviado la víspera.
      const { mensajes } = ejecutarEnMemoria(e.bd, `${sumarDias(bloque.slice(0, 10), -1)}T08:00`, { clinicas: [e.a] });
      assert.deepEqual(mensajes.map((m) => m.citaId), [citaId], `ronda ${ronda}`);

      const instante = Date.now() + ADELANTO_MS;
      const respuestas = procesos.map(siguienteMensaje);
      cancelador.send({ instante, token: tokenDe(mensajes[0]) });
      // El mismo tramo y dos que se cruzan con él: tres citas de 60 minutos que se solapan entre sí.
      reservas.forEach((proceso, i) => proceso.send({
        instante,
        formulario: {
          profesional: e.a.fisio, servicio: e.a.primeraFisio, paciente: otro, dia: bloque.slice(0, 10), hora: sumarMinutos(bloque, i * 15).slice(11),
        },
      }));
      const [cancelacion, ...resultados] = await Promise.all(respuestas);

      assert.deepEqual(cancelacion, { estado: 200, cancelada: true }, `ronda ${ronda}`);
      const ganadores = resultados.filter((r) => r.ok);
      assert.ok(ganadores.length <= 1, `ronda ${ronda}: ${JSON.stringify(resultados)}`);
      for (const r of resultados.filter((x) => !x.ok)) assert.equal(r.motivo, 'solape', `ronda ${ronda}: ${JSON.stringify(r)}`);
      if (ganadores.length === 1) {
        // La reserva solo prospera si la cancelación ya está registrada en la base.
        conReserva += 1;
        assert.equal(e.bd.prepare('SELECT origen_cancelacion FROM cita WHERE id = ?').get(citaId).origen_cancelacion, 'correo');
      }
      assert.equal(solapes(e.bd), 0, `ronda ${ronda}`);
    }

    t.diagnostic(`rondas en las que una reserva llegó tras la cancelación: ${conReserva} de ${RONDAS}`);
    // Si siempre ganara uno de los dos lados, la prueba no demostraría simultaneidad.
    assert.ok(conReserva > 0 && conReserva < RONDAS, `rondas con reserva: ${conReserva}`);
    assert.equal(e.bd.prepare("SELECT count(*) AS n FROM cita WHERE origen_cancelacion = 'correo'").get().n, RONDAS);
    assert.equal(solapes(e.bd), 0);
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
