// La cita vista por el paciente (002, RP2, FR-007 a FR-013), solo con las reglas de la 001.
import { dentroDePlazo, limiteCancelacion, sinCerrar } from './estados.js';
import { etiquetaCita } from './formato.js';

/** D6: la cita sin cerrar (FR-040 de la 001) se le muestra al paciente así, solo en sus canales. */
const PENDIENTE = 'Pendiente de confirmar por la clínica';

const esProxima = (cita, ahora) => cita.estado === 'reservada' && !sinCerrar(cita, ahora);

function vista(cita, ahora) {
  const etiqueta = sinCerrar(cita, ahora) ? PENDIENTE : etiquetaCita(cita);
  if (!esProxima(cita, ahora)) return { ...cita, etiqueta, cancelable: false };
  // RP3: el plazo es el de RN8 de la 001, sin cifra propia.
  if (dentroDePlazo(cita.inicio, ahora)) return { ...cita, etiqueta, cancelable: true };
  return { ...cita, etiqueta, cancelable: false, limite: limiteCancelacion(cita.inicio) };
}

/** `{ proximas, historial }`: próximas de la más cercana a la más lejana, e historial al revés. */
export function citasDelPaciente(citas, ahora) {
  const ordenadas = [...citas].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id - b.id);
  const proximas = ordenadas.filter((c) => esProxima(c, ahora)).map((c) => vista(c, ahora));
  const historial = ordenadas.filter((c) => !esProxima(c, ahora)).reverse().map((c) => vista(c, ahora));
  return { proximas, historial };
}
