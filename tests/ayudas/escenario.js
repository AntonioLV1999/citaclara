import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBd } from '../../src/datos/bd.js';
import { abrirSesion, hashClave } from '../../src/servicios/acceso.js';
import { sumarMinutos } from '../../src/dominio/tiempo.js';

function insertar(bd, tabla, fila) {
  const campos = Object.keys(fila);
  const sql = `INSERT INTO ${tabla} (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`;
  return Number(bd.prepare(sql).run(...Object.values(fila)).lastInsertRowid);
}

function poblarClinica(bd, { nombre, clave, zona, profesionales, pacientes }) {
  const clave_sal = `sal-${nombre}`;
  const id = insertar(bd, 'clinica', {
    nombre,
    clave_hash: hashClave(clave, clave_sal),
    clave_sal,
    zona_horaria: zona,
  });
  const profesional = (nombreProfesional, especialidad) =>
    insertar(bd, 'profesional', { clinica_id: id, nombre: nombreProfesional, especialidad });
  const servicio = (nombreServicio, especialidad, duracion_min, precio_centimos) =>
    insertar(bd, 'servicio', { clinica_id: id, nombre: nombreServicio, especialidad, duracion_min, precio_centimos });
  return {
    id,
    nombre,
    clave,
    zona_horaria: zona,
    fisio: profesional(profesionales[0], 'Fisioterapia'),
    fisio2: profesional(profesionales[1], 'Fisioterapia'),
    nutri: profesional(profesionales[2], 'Nutrición'),
    nombreFisio: profesionales[0],
    nombreNutri: profesionales[2],
    sesion: servicio('Sesión de fisioterapia', 'Fisioterapia', 45, 4000),
    primeraFisio: servicio('Primera visita de fisioterapia', 'Fisioterapia', 60, 5000),
    consulta: servicio('Consulta de nutrición', 'Nutrición', 30, 3500),
    primeraNutri: servicio('Primera consulta de nutrición', 'Nutrición', 45, 4500),
    pacientes: pacientes.map(([nombrePaciente, telefono]) =>
      insertar(bd, 'paciente', { clinica_id: id, nombre: nombrePaciente, telefono })),
  };
}

/** Base temporal con dos clínicas: `a` en la península y `b` en Canarias. */
export function crearEscenario() {
  const carpeta = mkdtempSync(join(tmpdir(), 'citaclara-'));
  const ruta = join(carpeta, 'prueba.db');
  const bd = abrirBd(ruta);
  const a = poblarClinica(bd, {
    nombre: 'Clínica Norte',
    clave: 'clave-norte',
    zona: 'Europe/Madrid',
    profesionales: ['María', 'Jorge', 'Lucía'],
    pacientes: [['Ana Núñez', '600 000 001'], ['Óscar Peña', '600 000 002'], ['Luis Gómez', '+34 600 000 003']],
  });
  const b = poblarClinica(bd, {
    nombre: 'Clínica Sur',
    clave: 'clave-sur',
    zona: 'Atlantic/Canary',
    profesionales: ['Pablo', 'Elena', 'Nora'],
    pacientes: [['Bruno Sanz', '600 000 101']],
  });
  return {
    bd,
    ruta,
    a,
    b,
    cerrar() {
      bd.close();
      rmSync(carpeta, { recursive: true, force: true });
    },
  };
}

export function relojFijo(iso) {
  return () => new Date(iso);
}

/** Abre una sesión real y devuelve la cabecera `Cookie` que la identifica. */
export function sesionDePrueba(bd, clinicaId) {
  return `sesion=${abrirSesion(bd, clinicaId)}`;
}

/** Escribe una cita directamente en la tabla, sin pasar por los servicios. */
export function citaDirecta(bd, { clinica, profesional, servicio, paciente, inicio, fin, estado = 'reservada' }) {
  const { duracion_min: duracion } = bd.prepare('SELECT duracion_min FROM servicio WHERE id = ?').get(servicio);
  return insertar(bd, 'cita', {
    clinica_id: clinica,
    profesional_id: profesional,
    servicio_id: servicio,
    paciente_id: paciente,
    inicio,
    fin: fin ?? sumarMinutos(inicio, duracion),
    estado,
  });
}

export async function escuchar(servidor) {
  await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
  return servidor;
}

export async function detener(servidor) {
  servidor.closeAllConnections();
  await new Promise((resolver) => servidor.close(resolver));
}

/** Petición HTTP real al servidor, sin seguir redirecciones. */
export async function peticion(servidor, { metodo = 'GET', ruta, cookie, formulario }) {
  const { port } = servidor.address();
  const cabeceras = {};
  if (cookie) cabeceras.cookie = cookie;
  let body;
  if (formulario) {
    cabeceras['content-type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(formulario).toString();
  }
  const respuesta = await fetch(`http://127.0.0.1:${port}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body,
    redirect: 'manual',
  });
  return {
    estado: respuesta.status,
    texto: await respuesta.text(),
    ubicacion: respuesta.headers.get('location'),
    cookies: respuesta.headers.getSetCookie(),
    tipo: respuesta.headers.get('content-type'),
  };
}

/** El texto que ve la persona: sin etiquetas, scripts ni atributos. */
export function textoVisible(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
