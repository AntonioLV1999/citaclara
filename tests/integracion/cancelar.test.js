import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { citaDirecta, crearEscenario, relojFijo } from '../ayudas/escenario.js';
import { citaQueSolapa } from '../../src/datos/citas.js';
import { cancelarCita } from '../../src/servicios/cancelar.js';

// Lunes futuro, en horario de invierno peninsular (UTC+1).
const LUNES = '2026-11-16';
const A_LAS_18 = `${LUNES}T18:00`;
const CANALES_DEL_PACIENTE = ['portal', 'correo'];
let e;

beforeEach(() => { e = crearEscenario(); });
afterEach(() => e.cerrar());

/** Cita reservada nueva; las canceladas no ocupan, así que el mismo tramo se puede repetir. */
function nueva(inicio = A_LAS_18, clinica = e.a) {
  return citaDirecta(e.bd, {
    clinica: clinica.id, profesional: clinica.fisio, servicio: clinica.sesion, paciente: clinica.pacientes[0], inicio,
  });
}

const contexto = (reloj, { clinica = e.a, momentoFijado = null } = {}) =>
  ({ bd: e.bd, clinica, ahora: relojFijo(reloj), momentoFijado });
const fila = (id) => e.bd.prepare('SELECT * FROM cita WHERE id = ?').get(id);
const invierno = (horaLocal, dia = LUNES) => `${dia}T${horaLocal}+01:00`;

function aceptada(r, id, origen, momento) {
  assert.equal(r.resultado, 'cancelada_ahora', JSON.stringify(r));
  assert.equal(r.origen, origen);
  assert.equal(r.momento, momento);
  assert.equal(r.cita.id, id);
  const guardada = fila(id);
  assert.deepEqual(
    [guardada.estado, guardada.origen_cancelacion, guardada.momento_cancelacion],
    ['cancelada', origen, momento],
  );
}

function fueraDePlazo(r, id, limite) {
  assert.equal(r.resultado, 'fuera_de_plazo', JSON.stringify(r));
  assert.equal(r.limite, limite);
  assert.equal(r.cita.id, id);
  const guardada = fila(id);
  assert.deepEqual(
    [guardada.estado, guardada.origen_cancelacion, guardada.momento_cancelacion],
    ['reservada', null, null],
  );
}

describe('RN8 plazo del paciente', () => {
  for (const canal of CANALES_DEL_PACIENTE) {
    test(`H6-E1 RN8 a las 15:59 se acepta por ${canal} y el tramo queda libre`, () => {
      const id = nueva();
      aceptada(cancelarCita(contexto(invierno('15:59:00')), id, canal), id, canal, `${LUNES}T15:59`);
      assert.equal(citaQueSolapa(e.bd, e.a.fisio, A_LAS_18, `${LUNES}T18:45`), undefined);
    });

    test(`H6-E2 RN8 el minuto límite entra entero por ${canal}: 16:00:00 y 16:00:59`, () => {
      for (const segundos of ['00', '59']) {
        const id = nueva();
        aceptada(cancelarCita(contexto(invierno(`16:00:${segundos}`)), id, canal), id, canal, `${LUNES}T16:00`);
      }
    });

    test(`H6-E3 RN8 desde las 16:01 se rechaza por ${canal}, sin origen ni momento`, () => {
      const id = nueva();
      for (const horaLocal of ['16:01:00', '17:30:00', '18:05:00']) {
        fueraDePlazo(cancelarCita(contexto(invierno(horaLocal)), id, canal), id, `${LUNES}T16:00`);
      }
    });
  }

  test('H6-E4 RN5 recepción cancela a las 17:59 y con la cita ya empezada', () => {
    for (const horaLocal of ['17:59:00', '18:30:00']) {
      const id = nueva();
      aceptada(cancelarCita(contexto(invierno(horaLocal)), id, 'recepcion'), id, 'recepcion', `${LUNES}T${horaLocal.slice(0, 5)}`);
    }
  });
});

describe('H6-E5 RN8 FR-025 el día siguiente al cambio de hora de primavera', () => {
  const INICIO = '2027-03-29T09:00';
  const casos = [
    ['Europe/Madrid', () => e.a, '+02:00'],
    ['Atlantic/Canary', () => e.b, '+01:00'],
  ];
  for (const [zona, clinicaDe, desfase] of casos) {
    test(`H6-E5 RN8 en ${zona}, a las 07:00 se acepta y a las 07:01 se rechaza`, () => {
      const clinica = clinicaDe();
      for (const canal of CANALES_DEL_PACIENTE) {
        const id = nueva(INICIO, clinica);
        fueraDePlazo(cancelarCita(contexto(`2027-03-29T07:01:00${desfase}`, { clinica }), id, canal), id, '2027-03-29T07:00');
        aceptada(cancelarCita(contexto(`2027-03-29T07:00:00${desfase}`, { clinica }), id, canal), id, canal, '2027-03-29T07:00');
      }
    });
  }
});

describe('SC-010 el portal y el correo se resuelven igual', () => {
  // [día de la cita, desfase de ese día, hora local del intento, resultado esperado]
  const tabla = [];
  for (const [dia, desfase] of [[LUNES, '+01:00'], ['2026-10-23', '+02:00'], ['2026-10-26', '+01:00']]) {
    for (const [horaLocal, resultado] of [
      ['15:59:00', 'cancelada_ahora'], ['16:00:00', 'cancelada_ahora'], ['16:00:59', 'cancelada_ahora'],
      ['16:01:00', 'fuera_de_plazo'], ['17:59:00', 'fuera_de_plazo'], ['18:00:00', 'fuera_de_plazo'],
    ]) tabla.push([dia, desfase, horaLocal, resultado]);
  }

  test('SC-010 RN8 la misma tabla de casos da lo mismo por los dos canales, a ambos lados del cambio de hora', () => {
    for (const [dia, desfase, horaLocal, esperado] of tabla) {
      const porCanal = CANALES_DEL_PACIENTE.map((canal) => {
        const id = nueva(`${dia}T18:00`);
        const r = cancelarCita(contexto(`${dia}T${horaLocal}${desfase}`), id, canal);
        // Libera el tramo para el caso siguiente, también si el paciente llegó tarde.
        cancelarCita(contexto(`${dia}T${horaLocal}${desfase}`), id, 'recepcion');
        return [r.resultado, r.limite ?? r.momento];
      });
      assert.equal(porCanal[0][0], esperado, `${dia} ${horaLocal}`);
      assert.deepEqual(porCanal[0], porCanal[1], `${dia} ${horaLocal}`);
    }
  });
});

describe('FR-043 con el reloj fijado', () => {
  test('FR-043 RN8 a las 16:00 fijadas se acepta y se registra ese momento; a las 16:01, no', () => {
    const reloj = invierno('09:00:00', '2026-11-20');
    const tarde = nueva();
    fueraDePlazo(
      cancelarCita(contexto(reloj, { momentoFijado: `${LUNES}T16:01` }), tarde, 'portal'),
      tarde,
      `${LUNES}T16:00`,
    );
    aceptada(cancelarCita(contexto(reloj, { momentoFijado: `${LUNES}T16:00` }), tarde, 'portal'), tarde, 'portal', `${LUNES}T16:00`);
  });

  test('FR-043 FR-036 recepción registra el momento fijado', () => {
    const id = nueva();
    const r = cancelarCita(contexto(invierno('09:00:00', '2026-11-20'), { momentoFijado: '2026-11-04T12:00' }), id, 'recepcion');
    aceptada(r, id, 'recepcion', '2026-11-04T12:00');
  });
});

describe('FR-038 orden de los resultados', () => {
  test('FR-038 una cita ya cancelada da ya_cancelada con su origen y su momento, aunque esté fuera de plazo', () => {
    const id = nueva();
    cancelarCita(contexto(invierno('10:00:00')), id, 'correo');
    for (const canal of ['portal', 'correo', 'recepcion']) {
      const r = cancelarCita(contexto(invierno('17:30:00')), id, canal);
      assert.equal(r.resultado, 'ya_cancelada');
      assert.equal(r.origen, 'correo');
      assert.equal(r.momento, `${LUNES}T10:00`);
      assert.equal(r.cita.id, id);
    }
  });

  for (const estado of ['completada', 'no_asistida']) {
    test(`FR-038 una cita ${estado} da no_cancelable con su estado, aunque esté fuera de plazo`, () => {
      const id = nueva();
      e.bd.prepare('UPDATE cita SET estado = ? WHERE id = ?').run(estado, id);
      for (const canal of ['portal', 'correo', 'recepcion']) {
        const r = cancelarCita(contexto(invierno('19:00:00')), id, canal);
        assert.equal(r.resultado, 'no_cancelable');
        assert.equal(r.estado, estado);
        assert.equal(r.cita.id, id);
      }
    });
  }

  test('H6-E8 FR-036 tras un resultado distinto de cancelada_ahora la fila queda idéntica', () => {
    const casos = [];
    const yaCancelada = nueva();
    cancelarCita(contexto(invierno('10:00:00')), yaCancelada, 'portal');
    casos.push([yaCancelada, 'correo', invierno('11:00:00')]);
    for (const [estado, horaInicio] of [['completada', '10:00'], ['no_asistida', '12:00']]) {
      const id = nueva(`${LUNES}T${horaInicio}`);
      e.bd.prepare('UPDATE cita SET estado = ? WHERE id = ?').run(estado, id);
      casos.push([id, 'portal', invierno('19:00:00')]);
    }
    const tarde = nueva();
    casos.push([tarde, 'portal', invierno('16:01:00')], [tarde, 'correo', invierno('17:00:00')]);

    for (const [id, canal, reloj] of casos) {
      const antes = fila(id);
      const r = cancelarCita(contexto(reloj), id, canal);
      assert.notEqual(r.resultado, 'cancelada_ahora');
      assert.deepEqual(fila(id), antes);
    }
  });
});

describe('FR-038 casos que no son resultados', () => {
  test('FR-038 FR-004 una cita inexistente o de otra clínica devuelve null sin efecto', () => {
    const id = nueva();
    const antes = fila(id);
    assert.equal(cancelarCita(contexto(invierno('10:00:00'), { clinica: e.b }), id, 'recepcion'), null);
    assert.equal(cancelarCita(contexto(invierno('10:00:00')), 999_999, 'portal'), null);
    assert.deepEqual(fila(id), antes);
  });

  test('FR-038 un canal no válido es un error de programación y no cambia nada', () => {
    const id = nueva();
    const antes = fila(id);
    for (const canal of ['Recepción', '', undefined, 'telefono']) {
      assert.throws(() => cancelarCita(contexto(invierno('10:00:00')), id, canal), String(canal));
    }
    assert.deepEqual(fila(id), antes);
  });
});

test('FR-036 en Canarias el momento registrado es la hora local de la clínica', () => {
  const id = nueva(A_LAS_18, e.b);
  // 14:00 UTC son las 14:00 en Canarias en invierno, y las 15:00 en la península.
  const r = cancelarCita(contexto(`${LUNES}T14:00:00Z`, { clinica: e.b }), id, 'portal');
  aceptada(r, id, 'portal', `${LUNES}T14:00`);
});
