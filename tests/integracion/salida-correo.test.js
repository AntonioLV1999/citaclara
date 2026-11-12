import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { citaDirecta, crearEscenario, detener, escuchar, peticion, textoVisible } from '../ayudas/escenario.js';
import { leerEml } from '../ayudas/correo.js';
import { ponerCorreo } from '../ayudas/recordatorios.js';
import { abrirBd } from '../../src/datos/bd.js';
import { cargar } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { reiniciarIntentos } from '../../src/servicios/acceso-paciente.js';
import { ejecutarRecordatorios } from '../../src/servicios/recordatorios.js';
import { crearEscritorEml } from '../../src/servicios/salida-correo.js';
import { crearServidor } from '../../src/web/servidor.js';

const AHORA = '2026-11-02T08:00';
const MANANA = '2026-11-03';
const AVISO_SMTP = 'Hay un servidor de correo configurado, pero el envío real está desactivado hasta que se '
  + 'cumplan las condiciones para usar datos reales. Los recordatorios se han escrito en datos/salida-correo/.';
let carpetas;

beforeEach(() => { carpetas = []; });
afterEach(() => { for (const c of carpetas) rmSync(c, { recursive: true, force: true }); });

function carpetaTemporal() {
  const c = mkdtempSync(join(tmpdir(), 'citaclara-salida-'));
  carpetas.push(c);
  return c;
}

/** El proceso como lo lanza `npm run recordatorios`, con el escritor de ficheros en `salida`. */
function ejecutar(bd, salida, { momentoFijado = AHORA, smtpConfigurado = false, direccion = 'http://localhost:3000', clinicas } = {}) {
  const lineas = [];
  const resumenes = ejecutarRecordatorios({ bd, ahora: () => new Date(), momentoFijado }, {
    clinicas, direccion, enviar: crearEscritorEml(salida), smtpConfigurado, registro: null, salida: (l) => lineas.push(l),
  });
  return { resumenes, lineas };
}

function escenarioConCitas() {
  const e = crearEscenario();
  const [ana, oscar] = e.a.pacientes;
  ponerCorreo(e.bd, ana, 'ana@example.com');
  ponerCorreo(e.bd, oscar, 'oscar@example.com');
  const citas = [[ana, '09:00'], [oscar, '10:00']].map(([paciente, hora]) => citaDirecta(e.bd, {
    clinica: e.a.id, profesional: e.a.fisio, servicio: e.a.sesion, paciente, inicio: `${MANANA}T${hora}`,
  }));
  return { e, citas };
}

const emls = (carpeta) => readdirSync(carpeta).filter((f) => f.endsWith('.eml')).sort();

test('003/H3-E1 003/FR-019 cada recordatorio es un fichero .eml propio, y un fichero anterior de la misma cita no se sobrescribe', () => {
  const { e, citas } = escenarioConCitas();
  try {
    const salida = join(carpetaTemporal(), 'datos', 'salida-correo');
    const { resumenes } = ejecutar(e.bd, salida, { clinicas: [e.a] });
    assert.equal(resumenes[0].enviados, 2);
    const nombres = emls(salida);
    assert.equal(nombres.length, 2);
    citas.forEach((id, i) => assert.match(nombres[i], new RegExp(`^recordatorio-${id}-[0-9a-f]{8}\\.eml$`)));

    // Otra base con los mismos números de cita, como tras regenerar la semilla, sobre la misma carpeta.
    const anterior = join(salida, nombres[0]);
    const contenido = readFileSync(anterior, 'utf8');
    writeFileSync(join(salida, `recordatorio-${citas[0]}-00000000.eml`), 'fichero de otra ejecución');
    const otra = escenarioConCitas();
    try {
      ejecutar(otra.e.bd, salida, { clinicas: [otra.e.a] });
    } finally {
      otra.e.cerrar();
    }
    assert.equal(readFileSync(anterior, 'utf8'), contenido);
    assert.equal(readFileSync(join(salida, `recordatorio-${citas[0]}-00000000.eml`), 'utf8'), 'fichero de otra ejecución');
    assert.equal(emls(salida).filter((f) => f.startsWith(`recordatorio-${citas[0]}-`)).length, 3);
  } finally {
    e.cerrar();
  }
});

test('003/H3-E2 003/FR-020 un recordatorio simulado cuenta como enviado y no se repite', () => {
  const { e, citas } = escenarioConCitas();
  try {
    const salida = carpetaTemporal();
    ejecutar(e.bd, salida, { clinicas: [e.a] });
    const modos = e.bd.prepare('SELECT modo FROM recordatorio WHERE cita_id IN (?, ?)').all(...citas).map((f) => f.modo);
    assert.deepEqual(modos, ['simulado', 'simulado']);
    assert.equal(ejecutar(e.bd, salida, { clinicas: [e.a] }).resumenes[0].enviados, 0);
    assert.equal(emls(salida).length, 2);
  } finally {
    e.cerrar();
  }
});

test('003/H3-E4 003/FR-018 con un servidor de correo configurado, los mismos ficheros, el aviso una sola vez y ningún módulo de red', () => {
  const { e } = escenarioConCitas();
  try {
    const salida = carpetaTemporal();
    const { resumenes, lineas } = ejecutar(e.bd, salida, { smtpConfigurado: true });
    assert.equal(resumenes.length, 2);
    assert.equal(emls(salida).length, 2);
    assert.deepEqual(lineas.filter((l) => l === AVISO_SMTP), [AVISO_SMTP]);
    assert.equal(lineas.at(-1), AVISO_SMTP);
    assert.equal(ejecutar(e.bd, carpetaTemporal()).lineas.includes(AVISO_SMTP), false);
  } finally {
    e.cerrar();
  }
  // Nada de la 003 puede abrir una conexión: ni red, ni resolución de nombres.
  const raiz = new URL('../../src/', import.meta.url);
  const modulos = [
    ...readdirSync(new URL('servicios/', raiz)).map((f) => `servicios/${f}`),
    'dominio/recordatorio.js', 'datos/recordatorios.js', 'recordatorios.js', 'configuracion.js',
  ];
  for (const modulo of modulos) {
    const codigo = readFileSync(new URL(modulo, raiz), 'utf8');
    assert.doesNotMatch(codigo, /from\s+['"](node:)?(net|tls|dns|http|https|dgram)['"]/, modulo);
    assert.doesNotMatch(codigo, /\bfetch\(/, modulo);
  }
});

test('003/H3-E3 el fichero se lee como un correo: destinatario, asunto, datos de la cita y un enlace que abre su confirmación', async () => {
  reiniciarIntentos();
  const { e, citas } = escenarioConCitas();
  const servidor = await escuchar(crearServidor({ bd: e.bd, ahora: () => new Date(), momentoFijado: AHORA }));
  try {
    const direccion = `http://127.0.0.1:${servidor.address().port}`;
    const salida = carpetaTemporal();
    ejecutar(e.bd, salida, { direccion, clinicas: [e.a] });
    const [primero] = emls(salida);
    assert.match(primero, new RegExp(`^recordatorio-${citas[0]}-`));
    const { cabeceras, cuerpo } = leerEml(readFileSync(join(salida, primero), 'utf8'));
    assert.equal(cabeceras.to, 'ana@example.com');
    assert.equal(cabeceras.subject, 'Recordatorio de tu cita del martes 03/11/2026 a las 09:00');
    assert.match(cuerpo, /Día: martes 03\/11\/2026\r\nHora: 09:00\r\nProfesional: María\r\nServicio: Sesión de fisioterapia\r\n/);

    const enlace = cuerpo.split('\r\n').find((linea) => linea.startsWith(`${direccion}/e/`));
    const entrada = await fetch(enlace, { redirect: 'manual' });
    assert.equal(entrada.status, 303);
    const cookie = entrada.headers.getSetCookie()[0].split(';')[0];
    const pantalla = await peticion(servidor, { ruta: entrada.headers.get('location'), cookie });
    assert.equal(pantalla.estado, 200);
    assert.match(textoVisible(pantalla.texto), /Cancelar tu cita .*martes 03\/11\/2026 a las 09:00 Sesión de fisioterapia con María Clínica Norte/);
  } finally {
    await detener(servidor);
    e.cerrar();
  }
});

test('003/H3-E5 con la misma semilla y el mismo momento, los destinatarios y el contenido son idénticos salvo el enlace', () => {
  const procesar = () => {
    const carpeta = carpetaTemporal();
    const bd = abrirBd(join(carpeta, 'semilla.db'));
    try {
      cargar(bd, generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO }));
      const salida = join(carpeta, 'salida');
      ejecutar(bd, salida);
      return emls(salida).map((nombre) => [
        nombre.replace(/-[0-9a-f]{8}\.eml$/, ''),
        readFileSync(join(salida, nombre), 'utf8').replace(/\/e\/[0-9a-f]{32}\r\n/, '/e/<enlace>\r\n'),
      ]);
    } finally {
      bd.close();
    }
  };
  const primera = procesar();
  const segunda = procesar();
  assert.equal(primera.length, 4);
  assert.deepEqual(segunda, primera);
  assert.deepEqual(primera.map(([, texto]) => leerEml(texto).cabeceras.to), segunda.map(([, texto]) => leerEml(texto).cabeceras.to));
});
