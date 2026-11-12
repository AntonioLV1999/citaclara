import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { peticion, textoVisible } from '../ayudas/escenario.js';
import { citaDe, entrarComoPaciente, escenarioSemilla, fichaPorNombre } from '../ayudas/portal.js';

let s;

beforeEach(async () => { s = await escenarioSemilla(); });
afterEach(() => s.cerrar());

async function paginaDe(nombre, servidor = s.servidor) {
  const cookie = await entrarComoPaciente(servidor, fichaPorNombre(s.bd, nombre).enlace);
  const r = await peticion(servidor, { ruta: '/portal', cookie });
  assert.equal(r.estado, 200);
  return { ...r, cookie };
}

/** Las citas de una sección de la página, cada una con su texto visible y su HTML. */
function seccion(html, id) {
  const trozo = html.match(new RegExp(`<section[^>]*id="${id}"[^>]*>([\\s\\S]*?)</section>`))?.[1] ?? '';
  return [...trozo.matchAll(/<li class="cita-portal[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => ({ html: m[1], texto: textoVisible(m[1]) }));
}

test('002/H2-E1 David Gil ve sus dos próximas citas en orden, con la hora peninsular', async () => {
  const { texto } = await paginaDe('David Gil');
  const proximas = seccion(texto, 'proximas');
  assert.deepEqual(proximas.map((c) => c.texto.match(/^\S+ \S+, \S+/)[0]), [
    'lun 09/11/2026, 18:00–18:45',
    'lun 09/11/2026, 19:00–19:30',
  ]);
  assert.match(proximas[0].texto, /Sesión de fisioterapia con María/);
  assert.match(proximas[1].texto, /Consulta de nutrición con Lucía/);
  const visible = textoVisible(texto);
  assert.match(visible, /Tus citas/);
  assert.match(visible, /David Gil/);
  assert.match(visible, /Horas en hora peninsular/);
  assert.ok(visible.indexOf('Próximas citas') < visible.indexOf('Historial'));
});

test('002/H2-E2 el historial de David Gil tiene sus 11 citas, de la más reciente a la más antigua, cada una con su estado', async () => {
  const { texto } = await paginaDe('David Gil');
  const historial = seccion(texto, 'historial');
  assert.equal(historial.length, 11);
  const david = fichaPorNombre(s.bd, 'David Gil');
  const esperadas = s.bd.prepare("SELECT inicio FROM cita WHERE paciente_id = ? AND inicio <= '2026-11-04T12:00' ORDER BY inicio DESC").all(david.id);
  assert.deepEqual(historial.map((c) => c.texto.match(/\d\d\/\d\d\/\d{4}, \d\d:\d\d/)[0]),
    esperadas.map(({ inicio }) => `${inicio.slice(8, 10)}/${inicio.slice(5, 7)}/${inicio.slice(0, 4)}, ${inicio.slice(11)}`));
  for (const c of historial) assert.match(c.texto, /Completada|No asistida|Pendiente de confirmar por la clínica/);
  const deLucia = historial.find((c) => c.texto.includes('23/09/2026') && c.texto.includes('Lucía'));
  assert.match(deLucia.texto, /No asistida/);
  assert.equal(historial.filter((c) => c.texto.includes('Completada')).length, 8);
  assert.equal(historial.filter((c) => c.texto.includes('No asistida')).length, 2);
});

test('002/H2-E3 la cita de David Gil del 02/11/2026 a las 15:15 aparece pendiente de confirmar y sin opción de cancelar', async () => {
  const { texto } = await paginaDe('David Gil');
  const sinCerrar = seccion(texto, 'historial').find((c) => c.texto.includes('02/11/2026, 15:15'));
  assert.match(sinCerrar.texto, /Pendiente de confirmar por la clínica/);
  assert.doesNotMatch(sinCerrar.html, /Cancelar|cancelar/);
  assert.equal(seccion(texto, 'proximas').some((c) => c.texto.includes('02/11/2026')), false);
});

test('002/H2-E4 002/FR-012 Rocío Marín, sin citas próximas, ve el aviso, el teléfono y sus 8 citas completadas', async () => {
  const { texto } = await paginaDe('Rocío Marín');
  assert.deepEqual(seccion(texto, 'proximas'), []);
  const proximas = texto.match(/<section[^>]*id="proximas"[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.match(textoVisible(proximas), /No tienes citas próximas\. Para pedir una, llama a la clínica\./);
  assert.match(proximas, /href="tel:000200000"/);
  const historial = seccion(texto, 'historial');
  assert.equal(historial.length, 8);
  assert.ok(historial.every((c) => c.texto.includes('Completada')));
});

test('002/H2-E5 pasadas las 12:15, la cita de Javier Peña ya no está en próximas sino en el historial', async () => {
  await s.cerrar();
  s = await escenarioSemilla({ momentoFijado: '2026-11-04T12:16' });
  const { texto } = await paginaDe('Javier Peña');
  assert.equal(seccion(texto, 'proximas').some((c) => c.texto.includes('04/11/2026, 12:15')), false);
  const enHistorial = seccion(texto, 'historial').find((c) => c.texto.includes('04/11/2026, 12:15'));
  assert.match(enHistorial.texto, /Pendiente de confirmar por la clínica/);
});

test('002/H2-E7 RP1 la página de un paciente no muestra a otros, y una cita ajena se rechaza igual que una inexistente', async () => {
  const fichas = s.bd.prepare('SELECT * FROM paciente WHERE clinica_id = ?').all(s.clinica.id);
  for (const nombre of ['David Gil', 'Isabel Navarro', 'Rocío Marín']) {
    const { texto, cookie } = await paginaDe(nombre);
    for (const otra of fichas.filter((f) => f.nombre !== nombre)) {
      assert.equal(texto.includes(otra.nombre), false, `${nombre} ve a ${otra.nombre}`);
    }
    const ajena = citaDe(s.bd, fichaPorNombre(s.bd, 'Cristina Ortega').id, '2026-11-11T11:15');
    const deAjena = await peticion(s.servidor, { ruta: `/portal/citas/${ajena.id}/cancelar`, cookie });
    const deInexistente = await peticion(s.servidor, { ruta: '/portal/citas/999999/cancelar', cookie });
    assert.equal(deAjena.estado, 404);
    assert.equal(deAjena.estado, deInexistente.estado);
    assert.equal(deAjena.texto, deInexistente.texto);
    assert.doesNotMatch(deAjena.texto, /Cristina Ortega|11\/11\/2026/);
  }
});

test('002/FR-008 ninguna página del portal muestra importes', async () => {
  for (const nombre of ['David Gil', 'Isabel Navarro', 'Rocío Marín', 'Javier Peña']) {
    const { texto } = await paginaDe(nombre);
    assert.doesNotMatch(texto, /€|EUR|\d+,\d\d/);
  }
});

test('002/FR-011 la cabecera muestra el nombre de la clínica y su teléfono como enlace de llamada', async () => {
  const { texto } = await paginaDe('David Gil');
  const cabecera = texto.match(/<header[\s\S]*?<\/header>/)[0];
  assert.match(textoVisible(cabecera), /Clínica Eleva/);
  assert.match(cabecera, /href="tel:000200000"/);
  assert.match(textoVisible(cabecera), /Llamar a la clínica: 000 200 000/);
  assert.match(cabecera, /action="\/portal\/salir"/);
  assert.doesNotMatch(cabecera, /\/agenda|Nueva cita/);
});

test('002/FR-013 la cita de Javier Peña de las 12:15 explica hasta cuándo se podía cancelar y da el teléfono', async () => {
  const { texto } = await paginaDe('Javier Peña');
  const [primera, segunda] = seccion(texto, 'proximas');
  assert.match(primera.texto, /^mié 04\/11\/2026, 12:15–13:00/);
  assert.match(primera.texto, /Ya no se puede cancelar desde aquí: se podía hasta el mié 04\/11\/2026 a las 10:15\. Si no puedes venir, llama a la clínica\./);
  assert.match(primera.html, /href="tel:000200000"/);
  assert.doesNotMatch(primera.html, />Cancelar</);
  assert.match(segunda.html, /href="\/portal\/citas\/\d+\/cancelar"[^>]*>Cancelar</);
});

test('002/SC-006 la página de Isabel Navarro, con 19 citas, se sirve en menos de 2 segundos', async () => {
  const cookie = await entrarComoPaciente(s.servidor, fichaPorNombre(s.bd, 'Isabel Navarro').enlace);
  const { texto } = await peticion(s.servidor, { ruta: '/portal', cookie });
  assert.equal(seccion(texto, 'proximas').length + seccion(texto, 'historial').length, 19);
  for (let i = 0; i < 10; i += 1) {
    const inicio = performance.now();
    const r = await peticion(s.servidor, { ruta: '/portal', cookie });
    const ms = performance.now() - inicio;
    assert.equal(r.estado, 200);
    assert.ok(ms < 2000, `vuelta ${i + 1}: ${ms.toFixed(0)} ms`);
  }
});
