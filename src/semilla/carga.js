import { createHash } from 'node:crypto';
import { transaccionInmediata } from '../datos/bd.js';
import { insertarCita } from '../datos/citas.js';
import { crearPaciente } from '../datos/pacientes.js';

function borrarClinica(bd, nombre) {
  for (const { id } of bd.prepare('SELECT id FROM clinica WHERE nombre = ?').all(nombre)) {
    for (const tabla of ['cita', 'sesion', 'paciente', 'servicio', 'profesional']) {
      bd.prepare(`DELETE FROM ${tabla} WHERE clinica_id = ?`).run(id);
    }
    bd.prepare('DELETE FROM clinica WHERE id = ?').run(id);
  }
}

function insertarFila(bd, sql, ...valores) {
  return Number(bd.prepare(sql).run(...valores).lastInsertRowid);
}

/** Sustituye la clínica de la semilla en una sola transacción, por las tablas y disparadores normales. */
export function cargar(bd, datos) {
  transaccionInmediata(bd, () => {
    const { clinica } = datos;
    borrarClinica(bd, clinica.nombre);
    const clinicaId = insertarFila(
      bd,
      'INSERT INTO clinica (nombre, clave_hash, clave_sal, zona_horaria) VALUES (?, ?, ?, ?)',
      clinica.nombre,
      clinica.clave_hash,
      clinica.clave_sal,
      clinica.zona_horaria,
    );
    const profesionales = datos.profesionales.map(({ nombre, especialidad }) => insertarFila(
      bd,
      'INSERT INTO profesional (clinica_id, nombre, especialidad) VALUES (?, ?, ?)',
      clinicaId,
      nombre,
      especialidad,
    ));
    const servicios = datos.servicios.map((s) => insertarFila(
      bd,
      'INSERT INTO servicio (clinica_id, nombre, especialidad, duracion_min, precio_centimos) VALUES (?, ?, ?, ?, ?)',
      clinicaId,
      s.nombre,
      s.especialidad,
      s.duracion_min,
      s.precio_centimos,
    ));
    const pacientes = datos.pacientes.map((p) => crearPaciente(bd, { clinicaId, ...p }));
    for (const { profesional, servicio, paciente, inicio, fin, estado } of datos.citas) {
      insertarCita(bd, {
        clinicaId,
        profesionalId: profesionales[profesional],
        servicioId: servicios[servicio],
        pacienteId: pacientes[paciente],
        inicio,
        fin,
        estado,
      });
    }
  });
}

const sha256 = (valor) => createHash('sha256').update(JSON.stringify(valor)).digest('hex');

/** Cifras y resúmenes de contenido, en orden canónico: el de `generar`. */
export function resumen(datos) {
  const historia = datos.citas.filter((c) => c.semana < 0);
  const contar = (estado) => historia.filter((c) => c.estado === estado).length;
  const { lunes, citas, ...resto } = datos;
  const citasSinFechas = citas.map(({ inicio, fin, ...cita }) => cita);
  return {
    pacientes: datos.pacientes.length,
    historia: historia.length,
    completadas: contar('completada'),
    noAsistidas: contar('no_asistida'),
    canceladas: contar('cancelada'),
    futuras: citas.length - historia.length,
    contenido: sha256(datos),
    sinFechas: sha256({ ...resto, citas: citasSinFechas }),
  };
}
