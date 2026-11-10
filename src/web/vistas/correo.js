// FR-041: el correo de la ficha del paciente, desde una de sus citas. Nombre y teléfono no se editan.
import { etiquetaZona, fecha, hora } from '../../dominio/formato.js';
import { html, layout } from '../plantilla.js';

export const agendaDeLaCita = (cita) => `/agenda?profesional=${cita.profesional_id}&dia=${fecha(cita.inicio)}`;

export function vistaCorreo({ clinica, cita, valor = cita.paciente_email ?? '', mensaje, momentoFijado }) {
  const titulo = `Correo de ${cita.paciente_nombre}`;
  const contenido = html`<h1>${titulo}</h1>
    <p>${etiquetaZona(clinica.zona_horaria)}</p>
    ${mensaje && html`<p class="aviso aviso--error" role="alert">${mensaje}</p>`}
    <section class="tarjeta">
      <p>${cita.paciente_nombre}</p>
      <p>Teléfono: ${cita.paciente_telefono}</p>
      <p>Cita: ${fecha(cita.inicio)}, de ${hora(cita.inicio)} a ${hora(cita.fin)} · ${cita.servicio_nombre}</p>
    </section>
    <form class="tarjeta" method="post" action="/citas/${cita.id}/correo" novalidate>
      <label class="campo">
        <span class="campo__etiqueta">Correo electrónico</span>
        <input name="email" type="email" value="${valor}" autocomplete="off" aria-describedby="ayuda-correo">
      </label>
      <p class="campo__ayuda" id="ayuda-correo">Déjalo en blanco para quitarlo. Guardarlo no envía ningún mensaje.</p>
      <div class="acciones">
        <button class="boton" type="submit">Guardar correo</button>
        <a class="boton boton--secundario" href="${agendaDeLaCita(cita)}">Volver a la agenda</a>
      </div>
    </form>`;
  return layout({ titulo, clinica, contenido, momentoFijado });
}
