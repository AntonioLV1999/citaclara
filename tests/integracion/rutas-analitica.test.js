import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, sesionPacienteDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { panelDeSemilla } from '../ayudas/panel.js';
import { crearServidor } from '../../src/web/servidor.js';

const PERIODO = 'Del 07/09/2026 al 01/11/2026: las 8 últimas semanas completas. La semana en curso no cuenta hasta que termina.';
const AVISO_31 = 'Hay 31 citas sin cerrar en este periodo: ya ha pasado su hora y siguen como reservadas. '
  + 'No cuentan en ninguna cifra, y las cifras estarán completas cuando recepción las cierre.';
const AVISO_1 = 'Hay 1 cita sin cerrar en este periodo: ya ha pasado su hora y sigue como reservada. '
  + 'No cuenta en ninguna cifra, y las cifras estarán completas cuando recepción la cierre.';

const sinEtiquetas = (trozo) => textoVisible(trozo);

/** Filas `[etiqueta, cifra]` del gráfico cuyo título empieza por `titulo`. */
function filasDeGrafico(html, titulo) {
  const tabla = [...html.matchAll(/<table class="grafico">[\s\S]*?<\/table>/g)].map((m) => m[0])
    .find((t) => t.match(/<caption>([^<]*)/)[1] === titulo);
  assert.ok(tabla, `no hay gráfico «${titulo}»`);
  return [...tabla.matchAll(/<tr>\s*<th scope="row">([\s\S]*?)<\/th>\s*<td><span class="grafico__cifra">([\s\S]*?)<\/span>/g)]
    .map((m) => [sinEtiquetas(m[1]), sinEtiquetas(m[2])]);
}

/** Escala escrita del gráfico con ese título. */
function escalaDeGrafico(html, titulo) {
  const caption = [...html.matchAll(/<caption>([^<]*)<span class="grafico__escala">([^<]*)<\/span><\/caption>/g)]
    .find((m) => m[1] === titulo);
  return caption?.[2];
}

/** Filas de celdas de la tabla de recuentos con ese título, sin la cabecera. */
function filasDeTabla(html, titulo) {
  const tabla = [...html.matchAll(/<table class="tabla">[\s\S]*?<\/table>/g)].map((m) => m[0])
    .find((t) => sinEtiquetas(t.match(/<caption>([\s\S]*?)<\/caption>/)[1]) === titulo);
  assert.ok(tabla, `no hay tabla «${titulo}»`);
  const cuerpo = tabla.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
  return [...cuerpo.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((fila) => [...fila[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => sinEtiquetas(c[1])));
}

/** Frase llana que sigue al `<h2>` de un apartado (FR-010). */
function fraseDe(html, apartado) {
  const m = html.match(new RegExp(String.raw`<h2>${apartado}</h2>\s*<p class="analitica__nota">([\s\S]*?)</p>`));
  return m && sinEtiquetas(m[1]);
}

/** Textos de los enlaces y botones del menú principal, en orden. */
function menu(html) {
  const nav = html.match(/<nav class="cabecera__menu"[\s\S]*?<\/nav>/);
  return nav ? [...nav[0].matchAll(/<(a|button)\b[^>]*>([^<]*)<\/\1>/g)].map((m) => m[2]) : [];
}

describe('con la semilla y el reloj en el 04/11/2026', () => {
  let p;
  let r;
  before(async () => {
    p = await panelDeSemilla();
    r = await p.abrir();
  });
  after(() => p.cerrar());

  test('004/FR-005 el panel indica el periodo analizado con sus fechas', () => {
    assert.equal(r.estado, 200);
    assert.ok(r.visible.includes(PERIODO), r.visible.slice(0, 400));
  });

  test('004/FR-003 el menú incluye «Analítica» entre «Nueva cita» y «Salir»', async () => {
    assert.deepEqual(menu(r.texto), ['Agenda', 'Nueva cita', 'Analítica', 'Salir']);
    assert.deepEqual(menu((await p.abrir('/agenda')).texto), ['Agenda', 'Nueva cita', 'Analítica', 'Salir']);
    assert.match(r.texto, /<a [^>]*href="\/analitica"[^>]*>Analítica<\/a>/);
  });

  test('004/FR-003 sin sesión la pantalla de acceso no tiene menú', async () => {
    const acceso = await peticion(p.servidor, { ruta: '/acceso' });
    assert.deepEqual(menu(acceso.texto), []);
    assert.doesNotMatch(acceso.texto, /Analítica/);
  });

  test('004/FR-016 con el reloj fijado, el panel lleva el aviso de FR-043 de la 001', () => {
    assert.ok(r.visible.includes('Reloj de demostración: la hora está fijada en el miércoles 04/11/2026 a las 12:00 y no avanza.'));
  });

  test('RA6 sin citas sin cerrar en el periodo, no hay aviso', () => {
    assert.doesNotMatch(r.visible, /sin cerrar/);
  });
});

describe('con la semilla y el reloj en el 11/11/2026', () => {
  let p;
  let r;
  before(async () => {
    p = await panelDeSemilla({ momentoFijado: '2026-11-11T12:00' });
    r = await p.abrir();
  });
  after(() => p.cerrar());

  test('RA6 004/FR-011 el panel avisa de las 31 citas sin cerrar, con un enlace a la agenda', () => {
    assert.ok(r.visible.includes(AVISO_31), r.visible.slice(0, 600));
    assert.match(r.texto, /<p class="aviso aviso--info" role="status">[\s\S]*?<a class="boton" href="\/agenda">Ir a la agenda<\/a>/);
  });
});

describe('con una sola cita sin cerrar', () => {
  let e;
  let servidor;
  before(async () => {
    e = crearEscenario();
    citaDirecta(e.bd, {
      clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0], inicio: '2026-10-20T10:00',
    });
    servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-04T12:00:00+01:00') }));
  });
  after(async () => {
    await detener(servidor);
    e.cerrar();
  });

  test('RA6 el aviso de una sola cita va en singular', async () => {
    const r = await peticion(servidor, { ruta: '/analitica', cookie: sesionDePrueba(e.bd, e.a.id) });
    assert.ok(textoVisible(r.texto).includes(AVISO_1));
  });
});

describe('historia 1: ingresos por servicio con la semilla', () => {
  let p;
  let r;
  before(async () => {
    p = await panelDeSemilla();
    r = await p.abrir();
  });
  after(() => p.cerrar());

  test('004/H1-E1 el panel muestra los ingresos de cada servicio con importes exactos', () => {
    assert.deepEqual(filasDeGrafico(r.texto, 'Ingresos por servicio'), [
      ['Sesión de fisioterapia', '220 citas · 8.800,00 €'],
      ['Primera visita de fisioterapia', '40 citas · 2.000,00 €'],
      ['Consulta de nutrición', '82 citas · 2.870,00 €'],
      ['Primera consulta de nutrición', '38 citas · 1.710,00 €'],
    ]);
    assert.equal(escalaDeGrafico(r.texto, 'Ingresos por servicio'), 'Escala desde 0,00 €');
  });

  test('004/H1-E2 RA5 el total del periodo es 15.380,00 €, la suma exacta de los cuatro servicios', () => {
    assert.ok(r.visible.includes('Total del periodo: 15.380,00 €'));
  });

  test('004/FR-010 el apartado de ingresos explica en una frase qué citas cuenta', () => {
    assert.equal(fraseDe(r.texto, 'Ingresos por servicio'),
      'Suma del precio de las citas completadas. Las no asistidas, las canceladas y las reservadas no suman.');
  });
});

describe('historia 1: qué citas suman', () => {
  let e;
  let servidor;
  let r;
  before(async () => {
    e = crearEscenario();
    const base = { clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente: e.a.pacientes[0] };
    citaDirecta(e.bd, { ...base, inicio: '2026-10-19T10:00', estado: 'completada' });
    citaDirecta(e.bd, { ...base, inicio: '2026-10-19T11:00', estado: 'no_asistida' });
    citaDirecta(e.bd, { ...base, inicio: '2026-10-19T12:00', estado: 'cancelada' });
    citaDirecta(e.bd, { ...base, inicio: '2026-10-19T13:00' });
    servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-04T12:00:00+01:00') }));
    r = await peticion(servidor, { ruta: '/analitica', cookie: sesionDePrueba(e.bd, e.a.id) });
  });
  after(async () => {
    await detener(servidor);
    e.cerrar();
  });

  test('004/H1-E3 RA5 solo suman las completadas: ni las no asistidas, ni las canceladas, ni las reservadas', () => {
    assert.deepEqual(filasDeGrafico(r.texto, 'Ingresos por servicio')[0], ['Sesión de fisioterapia', '1 cita · 40,00 €']);
    assert.ok(textoVisible(r.texto).includes('Total del periodo: 40,00 €'));
  });

  test('004/H1-E4 un servicio sin completadas aparece con 0 citas y 0,00 €', () => {
    assert.deepEqual(filasDeGrafico(r.texto, 'Ingresos por servicio').slice(1), [
      ['Primera visita de fisioterapia', '0 citas · 0,00 €'],
      ['Consulta de nutrición', '0 citas · 0,00 €'],
      ['Primera consulta de nutrición', '0 citas · 0,00 €'],
    ]);
  });
});

describe('historia 2: no asistencia por profesional con la semilla', () => {
  let p;
  let r;
  before(async () => {
    p = await panelDeSemilla();
    r = await p.abrir();
  });
  after(() => p.cerrar());

  test('004/H2-E1 RA3 el panel muestra por profesional los recuentos y la tasa del periodo', () => {
    assert.deepEqual(filasDeTabla(r.texto, 'Citas por profesional').slice(0, 3), [
      ['María', '129', '13', '9', '9,2 %'],
      ['Jorge', '131', '14', '13', '9,7 %'],
      ['Lucía', '120', '19', '15', '13,7 %'],
    ]);
    assert.deepEqual(filasDeGrafico(r.texto, 'Tasa de no asistencia'), [
      ['María', '9,2 %'], ['Jorge', '9,7 %'], ['Lucía', '13,7 %'], ['Toda la clínica', '10,8 %'],
    ]);
    assert.equal(escalaDeGrafico(r.texto, 'Tasa de no asistencia'), 'Escala de 0 % a 20 %');
  });

  test('004/H2-E2 RA7 la tasa de la clínica sale de los recuentos totales: 46 de 426', () => {
    assert.deepEqual(filasDeTabla(r.texto, 'Citas por profesional')[3], ['Toda la clínica', '380', '46', '37', '10,8 %']);
  });

  test('004/H2-E3 la tasa tiene a la vista una frase llana que explica cómo se calcula', () => {
    assert.equal(fraseDe(r.texto, 'No asistencia por profesional'),
      'Tasa de no asistencia: de las citas que debían atenderse, es decir, las completadas y las no asistidas, '
      + 'qué parte acabó sin que el paciente viniera. Las canceladas no cuentan, sea quien sea quien cancelara.');
  });
});

/** Contenido lógico de todas las tablas, fila a fila y en orden (RA8). */
function volcado(bd) {
  const tablas = bd.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  return JSON.stringify(tablas.map(({ name }) => [name, bd.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()]));
}

const CIFRAS = /15\.380|8\.800|\d,\d %/;

describe('historia 5: acceso, solo lectura y sin datos de pacientes', () => {
  let p;
  before(async () => { p = await panelDeSemilla(); });
  after(() => p.cerrar());

  test('004/H5-E1 con sesión, «Analítica» del menú abre el panel sin pedir nada más', async () => {
    const agenda = await p.abrir('/agenda');
    const enlace = agenda.texto.match(/<a [^>]*href="([^"]+)"[^>]*>Analítica<\/a>/)[1];
    const r = await p.abrir(enlace);
    assert.equal(r.estado, 200);
    assert.ok(r.visible.includes('Total del periodo: 15.380,00 €'));
  });

  test('004/H5-E2 004/FR-001 sin sesión se rechaza por cualquier vía y no se revela ninguna cifra', async () => {
    const get = await peticion(p.servidor, { ruta: '/analitica' });
    assert.equal(get.estado, 303);
    assert.equal(get.ubicacion, '/acceso');
    for (const metodo of ['POST', 'PUT', 'DELETE']) {
      const r = await peticion(p.servidor, { metodo, ruta: '/analitica' });
      assert.equal(r.estado, 401, metodo);
      assert.doesNotMatch(r.texto, CIFRAS, metodo);
    }
    assert.doesNotMatch(get.texto, CIFRAS);
    const conClave = await peticion(p.servidor, { ruta: '/analitica', cookie: 'sesion=inventada' });
    assert.equal(conClave.estado, 303);
  });

  test('004/H5-E8 una sesión de paciente no abre el panel por ninguna vía', async () => {
    const token = sesionPacienteDePrueba(p.e.bd, p.e.a.pacientes[0]);
    for (const cookie of [`sesion_paciente=${token}`, `sesion=${token}`, `sesion_paciente=${token}; sesion=${token}`]) {
      const r = await peticion(p.servidor, { ruta: '/analitica', cookie });
      assert.equal(r.estado, 303, cookie);
      assert.equal(r.ubicacion, '/acceso', cookie);
      assert.doesNotMatch(r.texto, CIFRAS, cookie);
      const post = await peticion(p.servidor, { metodo: 'POST', ruta: '/analitica', cookie });
      assert.equal(post.estado, 401, cookie);
    }
  });

  test('004/H5-E4 004/SC-003 RA8 tras abrir el panel 100 veces, los datos almacenados no cambian', async () => {
    const antes = volcado(p.e.bd);
    for (let i = 0; i < 100; i += 1) {
      const r = await p.abrir();
      assert.equal(r.estado, 200);
      assert.deepEqual(r.cookies, [], 'el panel no pone cookies');
    }
    assert.equal(volcado(p.e.bd), antes);
  });

  test('004/H5-E5 RA8 el panel no ofrece ninguna acción de escritura y rechaza cualquier intento', async () => {
    const r = await p.abrir();
    const principal = r.texto.match(/<main[\s\S]*<\/main>/)[0];
    assert.doesNotMatch(principal, /<form|<button|<input|<select|<textarea/);
    const antes = volcado(p.e.bd);
    for (const [metodo, ruta] of [['POST', '/analitica'], ['PUT', '/analitica'], ['DELETE', '/analitica'], ['POST', '/analitica/exportar']]) {
      const intento = await p.abrir(ruta, { metodo, formulario: metodo === 'POST' ? { semana: '1' } : undefined });
      assert.equal(intento.estado, 404, `${metodo} ${ruta}`);
      assert.doesNotMatch(intento.texto, CIFRAS, `${metodo} ${ruta}`);
    }
    assert.equal(volcado(p.e.bd), antes);
  });

  test('004/H5-E6 004/FR-012 el panel no muestra ningún dato de un paciente concreto', async () => {
    const r = await p.abrir();
    const pacientes = p.e.bd.prepare('SELECT nombre, telefono, email, enlace FROM paciente WHERE clinica_id = ?').all(p.clinicaId);
    assert.equal(pacientes.length, 40);
    for (const paciente of pacientes) {
      for (const dato of Object.values(paciente).filter(Boolean)) {
        assert.ok(!r.texto.includes(dato), `aparece «${dato}»`);
      }
    }
  });
});

describe('historia 5: dos clínicas', () => {
  let p;
  before(async () => {
    p = await panelDeSemilla();
    const { b } = p.e;
    for (const inicio of ['2026-10-05T10:00', '2026-10-06T10:00']) {
      citaDirecta(p.e.bd, { clinica: b.id, profesional: b.fisio, servicio: b.sesion, paciente: b.pacientes[0], inicio, estado: 'completada' });
    }
  });
  after(() => p.cerrar());

  test('004/H5-E3 004/FR-002 cada clínica ve solo sus cifras', async () => {
    const eleva = await p.abrir();
    assert.ok(eleva.visible.includes('Total del periodo: 15.380,00 €'));
    const sur = await peticion(p.servidor, { ruta: '/analitica', cookie: sesionDePrueba(p.e.bd, p.e.b.id) });
    const visible = textoVisible(sur.texto);
    assert.ok(visible.includes('Total del periodo: 80,00 €'), visible);
    assert.deepEqual(filasDeTabla(sur.texto, 'Citas por profesional').map((fila) => fila[0]), ['Pablo', 'Elena', 'Nora', 'Toda la clínica']);
    assert.doesNotMatch(visible, /María|Jorge|Lucía|15\.380/);
  });
});
