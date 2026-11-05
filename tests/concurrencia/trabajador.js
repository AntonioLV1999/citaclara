// Proceso hijo del test SC-001: una conexión propia al archivo compartido.
import { abrirBd } from '../../src/datos/bd.js';
import { clinicaPorId } from '../../src/datos/catalogo.js';
import { crearCita } from '../../src/servicios/alta-cita.js';

const [ruta, clinicaId] = process.argv.slice(2);
const bd = abrirBd(ruta);
const clinica = clinicaPorId(bd, Number(clinicaId));
const ahora = () => new Date('2026-11-09T08:00:00+01:00');

process.on('message', ({ instante, formulario }) => {
  if (!formulario) {
    bd.close();
    process.disconnect();
    return;
  }
  // Barrera: todos los procesos esperan activamente hasta el mismo instante.
  while (Date.now() < instante);
  try {
    const { ok, motivo } = crearCita({ bd, clinica, ahora }, formulario);
    process.send({ ok, motivo });
  } catch (error) {
    process.send({ ok: false, motivo: 'error', detalle: error.message });
  }
});

process.send({ listo: true });
