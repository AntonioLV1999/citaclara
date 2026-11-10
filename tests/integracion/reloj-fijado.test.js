import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible,
} from '../ayudas/escenario.js';
import { profesionales, serviciosDeEspecialidad } from '../../src/datos/catalogo.js';
import { citasDelDia } from '../../src/datos/citas.js';
import { sumarMinutos } from '../../src/dominio/tiempo.js';
import { cargar } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { crearServidor } from '../../src/web/servidor.js';

const PRINCIPAL = fileURLToPath(new URL('../../src/principal.js', import.meta.url));
const MOMENTO = '2026-11-04T12:00';
const DIA = '2026-11-04';
const AVISO = 'Reloj de demostración: la hora está fijada en el miércoles 04/11/2026 a las 12:00 y no avanza.';
// El reloj real va por otro día y otra hora: con el momento fijado no debe notarse.
const RELOJ_REAL = '2026-11-20T09:00:00+01:00';

let e;
let eleva;
let cookie;
const servidores = [];

before(() => {
  e = crearEscenario();
  cargar(e.bd, generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO }));
  eleva = e.bd.prepare("SELECT * FROM clinica WHERE nombre = 'Clínica Eleva'").get();
  cookie = sesionDePrueba(e.bd, eleva.id);
});
after(async () => {
  await Promise.all(servidores.map(detener));
  e.cerrar();
});

async function arrancar(opciones = {}) {
  const servidor = await escuchar(crearServidor({
    bd: e.bd, ahora: relojFijo(RELOJ_REAL), momentoFijado: MOMENTO, ...opciones,
  }));
  servidores.push(servidor);
  return servidor;
}

const pedir = async (ruta, opciones) => peticion(await arrancar(opciones), { ruta, cookie });

/** Profesional y servicio de Clínica Eleva con las 11:45 y las 12:00 libres el día fijado. */
function tramoLibre() {
  for (const profesional of profesionales(e.bd, eleva.id)) {
    const citas = citasDelDia(e.bd, eleva.id, profesional.id, DIA)
      .filter((c) => c.estado === 'reservada' || c.estado === 'completada');
    for (const servicio of serviciosDeEspecialidad(e.bd, eleva.id, profesional.especialidad)) {
      const desde = `${DIA}T11:45`;
      const hasta = sumarMinutos(`${DIA}T12:00`, servicio.duracion_min);
      if (!citas.some((c) => c.inicio < hasta && desde < c.fin)) return { profesional, servicio };
    }
  }
  throw new Error('La semilla no deja ningún tramo libre a mediodía del 04/11/2026');
}

describe('H5-E5 FR-043 servidor con el momento de referencia', () => {
  test('H5-E5 la agenda se abre el miércoles 04/11/2026', async () => {
    const r = await pedir('/agenda');
    assert.equal(r.estado, 200);
    assert.match(textoVisible(r.texto), /Miércoles 04\/11\/2026/);
  });

  test('H5-E5 RN2 no se ofrece reservar antes de las 12:00', async () => {
    const { profesional } = tramoLibre();
    const r = await pedir(`/agenda?profesional=${profesional.id}&dia=${DIA}`);
    const reservas = [...r.texto.matchAll(/hora=(\d\d:\d\d)">Reservar</g)].map((m) => m[1]);
    assert.ok(reservas.length > 0);
    assert.ok(reservas.every((h) => h >= '12:00'), JSON.stringify(reservas));
    assert.match(textoVisible(r.texto), /Ya ha pasado/);
  });

  test('H5-E5 RN2 reservar a las 11:45 da 422 con el mensaje de RN2, y a las 12:00 se acepta', async () => {
    const { profesional, servicio } = tramoLibre();
    const servidor = await arrancar();
    const reservar = (hora) => peticion(servidor, {
      metodo: 'POST',
      ruta: '/citas',
      cookie,
      formulario: {
        profesional: profesional.id, servicio: servicio.id, dia: '04/11/2026', hora, paciente: '',
        paciente_nombre: 'Prueba Reloj', paciente_telefono: '600 000 999',
      },
    });
    const temprano = await reservar('11:45');
    assert.equal(temprano.estado, 422);
    assert.ok(textoVisible(temprano.texto).includes('Esa hora ya ha pasado. Elige una hora a partir de ahora.'));
    const aTiempo = await reservar('12:00');
    assert.equal(aTiempo.estado, 303);
  });

  test('H5-E5 FR-043 el aviso del reloj aparece en todas las pantallas de recepción', async () => {
    // FR-031: la semilla tiene reservas cada día de las semanas futuras.
    const cita = e.bd.prepare("SELECT id FROM cita WHERE clinica_id = ? AND inicio LIKE ? || '%'").get(eleva.id, DIA);
    const servidor = await arrancar();
    const pantallas = [
      ['/acceso', undefined],
      ['/agenda', cookie],
      ['/citas/nueva', cookie],
      [`/citas/${cita.id}/confirmar?accion=cancelar`, cookie],
      ['/no-existe', cookie],
      ['/citas/999999/confirmar?accion=cancelar', cookie],
    ];
    for (const [ruta, galleta] of pantallas) {
      const r = await peticion(servidor, { ruta, cookie: galleta });
      assert.ok(textoVisible(r.texto).includes(AVISO), `${ruta} (${r.estado})`);
    }
  });

  test('FR-043 el aviso aparece también en la página de un POST sin sesión', async () => {
    const r = await peticion(await arrancar(), { metodo: 'POST', ruta: '/citas', formulario: {} });
    assert.equal(r.estado, 401);
    assert.ok(textoVisible(r.texto).includes(AVISO));
  });

  test('FR-043 sin momento fijado, el aviso no aparece', async () => {
    for (const ruta of ['/acceso', '/agenda', '/citas/nueva']) {
      const r = await pedir(ruta, { momentoFijado: null });
      assert.doesNotMatch(textoVisible(r.texto), /Reloj de demostración/, ruta);
    }
  });

  test('FR-043 el reloj no avanza: con otro ahora() se ven el mismo día y los mismos huecos', async () => {
    let instante = Date.parse(RELOJ_REAL);
    const servidor = await arrancar({ ahora: () => new Date(instante) });
    const { profesional } = tramoLibre();
    const ruta = `/agenda?profesional=${profesional.id}`;
    const primera = await peticion(servidor, { ruta, cookie });
    instante += 7 * 3_600_000;
    const segunda = await peticion(servidor, { ruta, cookie });
    assert.equal(segunda.texto, primera.texto);
  });
});

describe('FR-043 arranque con un momento mal escrito', () => {
  test('FR-043 el servidor no arranca, explica el formato y no crea la carpeta de datos', () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'citaclara-arranque-'));
    try {
      const r = spawnSync(process.execPath, [PRINCIPAL], {
        cwd: carpeta,
        encoding: 'utf8',
        env: { ...process.env, CITACLARA_AHORA: '2026-11-04 12:00', PORT: '0' },
        timeout: 20_000,
      });
      assert.notEqual(r.status, 0);
      assert.equal(
        r.stderr.trim(),
        'El momento de referencia CITACLARA_AHORA no es válido. Escríbelo como AAAA-MM-DDTHH:MM, por ejemplo 2026-11-04T12:00.',
      );
      assert.equal(existsSync(join(carpeta, 'datos')), false);
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });
});
