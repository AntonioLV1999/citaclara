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

const SEMANAS = ['07/09/2026', '14/09/2026', '21/09/2026', '28/09/2026', '05/10/2026', '12/10/2026', '19/10/2026', '26/10/2026'];

describe('historia 3: ocupación semanal por profesional con la semilla', () => {
  let p;
  let r;
  before(async () => {
    p = await panelDeSemilla();
    r = await p.abrir();
  });
  after(() => p.cerrar());

  const OCUPACION = {
    María: ['28,6 %', '27,3 %', '25,5 %', '25,0 %', '23,6 %', '20,5 %', '16,4 %', '20,5 %', '23,4 %'],
    Jorge: ['21,8 %', '27,3 %', '24,5 %', '20,5 %', '28,6 %', '21,8 %', '20,5 %', '20,5 %', '23,2 %'],
    Lucía: ['17,3 %', '15,9 %', '15,9 %', '18,2 %', '15,9 %', '17,3 %', '15,0 %', '10,9 %', '15,8 %'],
  };

  test('004/H3-E1 RA4 cada profesional muestra su ocupación en cada semana y en el periodo', () => {
    for (const [nombre, cifras] of Object.entries(OCUPACION)) {
      const etiquetas = [...SEMANAS.map((s) => `Semana del ${s}`), 'Las 8 semanas'];
      assert.deepEqual(filasDeGrafico(r.texto, `Ocupación de ${nombre}`), etiquetas.map((e, i) => [e, cifras[i]]), nombre);
      assert.equal(escalaDeGrafico(r.texto, `Ocupación de ${nombre}`), 'Escala de 0 % a 30 %', nombre);
    }
  });

  test('004/H3-E2 RA4 la capacidad es el horario de FR-012 de la 001: 55 horas por semana y 440 en el periodo', () => {
    assert.deepEqual(filasDeTabla(r.texto, 'Horas del periodo'), [
      ['María', '440 h', '103 h', '23,4 %'],
      ['Jorge', '440 h', '102 h', '23,2 %'],
      ['Lucía', '440 h', '69,5 h', '15,8 %'],
      ['Toda la clínica', '1.320 h', '274,5 h', '20,8 %'],
    ]);
  });

  test('004/H3-E3 la ocupación tiene a la vista una frase llana que explica cómo se calcula', () => {
    assert.equal(fraseDe(r.texto, 'Ocupación semanal por profesional'),
      'Ocupación: tiempo de las citas completadas dividido entre el horario de la clínica, de lunes a viernes de 09:00 a 20:00, '
      + 'que son 55 horas por semana y profesional. Las no asistidas, las canceladas y las reservadas no cuentan.');
  });
});

describe('historia 4: evolución de las últimas 8 semanas con la semilla', () => {
  let p;
  let r;
  before(async () => {
    p = await panelDeSemilla();
    r = await p.abrir();
  });
  after(() => p.cerrar());

  const etiquetas = SEMANAS.map((s) => `Semana del ${s}`);
  const conEtiquetas = (cifras) => etiquetas.map((e, i) => [e, cifras[i]]);

  test('004/H4-E1 la evolución muestra 8 semanas en orden, del 07/09/2026 al 26/10/2026', () => {
    for (const titulo of ['Ocupación de la clínica', 'Tasa de no asistencia de la clínica', 'Ingresos de la clínica']) {
      assert.deepEqual(filasDeGrafico(r.texto, titulo).map((fila) => fila[0]), etiquetas, titulo);
    }
    assert.deepEqual(filasDeTabla(r.texto, 'Citas por semana').slice(0, 8).map((fila) => fila[0]), SEMANAS);
  });

  test('004/H4-E2 cada semana indica sus recuentos, su tasa, su ocupación y sus ingresos', () => {
    assert.deepEqual(filasDeTabla(r.texto, 'Citas por semana').slice(0, 8), [
      ['07/09/2026', '42', '8', '7'], ['14/09/2026', '49', '6', '3'], ['21/09/2026', '50', '4', '4'], ['28/09/2026', '51', '6', '3'],
      ['05/10/2026', '54', '2', '5'], ['12/10/2026', '49', '6', '4'], ['19/10/2026', '43', '7', '5'], ['26/10/2026', '42', '7', '6'],
    ]);
    assert.deepEqual(filasDeGrafico(r.texto, 'Tasa de no asistencia de la clínica'),
      conEtiquetas(['16,0 %', '10,9 %', '7,4 %', '10,5 %', '3,6 %', '10,9 %', '14,0 %', '14,3 %']));
    assert.deepEqual(filasDeGrafico(r.texto, 'Ocupación de la clínica'),
      conEtiquetas(['22,6 %', '23,5 %', '22,0 %', '21,2 %', '22,7 %', '19,8 %', '17,3 %', '17,3 %']));
    assert.deepEqual(filasDeGrafico(r.texto, 'Ingresos de la clínica'),
      conEtiquetas(['1.975,00 €', '2.100,00 €', '2.025,00 €', '2.000,00 €', '2.120,00 €', '1.890,00 €', '1.650,00 €', '1.620,00 €']));
  });

  test('004/H4-E3 004/FR-013 los ingresos de las 8 semanas suman exactamente 15.380,00 €', () => {
    assert.ok(r.visible.includes('Total de las 8 semanas: 15.380,00 €'));
    assert.deepEqual(filasDeTabla(r.texto, 'Citas por semana')[8], ['Total', '380', '46', '37']);
  });

  test('004/H4-E4 RA1 la semana en curso no aparece en la evolución', () => {
    assert.doesNotMatch(r.visible, /02\/11\/2026/);
  });
});

describe('cifras de referencia', () => {
  let p;
  let r;
  before(async () => {
    p = await panelDeSemilla();
    r = await p.abrir();
  });
  after(() => p.cerrar());

  test('004/SC-001 todas las cifras de referencia de la spec aparecen con su valor exacto', () => {
    // Tasa de no asistencia del periodo (RA3).
    assert.deepEqual(filasDeTabla(r.texto, 'Citas por profesional'), [
      ['María', '129', '13', '9', '9,2 %'], ['Jorge', '131', '14', '13', '9,7 %'],
      ['Lucía', '120', '19', '15', '13,7 %'], ['Toda la clínica', '380', '46', '37', '10,8 %'],
    ]);
    // Ocupación del periodo (RA4).
    assert.deepEqual(filasDeTabla(r.texto, 'Horas del periodo'), [
      ['María', '440 h', '103 h', '23,4 %'], ['Jorge', '440 h', '102 h', '23,2 %'],
      ['Lucía', '440 h', '69,5 h', '15,8 %'], ['Toda la clínica', '1.320 h', '274,5 h', '20,8 %'],
    ]);
    // Ocupación semanal por profesional (RA4).
    const semanal = [
      ['28,6 %', '21,8 %', '17,3 %'], ['27,3 %', '27,3 %', '15,9 %'], ['25,5 %', '24,5 %', '15,9 %'], ['25,0 %', '20,5 %', '18,2 %'],
      ['23,6 %', '28,6 %', '15,9 %'], ['20,5 %', '21,8 %', '17,3 %'], ['16,4 %', '20,5 %', '15,0 %'], ['20,5 %', '20,5 %', '10,9 %'],
    ];
    ['María', 'Jorge', 'Lucía'].forEach((nombre, j) => {
      const filas = filasDeGrafico(r.texto, `Ocupación de ${nombre}`).slice(0, 8);
      assert.deepEqual(filas.map((fila) => fila[1]), semanal.map((semana) => semana[j]), nombre);
    });
    // Evolución de la clínica.
    const evolucion = [
      ['07/09/2026', '42', '8', '7', '16,0 %', '22,6 %', '1.975,00 €'],
      ['14/09/2026', '49', '6', '3', '10,9 %', '23,5 %', '2.100,00 €'],
      ['21/09/2026', '50', '4', '4', '7,4 %', '22,0 %', '2.025,00 €'],
      ['28/09/2026', '51', '6', '3', '10,5 %', '21,2 %', '2.000,00 €'],
      ['05/10/2026', '54', '2', '5', '3,6 %', '22,7 %', '2.120,00 €'],
      ['12/10/2026', '49', '6', '4', '10,9 %', '19,8 %', '1.890,00 €'],
      ['19/10/2026', '43', '7', '5', '14,0 %', '17,3 %', '1.650,00 €'],
      ['26/10/2026', '42', '7', '6', '14,3 %', '17,3 %', '1.620,00 €'],
    ];
    const recuentos = filasDeTabla(r.texto, 'Citas por semana');
    const tasas = filasDeGrafico(r.texto, 'Tasa de no asistencia de la clínica');
    const ocupaciones = filasDeGrafico(r.texto, 'Ocupación de la clínica');
    const ingresos = filasDeGrafico(r.texto, 'Ingresos de la clínica');
    evolucion.forEach((fila, i) => {
      assert.deepEqual([...recuentos[i], tasas[i][1], ocupaciones[i][1], ingresos[i][1]], fila, fila[0]);
    });
    assert.deepEqual(recuentos[8], ['Total', '380', '46', '37']);
    assert.ok(r.visible.includes('Total de las 8 semanas: 15.380,00 €'));
  });

  test('004/FR-021 todas las escalas empiezan en cero', () => {
    const escalas = [...r.texto.matchAll(/<span class="grafico__escala">([^<]*)<\/span>/g)].map((m) => m[1]);
    assert.equal(escalas.length, 8);
    for (const escala of escalas) assert.match(escala, /^(Escala de 0 % a \d+ %|Escala desde 0,00 €)$/);
  });

  test('004/FR-022 los textos del panel no tienen jerga técnica ni estados en código', () => {
    assert.doesNotMatch(r.visible, /no_asistida|\breservada\b|\bcompletada\b|sin_cerrar|undefined|null|NaN|\[object/);
  });
});

describe('caso límite: citas sin cerrar dentro del periodo', () => {
  let p;
  let r;
  before(async () => {
    p = await panelDeSemilla({ momentoFijado: '2026-11-11T12:00' });
    r = await p.abrir();
  });
  after(() => p.cerrar());

  test('004/CL citas sin cerrar dentro del periodo: no cuentan, se avisa de 31 y la semana del 02/11 sale vacía', () => {
    assert.ok(r.visible.includes('Del 14/09/2026 al 08/11/2026'));
    assert.ok(r.visible.includes(AVISO_31));
    assert.deepEqual(filasDeTabla(r.texto, 'Citas por semana')[7], ['02/11/2026', '0', '0', '0']);
    assert.deepEqual(filasDeGrafico(r.texto, 'Ingresos de la clínica')[7], ['Semana del 02/11/2026', '0,00 €']);
    assert.deepEqual(filasDeGrafico(r.texto, 'Tasa de no asistencia de la clínica')[7], ['Semana del 02/11/2026', 'Sin datos']);
  });
});

/** El texto visible con las fechas cambiadas por un marcador, para comparar semillas de otros lunes. */
const sinFechas = (texto) => texto.replace(/\d{2}\/\d{2}\/\d{4}/g, 'dd/mm/aaaa');

describe('otra fecha de demostración', () => {
  let referencia;
  before(async () => {
    const p = await panelDeSemilla();
    referencia = (await p.abrir()).visible;
    await p.cerrar();
  });

  for (const [lunes, momentoFijado, periodo] of [
    ['2027-01-04', '2027-01-06T12:00', 'Del 09/11/2026 al 03/01/2027'],
    ['2027-04-05', '2027-04-07T12:00', 'Del 08/02/2027 al 04/04/2027'],
  ]) {
    test(`004/SC-005 004/FR-017 con la semilla del ${lunes}, las cifras son las mismas y solo cambian las fechas`, async () => {
      const p = await panelDeSemilla({ lunes, momentoFijado });
      try {
        const { visible } = await p.abrir();
        assert.ok(visible.includes(periodo), periodo);
        assert.equal(sinFechas(visible), sinFechas(referencia));
      } finally {
        await p.cerrar();
      }
    });
  }
});

describe('hora local de la clínica', () => {
  let e;
  let servidor;
  before(async () => {
    e = crearEscenario();
    citaDirecta(e.bd, {
      clinica: e.b.id, profesional: e.b.fisio, servicio: e.b.sesion, paciente: e.b.pacientes[0], inicio: '2026-11-02T09:00', estado: 'completada',
    });
    // Lunes 09/11/2026 a las 00:30 en la península, y todavía domingo 08/11 a las 23:30 en Canarias.
    servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-08T23:30:00Z') }));
  });
  after(async () => {
    await detener(servidor);
    e.cerrar();
  });

  test('004/FR-016 004/CL límite de semana: la semana cambia a las 00:00 del lunes en hora de la clínica, también en Canarias', async () => {
    const norte = textoVisible((await peticion(servidor, { ruta: '/analitica', cookie: sesionDePrueba(e.bd, e.a.id) })).texto);
    const sur = textoVisible((await peticion(servidor, { ruta: '/analitica', cookie: sesionDePrueba(e.bd, e.b.id) })).texto);
    assert.ok(norte.includes('Del 14/09/2026 al 08/11/2026'), norte.slice(0, 300));
    assert.ok(sur.includes('Del 07/09/2026 al 01/11/2026'), sur.slice(0, 300));
    assert.ok(sur.includes('Total del periodo: 0,00 €'), 'la cita del lunes 02/11 es de la semana en curso en Canarias');
  });
});
