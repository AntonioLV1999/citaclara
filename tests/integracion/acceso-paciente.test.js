import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { peticion, sesionPacienteDePrueba, textoVisible } from '../ayudas/escenario.js';
import {
  citaDe, enlaceCancelacionDePrueba, entrarComoPaciente, escenarioSemilla, fichaPorNombre, tokenInventado,
} from '../ayudas/portal.js';
import { anularEnlace } from '../../src/datos/pacientes.js';

let s;
let respuestaUniforme;

beforeEach(async () => {
  s = await escenarioSemilla();
  respuestaUniforme = (await peticion(s.servidor, { ruta: `/e/${tokenInventado()}` })).texto;
});
afterEach(() => s.cerrar());

const abrir = (token) => peticion(s.servidor, { ruta: `/e/${token}` });
const volcado = (tabla) => JSON.stringify(s.bd.prepare(`SELECT * FROM ${tabla} ORDER BY rowid`).all());
const enlaceVigente = (id) => s.bd.prepare('SELECT enlace FROM paciente WHERE id = ?').get(id).enlace;

/** RP7, 002/FR-025: se parte de un enlace del almacén, no del de demostración de la semilla. */
function fichaConEnlaceDelAlmacen(nombre) {
  const ficha = fichaPorNombre(s.bd, nombre);
  anularEnlace(s.bd, s.clinica.id, ficha.id);
  return { ...ficha, enlace: enlaceVigente(ficha.id) };
}

test('RP7 002/H1-E5 anular el enlace da uno nuevo, el anterior deja de funcionar y se cierran sus sesiones', async () => {
  const david = fichaConEnlaceDelAlmacen('David Gil');
  const cita = citaDe(s.bd, david.id, '2026-11-09T18:00');
  const deFicha = await entrarComoPaciente(s.servidor, david.enlace);
  const deCita = `sesion_paciente=${sesionPacienteDePrueba(s.bd, david.id, { citaId: cita.id })}`;
  assert.equal((await peticion(s.servidor, { ruta: '/portal', cookie: deFicha })).estado, 200);

  const nuevo = anularEnlace(s.bd, s.clinica.id, david.id);
  assert.match(nuevo, /^[0-9a-f]{32}$/);
  assert.notEqual(nuevo, david.enlace);
  assert.equal(enlaceVigente(david.id), nuevo);

  const anterior = await abrir(david.enlace);
  assert.equal(anterior.estado, 404);
  assert.equal(anterior.texto, respuestaUniforme);
  assert.equal(s.bd.prepare('SELECT count(*) AS n FROM sesion_paciente WHERE paciente_id = ?').get(david.id).n, 0);
  assert.equal((await peticion(s.servidor, { ruta: '/portal', cookie: deFicha })).estado, 401);
  assert.equal((await peticion(s.servidor, { metodo: 'POST', ruta: '/portal/salir', cookie: deCita })).estado, 401);

  assert.equal((await abrir(nuevo)).estado, 303);
});

test('RP7 002/H1-E6 anular el enlace personal de David Gil invalida el de cancelación de su recordatorio, y la cita sigue reservada', async () => {
  const david = fichaConEnlaceDelAlmacen('David Gil');
  const cita = citaDe(s.bd, david.id, '2026-11-09T18:00');
  const cancelacion = enlaceCancelacionDePrueba(s.bd, cita.id);
  assert.equal((await abrir(cancelacion)).estado, 303);
  const fila = volcado('cita');

  anularEnlace(s.bd, s.clinica.id, david.id);

  const r = await abrir(cancelacion);
  assert.equal(r.estado, 404);
  assert.equal(r.texto, respuestaUniforme);
  assert.equal(s.bd.prepare('SELECT estado FROM cita WHERE id = ?').get(cita.id).estado, 'reservada');
  assert.equal(volcado('cita'), fila);
  assert.equal(s.bd.prepare('SELECT count(*) AS n FROM enlace_cancelacion WHERE cita_id = ?').get(cita.id).n, 0);
});

test('RP7 anular un enlace no toca los enlaces de cancelación ni las sesiones de otras fichas, ni ninguna cita', async () => {
  const david = fichaConEnlaceDelAlmacen('David Gil');
  const isabel = fichaConEnlaceDelAlmacen('Isabel Navarro');
  const citaIsabel = citaDe(s.bd, isabel.id, '2026-11-10T18:00');
  const cancelacionIsabel = enlaceCancelacionDePrueba(s.bd, citaIsabel.id);
  enlaceCancelacionDePrueba(s.bd, citaDe(s.bd, david.id, '2026-11-09T19:00').id);
  const sesionIsabel = await entrarComoPaciente(s.servidor, isabel.enlace);
  sesionPacienteDePrueba(s.bd, isabel.id, { citaId: citaIsabel.id });
  const citas = volcado('cita');
  const deIsabel = () => JSON.stringify([
    s.bd.prepare('SELECT * FROM sesion_paciente WHERE paciente_id = ? ORDER BY rowid').all(isabel.id).map(({ token_hash: t, cita_id: c }) => [t, c]),
    s.bd.prepare('SELECT * FROM enlace_cancelacion WHERE cita_id = ?').all(citaIsabel.id),
  ]);
  const antes = deIsabel();

  anularEnlace(s.bd, s.clinica.id, david.id);

  assert.equal(deIsabel(), antes);
  assert.equal(volcado('cita'), citas);
  assert.equal(enlaceVigente(isabel.id), isabel.enlace);
  assert.equal((await peticion(s.servidor, { ruta: '/portal', cookie: sesionIsabel })).estado, 200);
  assert.equal((await abrir(cancelacionIsabel)).estado, 303);
});

test('RP7 anular el enlace de una ficha de otra clínica no cambia nada', () => {
  const david = fichaConEnlaceDelAlmacen('David Gil');
  assert.equal(anularEnlace(s.bd, s.clinica.id + 999, david.id), undefined);
  assert.equal(enlaceVigente(david.id), david.enlace);
});

test('002/CL Enlace personal reenviado: quien lo tenga ve las citas de la ficha, y tras anularlo ya no', async () => {
  const david = fichaConEnlaceDelAlmacen('David Gil');
  // Otra persona, en otro navegador, con el enlace reenviado.
  const ajena = await entrarComoPaciente(s.servidor, david.enlace);
  const pagina = await peticion(s.servidor, { ruta: '/portal', cookie: ajena });
  assert.match(textoVisible(pagina.texto), /David Gil/);

  anularEnlace(s.bd, s.clinica.id, david.id);
  const despues = await peticion(s.servidor, { ruta: '/portal', cookie: ajena });
  assert.equal(despues.estado, 401);
  assert.doesNotMatch(despues.texto, /David Gil/);
  assert.equal((await abrir(david.enlace)).texto, respuestaUniforme);
});
