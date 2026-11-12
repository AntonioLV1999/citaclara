import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ventana } from '../../src/dominio/recordatorio.js';
import { ahoraLocal, diaDeSemana } from '../../src/dominio/tiempo.js';

/** La ventana de una ejecución a las 08:00 locales reales de `zona`, el instante UTC `iso`. */
function ventanaReal(iso, zona) {
  const ahora = ahoraLocal({ momentoFijado: null, ahora: () => new Date(iso) }, zona);
  assert.match(ahora, /T08:00$/, `${iso} no son las 08:00 en ${zona}`);
  return ventana(ahora.slice(0, 10));
}

test('RR3 la ventana es el día natural siguiente', () => {
  assert.deepEqual(ventana('2026-11-02'), { dia: '2026-11-03', desde: '2026-11-03T00:00', hasta: '2026-11-04T00:00' });
  assert.deepEqual(ventana('2026-12-31'), { dia: '2027-01-01', desde: '2027-01-01T00:00', hasta: '2027-01-02T00:00' });
  assert.deepEqual(ventana('2028-02-28'), { dia: '2028-02-29', desde: '2028-02-29T00:00', hasta: '2028-03-01T00:00' });
});

test('RR3 003/CL Días de cambio de hora: en la península y en Canarias, cada víspera cubre su día entero, sin huecos ni solapes', () => {
  // 08:00 locales de cada día, en UTC: Madrid es UTC+1 en invierno y UTC+2 en verano; Canarias, una hora menos.
  const ejecuciones = {
    'Europe/Madrid': {
      '2027-03-27': '2027-03-27T07:00Z', '2027-03-28': '2027-03-28T06:00Z',
      '2027-10-30': '2027-10-30T06:00Z', '2027-10-31': '2027-10-31T07:00Z',
    },
    'Atlantic/Canary': {
      '2027-03-27': '2027-03-27T08:00Z', '2027-03-28': '2027-03-28T07:00Z',
      '2027-10-30': '2027-10-30T07:00Z', '2027-10-31': '2027-10-31T08:00Z',
    },
  };
  for (const [zona, dias] of Object.entries(ejecuciones)) {
    const ventanas = Object.entries(dias).map(([dia, iso]) => {
      const v = ventanaReal(iso, zona);
      assert.equal(v.desde.slice(0, 10) > dia, true, `${zona} ${dia}`);
      return [dia, v];
    });
    assert.deepEqual(ventanas.map(([, v]) => v.dia), ['2027-03-28', '2027-03-29', '2027-10-31', '2027-11-01'], zona);
    // Las ejecuciones seguidas encadenan sus ventanas: lo que acaba una lo empieza la siguiente.
    assert.equal(ventanas[0][1].hasta, ventanas[1][1].desde, zona);
    assert.equal(ventanas[2][1].hasta, ventanas[3][1].desde, zona);
    // El día de 23 horas (28/03) y el de 25 (31/10) entran enteros, de las 09:00 a las 19:45.
    for (const [, v] of [ventanas[0], ventanas[2]]) {
      for (const hora of ['09:00', '19:45']) {
        const inicio = `${v.dia}T${hora}`;
        assert.ok(inicio >= v.desde && inicio < v.hasta, `${zona} ${inicio}`);
      }
    }
  }
});

test('RR3 003/CL Fines de semana y festivos: la ejecución del domingo avisa de las citas del lunes', () => {
  assert.equal(diaDeSemana('2026-11-08'), 0);
  const v = ventana('2026-11-08');
  assert.equal(v.dia, '2026-11-09');
  assert.equal(diaDeSemana(v.dia), 1);
  assert.equal(ventana('2026-11-07').dia, '2026-11-08');
});

test('RR3 003/CL Ejecución retrasada: a las 08:00 y a las 23:59 del mismo día la ventana es la misma', () => {
  const temprano = ahoraLocal({ momentoFijado: '2026-11-02T08:00' }, 'Europe/Madrid');
  const tarde = ahoraLocal({ momentoFijado: '2026-11-02T23:59' }, 'Europe/Madrid');
  assert.deepEqual(ventana(tarde.slice(0, 10)), ventana(temprano.slice(0, 10)));
});
