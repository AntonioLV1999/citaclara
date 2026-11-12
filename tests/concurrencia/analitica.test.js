import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import {
  crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba,
} from '../ayudas/escenario.js';
import { transaccionLectura } from '../../src/datos/analitica.js';
import { cargar } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { crearServidor } from '../../src/web/servidor.js';

const TRABAJADOR = fileURLToPath(new URL('./trabajador-cerrar.js', import.meta.url));
// Con el reloj en el 11/11/2026, las 31 citas sin cerrar del 02/11 al 06/11 caen en el periodo.
const MOMENTO_FIJADO = '2026-11-11T12:00';
const APERTURAS_MINIMAS = 200;

const aCentimos = (texto) => Number(texto.replace(/[.,\s€]/g, ''));

/** Los tres totales de la página y el número de citas del periodo, leídos del HTML. */
function cifrasDe(html) {
  const total = aCentimos(html.match(/Total del periodo: ([\d.]+,\d{2} €)/)[1]);
  const porServicio = [...html.matchAll(/class="grafico__cifra">\d+ citas? · ([\d.]+,\d{2} €)</g)]
    .reduce((suma, m) => suma + aCentimos(m[1]), 0);
  const evolucion = html.slice(html.indexOf('<caption>Ingresos de la clínica'));
  const porSemana = [...evolucion.slice(0, evolucion.indexOf('</table>')).matchAll(/class="grafico__cifra">([\d.]+,\d{2} €)</g)]
    .reduce((suma, m) => suma + aCentimos(m[1]), 0);
  const fila = html.match(/<tr class="tabla__total">\s*<th scope="row">Total<\/th><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td>/);
  const sinCerrar = Number(html.match(/Hay (\d+) citas? sin cerrar/)?.[1] ?? 0);
  return {
    total, porServicio, porSemana, sinCerrar,
    citas: Number(fila[1]) + Number(fila[2]) + Number(fila[3]) + sinCerrar,
  };
}

test('004/SC-002 004/FR-015 mientras recepción cierra citas, los totales de cada apertura cuadran al céntimo', { timeout: 300_000 }, async (t) => {
  const e = crearEscenario();
  cargar(e.bd, generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO }));
  const { id: clinicaId } = e.bd.prepare("SELECT id FROM clinica WHERE nombre = 'Clínica Eleva'").get();
  const ids = e.bd.prepare(`SELECT id FROM cita WHERE clinica_id = ? AND estado = 'reservada'
    AND inicio >= '2026-09-14T00:00' AND inicio < '2026-11-09T00:00' ORDER BY inicio`).all(clinicaId).map((c) => c.id);
  assert.equal(ids.length, 31);

  const servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-11T12:00:00+01:00'), momentoFijado: MOMENTO_FIJADO }));
  const cookie = sesionDePrueba(e.bd, clinicaId);
  const { NODE_TEST_CONTEXT, ...entorno } = process.env;
  const trabajador = fork(TRABAJADOR, [e.ruta], { env: entorno });
  try {
    await once(trabajador, 'message');
    const inicial = cifrasDe((await peticion(servidor, { ruta: '/analitica', cookie })).texto);
    assert.equal(inicial.sinCerrar, 31);

    let terminado = false;
    trabajador.on('message', (mensaje) => { if (mensaje.fin) terminado = true; });
    trabajador.send({ ids, pausaMs: 4 });

    let aperturas = 0;
    const sinCerrarVistos = new Set();
    while (!terminado || aperturas < APERTURAS_MINIMAS) {
      const r = await peticion(servidor, { ruta: '/analitica', cookie });
      assert.equal(r.estado, 200);
      const cifras = cifrasDe(r.texto);
      assert.equal(cifras.porServicio, cifras.total, `apertura ${aperturas}`);
      assert.equal(cifras.porSemana, cifras.total, `apertura ${aperturas}`);
      assert.equal(cifras.citas, inicial.citas, `apertura ${aperturas}`);
      sinCerrarVistos.add(cifras.sinCerrar);
      aperturas += 1;
    }

    const final = cifrasDe((await peticion(servidor, { ruta: '/analitica', cookie })).texto);
    assert.equal(final.sinCerrar, 0);
    assert.equal(final.total, inicial.total + ids.reduce((suma, id) =>
      suma + e.bd.prepare('SELECT precio_centimos FROM cita JOIN servicio ON servicio.id = servicio_id WHERE cita.id = ?').get(id).precio_centimos, 0));
    // Si ninguna apertura hubiera visto un estado intermedio, la prueba no demostraría nada.
    t.diagnostic(`aperturas: ${aperturas}; estados intermedios vistos: ${sinCerrarVistos.size}`);
    assert.ok(sinCerrarVistos.size >= 3, `estados vistos: ${[...sinCerrarVistos]}`);
  } finally {
    trabajador.send({});
    await detener(servidor);
    e.cerrar();
  }
});

test('004/FR-015 una transacción de lectura no ve lo que otra conexión escribe a la vez', () => {
  const e = crearEscenario();
  const otra = new DatabaseSync(e.ruta);
  try {
    const contar = () => e.bd.prepare("SELECT count(*) AS n FROM paciente WHERE nombre = 'Nueva'").get().n;
    const [antes, durante] = transaccionLectura(e.bd, () => {
      const primera = contar();
      otra.prepare("INSERT INTO paciente (clinica_id, nombre, telefono) VALUES (?, 'Nueva', '600 000 999')").run(e.a.id);
      return [primera, contar()];
    });
    assert.equal(antes, 0);
    assert.equal(durante, 0);
    assert.equal(contar(), 1);
  } finally {
    otra.close();
    e.cerrar();
  }
});
