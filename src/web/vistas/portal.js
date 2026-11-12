// Portal del paciente (002): «Tus citas», con los textos de contracts/portal-web.md.
import { etiquetaZona, fecha, hora, nombreDiaCorto, tramoCita } from '../../dominio/formato.js';
import { diaDeSemana } from '../../dominio/tiempo.js';
import { enlaceLlamada, html, layoutPortal } from '../plantilla.js';

/** «mié 04/11/2026 a las 10:15», el momento de un límite de cancelación. */
const momento = (texto) => `${nombreDiaCorto(diaDeSemana(texto))} ${fecha(texto)} a las ${hora(texto)}`;

/** Una clase por estado; la sin cerrar tiene la suya, igual que su etiqueta (D6). */
const claseEstado = (cita, proxima) => (cita.estado === 'reservada' && !proxima ? 'pendiente' : cita.estado.replace('_', '-'));

export function datosCita(cita) {
  return html`<p class="cita-portal__tramo" id="tramo-${cita.id}">${tramoCita(cita)}</p>
    <p class="cita-portal__servicio">${cita.servicio_nombre} con ${cita.profesional_nombre}</p>`;
}

function accionDeProxima(cita, clinica) {
  if (cita.cancelable) {
    return html`<a class="boton" href="/portal/citas/${cita.id}/cancelar" aria-describedby="tramo-${cita.id}">Cancelar</a>`;
  }
  return html`<p class="cita-portal__nota">Ya no se puede cancelar desde aquí: se podía hasta el ${momento(cita.limite)}. Si no puedes venir, llama a la clínica.</p>
    ${enlaceLlamada(clinica)}`;
}

function tarjeta(cita, clinica, proxima) {
  return html`<li class="cita-portal">
    ${datosCita(cita)}
    <p class="estado estado--${claseEstado(cita, proxima)}">${cita.etiqueta}</p>
    ${proxima && accionDeProxima(cita, clinica)}
  </li>`;
}

export function vistaPortal({
  clinica, paciente, proximas, historial, aviso,
}) {
  const contenido = html`<h1>Tus citas</h1>
    ${aviso && html`<p class="aviso aviso--info" role="status">${aviso}</p>`}
    <p class="portal__paciente">${paciente.nombre}</p>
    <p class="portal__zona">${etiquetaZona(clinica.zona_horaria)}</p>
    <section class="portal__seccion" id="proximas" aria-labelledby="titulo-proximas">
      <h2 id="titulo-proximas">Próximas citas</h2>
      ${proximas.length
        ? html`<ul class="lista-simple">${proximas.map((cita) => tarjeta(cita, clinica, true))}</ul>`
        : html`<p>No tienes citas próximas. Para pedir una, llama a la clínica.</p>
          <p>${enlaceLlamada(clinica)}</p>`}
    </section>
    <section class="portal__seccion" id="historial" aria-labelledby="titulo-historial">
      <h2 id="titulo-historial">Historial</h2>
      <ul class="lista-simple">${historial.map((cita) => tarjeta(cita, clinica, false))}</ul>
    </section>`;
  return layoutPortal({ titulo: 'Tus citas', clinica, contenido });
}
