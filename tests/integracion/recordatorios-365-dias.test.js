import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citaDirecta, crearEscenario } from '../ayudas/escenario.js';
import { ejecutarEnMemoria, ponerCorreo } from '../ayudas/recordatorios.js';
import { sumarDias } from '../../src/dominio/tiempo.js';

const PRIMER_DIA = '2026-11-02';
const ULTIMO_DIA = '2027-11-01';

test('003/SC-004 003/FR-004 RR3 365 ejecuciones diarias, con los dos cambios de hora, en la península y en Canarias: cada cita, un recordatorio', { timeout: 120_000 }, () => {
  const e = crearEscenario();
  try {
    const clinicas = [e.a, e.b];
    for (const c of clinicas) ponerCorreo(e.bd, c.pacientes[0], `paciente-${c.id}@example.com`);

    // Para cada día de ejecución, dos citas del día siguiente: la primera y la última del horario.
    const dias = [];
    for (let dia = PRIMER_DIA; dia <= ULTIMO_DIA; dia = sumarDias(dia, 1)) dias.push(dia);
    assert.equal(dias.length, 365);
    assert.ok(dias.includes('2027-03-28') && dias.includes('2027-10-31'));
    const citasDelDia = new Map();
    for (const dia of dias) {
      const siguiente = sumarDias(dia, 1);
      citasDelDia.set(dia, clinicas.flatMap((c) => ['09:00', '19:45'].map((hora) => citaDirecta(e.bd, {
        clinica: c.id, profesional: c.nutri, servicio: c.consulta, paciente: c.pacientes[0], inicio: `${siguiente}T${hora}`,
      }))));
    }

    for (const dia of dias) {
      const { mensajes } = ejecutarEnMemoria(e.bd, `${dia}T08:00`, { clinicas });
      assert.deepEqual(mensajes.map((m) => m.citaId).sort((x, y) => x - y), [...citasDelDia.get(dia)].sort((x, y) => x - y), dia);
    }

    const porCita = e.bd.prepare('SELECT cita.id, count(recordatorio.cita_id) AS n FROM cita LEFT JOIN recordatorio ON recordatorio.cita_id = cita.id GROUP BY cita.id').all();
    assert.equal(porCita.length, 365 * 4);
    assert.deepEqual(porCita.filter((f) => f.n !== 1), []);
  } finally {
    e.cerrar();
  }
});
