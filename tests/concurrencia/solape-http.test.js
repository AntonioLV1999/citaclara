import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba,
} from '../ayudas/escenario.js';
import { crearServidor } from '../../src/web/servidor.js';
import { esDiaLaborable, sumarDias } from '../../src/dominio/tiempo.js';

const PETICIONES = 5;
const RONDAS = 100;
let e;
let servidor;
let cookie;

before(async () => {
  e = crearEscenario();
  servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-09T08:00:00+01:00') }));
  cookie = sesionDePrueba(e.bd, e.a.id);
});
after(async () => {
  await detener(servidor);
  e.cerrar();
});

const alta = (formulario) => peticion(servidor, { metodo: 'POST', ruta: '/citas', cookie, formulario });
const contar = (tabla) => e.bd.prepare(`SELECT count(*) AS n FROM ${tabla}`).get().n;

function dias(cantidad, desde) {
  const lista = [];
  for (let dia = desde; lista.length < cantidad; dia = sumarDias(dia, 1)) {
    if (esDiaLaborable(dia)) lista.push(dia);
  }
  return lista;
}

test('RN1 H1-E7 100 rondas de POST /citas a la vez: exactamente un 303 y el resto 409', { timeout: 120_000 }, async () => {
  for (const [ronda, dia] of dias(RONDAS, '2027-01-04').entries()) {
    const exacto = ronda % 2 === 0;
    const horas = ['10:00', '10:15', '10:30', '10:45', '10:00'];
    const respuestas = await Promise.all(Array.from({ length: PETICIONES }, (_, i) => alta({
      profesional: e.a.fisio,
      servicio: e.a.primeraFisio,
      paciente: e.a.pacientes[0],
      dia,
      hora: exacto ? '10:00' : horas[i],
    })));
    const estados = respuestas.map((r) => r.estado).sort();
    assert.deepEqual(estados, [303, 409, 409, 409, 409], `ronda ${ronda}`);
  }
  assert.equal(contar('cita'), RONDAS);
});

test('RN1 FR-013 con paciente nuevo, las peticiones rechazadas a la vez no dejan ficha', async () => {
  const antes = contar('paciente');
  const respuestas = await Promise.all(Array.from({ length: PETICIONES }, (_, i) => alta({
    profesional: e.a.fisio2,
    servicio: e.a.sesion,
    dia: '2027-01-04',
    hora: '10:00',
    paciente_nombre: `Paciente nuevo ${i}`,
    paciente_telefono: '600111222',
  })));
  assert.deepEqual(respuestas.map((r) => r.estado).sort(), [303, 409, 409, 409, 409]);
  assert.equal(contar('paciente'), antes + 1);
});
