import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { citaDirecta, crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible } from '../ayudas/escenario.js';
import { panelDeSemilla } from '../ayudas/panel.js';
import { crearServidor } from '../../src/web/servidor.js';

const PERIODO = 'Del 07/09/2026 al 01/11/2026: las 8 últimas semanas completas. La semana en curso no cuenta hasta que termina.';
const AVISO_31 = 'Hay 31 citas sin cerrar en este periodo: ya ha pasado su hora y siguen como reservadas. '
  + 'No cuentan en ninguna cifra, y las cifras estarán completas cuando recepción las cierre.';
const AVISO_1 = 'Hay 1 cita sin cerrar en este periodo: ya ha pasado su hora y sigue como reservada. '
  + 'No cuenta en ninguna cifra, y las cifras estarán completas cuando recepción la cierre.';

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
