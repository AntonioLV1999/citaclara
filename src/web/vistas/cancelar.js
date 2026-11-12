// Pantalla de cancelación del correo (003, FR-011 a FR-017), con los textos literales de
// contracts/pantalla-cancelar.md. Usa la plantilla de las páginas del paciente de la 002.
import { enlaceTelefono, etiquetaZona, hora } from '../../dominio/formato.js';
import { diaEscrito } from '../../dominio/recordatorio.js';
import { html, layoutPortal } from '../plantilla.js';

/** «martes 03/11/2026 a las 12:00» (FR-008). */
const momento = (texto) => `${diaEscrito(texto)} a las ${hora(texto)}`;
const zona = (clinica) => html`<p class="portal__zona">${etiquetaZona(clinica.zona_horaria)}</p>`;

/** FR-012: solo la cita, nunca datos de la ficha ni de otras citas. */
function datosCita({ clinica, cita, profesional }) {
  return html`<section class="cita-portal">
    <p class="cita-portal__tramo">${momento(cita.inicio)}</p>
    <p class="cita-portal__servicio">${cita.servicio_nombre} con ${profesional.nombre}</p>
    <p>${clinica.nombre}</p>
  </section>`;
}

/** HU2-E1, FR-013: los datos, el aviso de que no se puede deshacer y la confirmación expresa. */
export function vistaConfirmar({ clinica, cita, profesional }) {
  const titulo = 'Cancelar tu cita';
  const contenido = html`<h1>${titulo}</h1>
    ${zona(clinica)}
    ${datosCita({ clinica, cita, profesional })}
    <p class="aviso aviso--info">Si la cancelas, el hueco quedará libre para otra persona. No se puede deshacer.</p>
    <form class="acciones" method="post" action="/cancelar">
      <button class="boton boton--peligro" type="submit">Sí, cancelar la cita</button>
    </form>`;
  return layoutPortal({ titulo, clinica, contenido });
}

/** HU2-E2: cancelada ahora (FR-014). */
export function vistaCancelada({ clinica, cita }) {
  const titulo = 'Cita cancelada';
  const contenido = html`<h1>${titulo}</h1>
    <p class="aviso aviso--exito" role="status">Tu cita del ${momento(cita.inicio)} está cancelada, y el hueco ha quedado libre para otra persona. Gracias por avisar.</p>
    ${zona(clinica)}`;
  return layoutPortal({ titulo, clinica, contenido });
}

/** HU2-E4 y doble pulsación: ya estaba cancelada, sin error y sin ninguna acción. */
export function vistaYaCancelada({ clinica }) {
  const titulo = 'Esta cita ya está cancelada';
  const contenido = html`<h1>${titulo}</h1>
    <p class="aviso aviso--info" role="status">No tienes que hacer nada más.</p>`;
  return layoutPortal({ titulo, clinica, contenido });
}

/** HU2-E6: fuera del plazo de RN8, con el límite y el teléfono de la clínica para llamar. */
export function vistaFueraDePlazo({ clinica, limite }) {
  const titulo = 'Ya no se puede cancelar desde aquí';
  const llamada = clinica.telefono
    ? html`llama a la clínica: <a class="telefono" href="${enlaceTelefono(clinica.telefono)}">${clinica.telefono}</a>.`
    : 'llama a la clínica.';
  const contenido = html`<h1>${titulo}</h1>
    <p class="aviso aviso--error" role="alert">Se podía cancelar hasta el ${momento(limite)}. Si no vas a poder venir, ${llamada}</p>
    ${zona(clinica)}`;
  return layoutPortal({ titulo, clinica, contenido });
}
