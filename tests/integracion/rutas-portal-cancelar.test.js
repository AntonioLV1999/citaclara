import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { clinicaPorId } from '../../src/datos/catalogo.js';
import { insertarCita } from '../../src/datos/citas.js';
import { aplicarAccion } from '../../src/servicios/cambio-estado.js';
import { cancelarCita } from '../../src/servicios/cancelar.js';
import { detener, peticion, textoVisible } from '../ayudas/escenario.js';
import {
  AHORA, citaDe, entrarComoPaciente, escenarioSemilla, fichaPorNombre, filaCita, servidorSobre,
} from '../ayudas/portal.js';

let s;

beforeEach(async () => { s = await escenarioSemilla(); });
afterEach(() => s.cerrar());

const entrar = (nombre, servidor = s.servidor) => entrarComoPaciente(servidor, fichaPorNombre(s.bd, nombre).enlace);
const confirmacion = (id, cookie, servidor = s.servidor) => peticion(servidor, { ruta: `/portal/citas/${id}/cancelar`, cookie });
const cancelar = (id, cookie, servidor = s.servidor) => peticion(servidor, {
  metodo: 'POST', ruta: `/portal/citas/${id}/cancelar`, cookie, formulario: {},
});
const contextoDeRecepcion = (momentoFijado = AHORA) => ({
  bd: s.bd, clinica: clinicaPorId(s.bd, s.clinica.id), ahora: () => new Date(), momentoFijado,
});
const citaDeDavid = (inicio) => citaDe(s.bd, fichaPorNombre(s.bd, 'David Gil').id, inicio);
const citaDeJavier = () => citaDe(s.bd, fichaPorNombre(s.bd, 'Javier Peña').id, '2026-11-04T12:15');

test('002/H3-E1 002/FR-014 «Cancelar» pide confirmación mostrando la cita y avisando de que no se puede deshacer', async () => {
  const cita = citaDeDavid('2026-11-09T18:00');
  const r = await confirmacion(cita.id, await entrar('David Gil'));
  assert.equal(r.estado, 200);
  const texto = textoVisible(r.texto);
  assert.match(texto, /¿Cancelar esta cita\?/);
  assert.match(texto, /lun 09\/11\/2026, 18:00–18:45/);
  assert.match(texto, /Sesión de fisioterapia con María/);
  assert.match(texto, /Si la cancelas, no se puede deshacer\./);
  assert.match(r.texto, /<form[^>]*method="post"[^>]*action="\/portal\/citas\/\d+\/cancelar"/);
  assert.match(texto, /Sí, cancelar la cita/);
  assert.match(texto, /No, volver a mis citas/);
  assert.deepEqual(filaCita(s.bd, cita.id), cita);
});

test('002/H3-E2 002/FR-016 RP4 al aceptar, la cita queda cancelada por el portal y pasa al historial con su etiqueta', async () => {
  const cita = citaDeDavid('2026-11-09T18:00');
  const cookie = await entrar('David Gil');
  const r = await cancelar(cita.id, cookie);
  assert.equal(r.estado, 200);
  const texto = textoVisible(r.texto);
  assert.match(texto, /Cita cancelada/);
  assert.match(texto, /Tu cita del lun 09\/11\/2026 a las 18:00 con María está cancelada\. Si quieres pedir otra, llama a la clínica\./);
  assert.match(r.texto, /<main[\s\S]*href="tel:000200000"/);

  const fila = filaCita(s.bd, cita.id);
  assert.equal(fila.estado, 'cancelada');
  assert.equal(fila.origen_cancelacion, 'portal');
  assert.equal(fila.momento_cancelacion, '2026-11-04T12:00');

  const portal = (await peticion(s.servidor, { ruta: '/portal', cookie })).texto;
  const historial = portal.match(/<section[^>]*id="historial"[\s\S]*?<\/section>/)[0];
  const proximas = portal.match(/<section[^>]*id="proximas"[\s\S]*?<\/section>/)[0];
  assert.match(textoVisible(historial), /lun 09\/11\/2026, 18:00–18:45 Sesión de fisioterapia con María Cancelada por el paciente el 04\/11\/2026 a las 12:00/);
  assert.doesNotMatch(proximas, /18:00–18:45/);
  assert.match(textoVisible(proximas), /lun 09\/11\/2026, 19:00–19:30 Consulta de nutrición con Lucía Reservada/);
  assert.equal(filaCita(s.bd, citaDeDavid('2026-11-09T19:00').id).estado, 'reservada');
});

test('002/H3-E3 al rechazar la confirmación, la cita sigue reservada y nada cambia', async () => {
  const cita = citaDeDavid('2026-11-09T18:00');
  const r = await confirmacion(cita.id, await entrar('David Gil'));
  assert.match(r.texto, /<a[^>]*href="\/portal"[^>]*>No, volver a mis citas<\/a>/);
  assert.deepEqual(filaCita(s.bd, cita.id), cita);
});

test('002/H3-E4 002/FR-017 la cita de Javier Peña de las 12:15 no ofrece cancelar, y si se intenta, explica hasta cuándo se podía', async () => {
  const cita = citaDeJavier();
  const cookie = await entrar('Javier Peña');
  const pagina = await confirmacion(cita.id, cookie);
  assert.equal(pagina.estado, 200);
  assert.doesNotMatch(pagina.texto, /Sí, cancelar la cita|<form[^>]*\/cancelar/);
  assert.match(textoVisible(pagina.texto), /se podía hasta el mié 04\/11\/2026 a las 10:15/);

  const r = await cancelar(cita.id, cookie);
  assert.equal(r.estado, 409);
  const texto = textoVisible(r.texto);
  assert.match(texto, /Ya no se puede cancelar desde aquí/);
  assert.match(texto, /Se podía cancelar hasta el mié 04\/11\/2026 a las 10:15\. Si no puedes venir, llama a la clínica\./);
  assert.match(r.texto, /<main[\s\S]*href="tel:000200000"/);
  assert.deepEqual(filaCita(s.bd, cita.id), cita);
});

test('002/H3-E5 fuera de plazo, la cita tampoco se cancela por otra vía distinta de la pantalla, ni por el correo', () => {
  const cita = citaDeJavier();
  for (const canal of ['portal', 'correo']) {
    const r = cancelarCita(contextoDeRecepcion(), cita.id, canal);
    assert.equal(r.resultado, 'fuera_de_plazo', canal);
    assert.equal(r.limite, '2026-11-04T10:15');
  }
  assert.deepEqual(filaCita(s.bd, cita.id), cita);
});

test('002/H3-E6 002/FR-017 una cita ya cancelada por recepción: el portal dice que ya está cancelada y no cambia su origen', async () => {
  const cita = citaDeDavid('2026-11-09T18:00');
  const cookie = await entrar('David Gil');
  assert.equal(cancelarCita(contextoDeRecepcion('2026-11-04T11:30'), cita.id, 'recepcion').resultado, 'cancelada_ahora');

  const r = await cancelar(cita.id, cookie);
  assert.equal(r.estado, 409);
  const texto = textoVisible(r.texto);
  assert.match(texto, /Tus citas/);
  assert.match(texto, /Esta cita ya está cancelada\. No tienes que hacer nada más\./);
  assert.match(textoVisible(r.texto.match(/<section[^>]*id="historial"[\s\S]*?<\/section>/)[0]), /lun 09\/11\/2026, 18:00–18:45 Sesión de fisioterapia con María Cancelada/);
  const fila = filaCita(s.bd, cita.id);
  assert.equal(fila.origen_cancelacion, 'recepcion');
  assert.equal(fila.momento_cancelacion, '2026-11-04T11:30');
});

test('002/H3-E7 002/FR-017 una doble pulsación, seguida o a la vez, se ve como hecha y cancela una sola vez', async () => {
  const seguidas = citaDeDavid('2026-11-09T18:00');
  const aLaVez = citaDeDavid('2026-11-09T19:00');
  const cookie = await entrar('David Gil');

  const respuestas = [await cancelar(seguidas.id, cookie), await cancelar(seguidas.id, cookie),
    ...await Promise.all([cancelar(aLaVez.id, cookie), cancelar(aLaVez.id, cookie)])];
  for (const r of respuestas) {
    assert.equal(r.estado, 200);
    assert.match(textoVisible(r.texto), /Cita cancelada/);
    assert.doesNotMatch(r.texto, /aviso--error/);
  }
  for (const { id } of [seguidas, aLaVez]) {
    const fila = filaCita(s.bd, id);
    assert.equal(fila.estado, 'cancelada');
    assert.equal(fila.origen_cancelacion, 'portal');
    assert.equal(fila.momento_cancelacion, AHORA);
  }
});

test('002/FR-017 una cita completada o no asistida del historial no se cancela, y se explica su estado', async () => {
  const david = fichaPorNombre(s.bd, 'David Gil');
  const cookie = await entrar('David Gil');
  for (const [estado, texto] of [['completada', 'completada'], ['no_asistida', 'no asistida']]) {
    const cita = s.bd.prepare('SELECT * FROM cita WHERE paciente_id = ? AND estado = ? ORDER BY inicio DESC').get(david.id, estado);
    const r = await cancelar(cita.id, cookie);
    assert.equal(r.estado, 409, estado);
    assert.match(textoVisible(r.texto), /Esta cita ya no se puede cancelar/);
    assert.match(textoVisible(r.texto), new RegExp(`Consta como ${texto}\\. Si crees que es un error, llama a la clínica\\.`));
    assert.match(r.texto, /<main[\s\S]*href="tel:000200000"/);
    assert.deepEqual(filaCita(s.bd, cita.id), cita);
  }
});

test('RP1 002/FR-015 cancelar una cita de otro paciente responde como una que no existe, y no la cambia', async () => {
  const ajena = citaDe(s.bd, fichaPorNombre(s.bd, 'Cristina Ortega').id, '2026-11-11T11:15');
  const cookie = await entrar('David Gil');
  const r = await cancelar(ajena.id, cookie);
  const inexistente = await cancelar(999999, cookie);
  assert.equal(r.estado, 404);
  assert.equal(r.texto, inexistente.texto);
  assert.match(textoVisible(r.texto), /No encontramos esa cita/);
  assert.deepEqual(filaCita(s.bd, ajena.id), ajena);
});

test('002/CL El plazo vence con la página abierta: el límite se comprueba al cancelar, no al cargar', async () => {
  const antes = await servidorSobre(s.bd, { momentoFijado: '2026-11-04T10:14' });
  const despues = await servidorSobre(s.bd, { momentoFijado: '2026-11-04T10:16' });
  try {
    const cita = citaDeJavier();
    const cookie = await entrar('Javier Peña', antes);
    const abierta = await confirmacion(cita.id, cookie, antes);
    assert.match(textoVisible(abierta.texto), /Sí, cancelar la cita/);
    const r = await cancelar(cita.id, cookie, despues);
    assert.equal(r.estado, 409);
    assert.match(textoVisible(r.texto), /Ya no se puede cancelar desde aquí/);
    assert.deepEqual(filaCita(s.bd, cita.id), cita);
  } finally {
    await detener(antes);
    await detener(despues);
  }
});

test('002/CL Cancelar y completar a la vez: solo cambia el estado una vez, y el portal da el mensaje del estado resultante', async () => {
  const david = fichaPorNombre(s.bd, 'David Gil');
  const servicio = s.bd.prepare("SELECT * FROM servicio WHERE nombre = 'Consulta de nutrición'").get();
  const lucia = s.bd.prepare("SELECT * FROM profesional WHERE nombre = 'Lucía'").get();
  const id = insertarCita(s.bd, {
    clinicaId: s.clinica.id, profesionalId: lucia.id, servicioId: servicio.id, pacienteId: david.id, inicio: '2026-11-04T11:45', fin: '2026-11-04T12:15',
  });
  const cookie = await entrar('David Gil');
  const [portal, recepcion] = await Promise.all([
    cancelar(id, cookie),
    Promise.resolve().then(() => aplicarAccion(contextoDeRecepcion(), id, 'completar')),
  ]);
  const fila = filaCita(s.bd, id);
  assert.equal(fila.estado, 'completada');
  assert.equal(recepcion.ok, true);
  assert.equal(portal.estado, 409);
  assert.match(textoVisible(portal.texto), /Esta cita ya no se puede cancelar|Ya no se puede cancelar desde aquí/);
  if (/Esta cita ya no se puede cancelar/.test(portal.texto)) assert.match(textoVisible(portal.texto), /Consta como completada/);
});

test('002/CL Cita ya empezada y sin cerrar: nunca se cancela desde el portal', async () => {
  const cita = citaDeDavid('2026-11-02T15:15');
  const r = await cancelar(cita.id, await entrar('David Gil'));
  assert.equal(r.estado, 409);
  assert.match(textoVisible(r.texto), /Ya no se puede cancelar desde aquí/);
  assert.equal(filaCita(s.bd, cita.id).estado, 'reservada');
});

test('002/CL Cancelación con la clínica cerrada: la cita de Isabel Serrano del lunes a las 10:30 se cancela hasta las 08:30', async () => {
  const cita = citaDe(s.bd, fichaPorNombre(s.bd, 'Isabel Serrano').id, '2026-11-09T10:30');
  const tarde = await servidorSobre(s.bd, { momentoFijado: '2026-11-09T08:31' });
  const temprano = await servidorSobre(s.bd, { momentoFijado: '2026-11-09T08:30' });
  try {
    const cookie = await entrar('Isabel Serrano', tarde);
    assert.equal((await cancelar(cita.id, cookie, tarde)).estado, 409);
    assert.equal(filaCita(s.bd, cita.id).estado, 'reservada');
    assert.equal((await cancelar(cita.id, cookie, temprano)).estado, 200);
    assert.equal(filaCita(s.bd, cita.id).momento_cancelacion, '2026-11-09T08:30');
  } finally {
    await detener(tarde);
    await detener(temprano);
  }
});

test('002/CL Paciente que quiere cambiar la cita: tras cancelar se le ofrece el teléfono para pedir otra', async () => {
  const r = await cancelar(citaDeDavid('2026-11-09T18:00').id, await entrar('David Gil'));
  const principal = r.texto.match(/<main[\s\S]*<\/main>/)[0];
  assert.match(principal, /href="tel:000200000"[^>]*>Llamar a la clínica: 000 200 000</);
  assert.match(textoVisible(principal), /Si quieres pedir otra, llama a la clínica\./);
});
