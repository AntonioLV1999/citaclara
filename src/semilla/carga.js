import { createHash } from 'node:crypto';
import { transaccionInmediata } from '../datos/bd.js';
import { insertarCita } from '../datos/citas.js';
import { crearPaciente } from '../datos/pacientes.js';

function borrarClinica(bd, nombre) {
  for (const { id } of bd.prepare('SELECT id FROM clinica WHERE nombre = ?').all(nombre)) {
    // También se cierran las sesiones de paciente de sus pacientes (FR-032, FR-037), y caen los
    // enlaces de cancelación de sus citas, antes que las citas (002/CL Regenerar la semilla).
    bd.prepare('DELETE FROM sesion_paciente WHERE paciente_id IN (SELECT id FROM paciente WHERE clinica_id = ?)').run(id);
    bd.prepare('DELETE FROM enlace_cancelacion WHERE cita_id IN (SELECT id FROM cita WHERE clinica_id = ?)').run(id);
    // 003/CL Regenerar los datos de demostración: los recordatorios caen con sus citas.
    bd.prepare('DELETE FROM recordatorio WHERE cita_id IN (SELECT id FROM cita WHERE clinica_id = ?)').run(id);
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
      'INSERT INTO clinica (nombre, clave_hash, clave_sal, zona_horaria, telefono) VALUES (?, ?, ?, ?, ?)',
      clinica.nombre,
      clinica.clave_hash,
      clinica.clave_sal,
      clinica.zona_horaria,
      clinica.telefono,
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
    // El origen y el momento van en el mismo INSERT: cita_rn4 rechazaría un UPDATE posterior.
    for (const cita of datos.citas) {
      insertarCita(bd, {
        clinicaId,
        profesionalId: profesionales[cita.profesional],
        servicioId: servicios[cita.servicio],
        pacienteId: pacientes[cita.paciente],
        inicio: cita.inicio,
        fin: cita.fin,
        estado: cita.estado,
        origenCancelacion: cita.origen_cancelacion,
        momentoCancelacion: cita.momento_cancelacion,
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
  // El momento de la cancelación también es una fecha: si se quedara, cambiaría con el lunes (FR-032).
  const citasSinFechas = citas.map(({ inicio, fin, momento_cancelacion: momento, ...cita }) => cita);
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
