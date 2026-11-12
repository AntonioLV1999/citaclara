import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programarRecordatorios } from '../../src/servicios/programador.js';

const MADRID = { id: 1, nombre: 'Clínica Norte', zona_horaria: 'Europe/Madrid' };
const CANARIAS = { id: 2, nombre: 'Clínica Sur', zona_horaria: 'Atlantic/Canary' };

/** Un programador con el reloj real y el intervalo en manos del test. */
function preparar({ inicio, clinicas = [MADRID], contexto = { momentoFijado: null } }) {
  let ahora = Date.parse(inicio);
  const ejecuciones = [];
  const intervalo = { funcion: null, ms: null, parado: false };
  const programa = programarRecordatorios({
    contexto,
    clinicas,
    relojReal: () => new Date(ahora),
    ejecutar: (ctx, clinica) => ejecuciones.push([clinica.nombre, new Date(ahora).toISOString(), ctx]),
    cadaMs: 60_000,
    temporizador: {
      setInterval(funcion, ms) { Object.assign(intervalo, { funcion, ms }); return 'id-del-intervalo'; },
      clearInterval(id) { if (id === 'id-del-intervalo') intervalo.parado = true; },
    },
  });
  return {
    ejecuciones,
    intervalo,
    programa,
    /** Mueve el reloj real al instante UTC `iso` y dispara el intervalo, como haría cada minuto. */
    en(iso) {
      ahora = Date.parse(iso);
      intervalo.funcion();
    },
  };
}

const nombres = (ejecuciones) => ejecuciones.map(([nombre, momento]) => `${nombre} ${momento.slice(0, 16)}`);

test('003/FR-001 a las 07:59 no ejecuta, a las 08:00 ejecuta una vez y a las 08:01 del mismo día no repite', () => {
  // 02/11/2026: Madrid está en UTC+1.
  const p = preparar({ inicio: '2026-11-02T06:58:00Z' });
  assert.equal(p.intervalo.ms, 60_000);
  p.en('2026-11-02T06:59:00Z');
  assert.deepEqual(p.ejecuciones, []);
  p.en('2026-11-02T07:00:00Z');
  p.en('2026-11-02T07:01:00Z');
  p.en('2026-11-02T22:59:00Z');
  assert.deepEqual(nombres(p.ejecuciones), ['Clínica Norte 2026-11-02T07:00']);
});

test('003/FR-001 al día siguiente vuelve a ejecutar, también los sábados y los domingos', () => {
  const p = preparar({ inicio: '2026-11-06T06:00:00Z' });
  for (const dia of ['06', '07', '08', '09']) {
    p.en(`2026-11-${dia}T06:59:00Z`);
    p.en(`2026-11-${dia}T07:00:00Z`);
    p.en(`2026-11-${dia}T12:00:00Z`);
  }
  // Viernes, sábado, domingo y lunes.
  assert.deepEqual(nombres(p.ejecuciones), [
    'Clínica Norte 2026-11-06T07:00', 'Clínica Norte 2026-11-07T07:00',
    'Clínica Norte 2026-11-08T07:00', 'Clínica Norte 2026-11-09T07:00',
  ]);
});

test('003/FR-001 dos clínicas, en la península y en Canarias, ejecutan con una hora real de diferencia', () => {
  const p = preparar({ inicio: '2026-11-02T06:30:00Z', clinicas: [MADRID, CANARIAS] });
  for (let minuto = 6 * 60 + 31; minuto <= 9 * 60; minuto += 1) {
    const h = String(Math.floor(minuto / 60)).padStart(2, '0');
    const m = String(minuto % 60).padStart(2, '0');
    p.en(`2026-11-02T${h}:${m}:00Z`);
  }
  assert.deepEqual(nombres(p.ejecuciones), ['Clínica Norte 2026-11-02T07:00', 'Clínica Sur 2026-11-02T08:00']);
});

test('003/FR-001 003/CL Ejecución retrasada: arrancado a las 10:00 ejecuta en la comprobación inicial, sin esperar al intervalo', () => {
  const p = preparar({ inicio: '2026-11-02T09:00:00Z' });
  assert.deepEqual(nombres(p.ejecuciones), ['Clínica Norte 2026-11-02T09:00']);
  p.en('2026-11-02T09:01:00Z');
  assert.equal(p.ejecuciones.length, 1);
});

test('003/FR-001 con el momento fijado en el contexto, el disparo sigue al reloj real y le pasa el contexto', () => {
  const contexto = { momentoFijado: '2026-11-02T08:00' };
  const p = preparar({ inicio: '2026-11-04T05:00:00Z', contexto });
  assert.deepEqual(p.ejecuciones, []);
  p.en('2026-11-04T07:00:00Z');
  p.en('2026-11-05T07:00:00Z');
  assert.deepEqual(nombres(p.ejecuciones), ['Clínica Norte 2026-11-04T07:00', 'Clínica Norte 2026-11-05T07:00']);
  assert.equal(p.ejecuciones[0][2], contexto);
});

test('003/FR-001 parar() detiene el intervalo', () => {
  const p = preparar({ inicio: '2026-11-02T06:00:00Z' });
  p.programa.parar();
  assert.equal(p.intervalo.parado, true);
});

test('003/FR-001 un fallo de una ejecución no detiene el programador ni a las demás clínicas', () => {
  let llamadas = 0;
  const errores = [];
  const original = console.error;
  console.error = (...args) => errores.push(args.join(' '));
  try {
    let intervalo;
    programarRecordatorios({
      contexto: {},
      clinicas: () => [MADRID, CANARIAS],
      relojReal: () => new Date('2026-11-02T12:00:00Z'),
      ejecutar: (ctx, clinica) => {
        llamadas += 1;
        if (clinica === MADRID) throw new Error('almacén bloqueado');
      },
      temporizador: { setInterval: (funcion) => { intervalo = funcion; }, clearInterval() {} },
    });
    assert.equal(llamadas, 2);
    assert.equal(typeof intervalo, 'function');
    assert.equal(errores.length, 1);
    assert.match(errores[0], /almacén bloqueado/);
  } finally {
    console.error = original;
  }
});
