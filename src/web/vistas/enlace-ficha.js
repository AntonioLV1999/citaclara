// 002/FR-002: el enlace personal de la ficha del paciente, desde una de sus citas de la agenda.
import { fecha, hora } from '../../dominio/formato.js';
import { html, layout } from '../plantilla.js';
import { agendaDeLaCita } from './correo.js';

function resumenCita(cita) {
  return html`<section class="tarjeta">
    <p>${cita.paciente_nombre}</p>
    <p>Cita: ${fecha(cita.inicio)}, de ${hora(cita.inicio)} a ${hora(cita.fin)} · ${cita.servicio_nombre}</p>
  </section>`;
}

export function vistaEnlace({
  clinica, cita, enlaceCompleto, nuevo = false, momentoFijado,
}) {
  const titulo = `Enlace de ${cita.paciente_nombre}`;
  const contenido = html`<h1>${titulo}</h1>
    ${nuevo && html`<p class="aviso aviso--info" role="status">El enlace anterior ya no funciona. Este es el nuevo.</p>`}
    ${resumenCita(cita)}
    <section class="tarjeta">
      <label class="campo">
        <span class="campo__etiqueta">Enlace personal</span>
        <input id="enlace-paciente" type="text" value="${enlaceCompleto}" readonly aria-describedby="ayuda-enlace">
      </label>
      <p class="campo__ayuda" id="ayuda-enlace">Dáselo al paciente por el medio que uses con él. CitaClara no lo envía.</p>
      <div class="acciones">
        <button class="boton" type="button" id="copiar-enlace" data-campo="enlace-paciente" hidden>Copiar enlace</button>
        <a class="boton boton--secundario" href="${agendaDeLaCita(cita)}">Volver a la agenda</a>
      </div>
      <p class="campo__ayuda" id="aviso-copiar" aria-live="polite"></p>
    </section>
    <p><a class="boton boton--secundario" href="/citas/${cita.id}/enlace/anular">Anular este enlace</a></p>`;
  return layout({ titulo, clinica, contenido, scripts: ['copiar.js'], momentoFijado });
}

export function vistaAnularEnlace({ clinica, cita, momentoFijado }) {
  const titulo = `¿Anular el enlace de ${cita.paciente_nombre}?`;
  const contenido = html`<h1>${titulo}</h1>
    ${resumenCita(cita)}
    <p class="aviso aviso--info">El enlace actual y los de cancelación de los recordatorios ya enviados dejarán de funcionar. Las citas no cambian. Después tendrás que darle el nuevo enlace.</p>
    <form class="acciones" method="post" action="/citas/${cita.id}/enlace/anular">
      <button class="boton boton--peligro" type="submit">Sí, anular y crear uno nuevo</button>
      <a class="boton boton--secundario" href="/citas/${cita.id}/enlace">No, volver</a>
    </form>`;
  return layout({ titulo, clinica, contenido, momentoFijado });
}
