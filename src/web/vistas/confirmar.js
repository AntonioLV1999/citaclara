import { ACCIONES } from '../../dominio/estados.js';
import { etiquetaZona, fecha, hora } from '../../dominio/formato.js';
import { html, layout } from '../plantilla.js';

export function vistaConfirmar({ clinica, cita, accion }) {
  const { titulo } = ACCIONES[accion];
  const dia = cita.inicio.slice(0, 10);
  const contenido = html`<h1>${titulo}</h1>
    <p>${etiquetaZona(clinica.zona_horaria)}</p>
    <section class="tarjeta">
      <p>${fecha(cita.inicio)}, de ${hora(cita.inicio)} a ${hora(cita.fin)}</p>
      <p>${cita.paciente_nombre}</p>
      <p>${cita.servicio_nombre}</p>
    </section>
    <p class="aviso aviso--info">Esta acción no se puede deshacer.</p>
    <form class="acciones" method="post" action="/citas/${cita.id}/estado">
      <input type="hidden" name="accion" value="${accion}">
      <button class="boton boton--peligro" type="submit">Sí, confirmar</button>
      <a class="boton boton--secundario" href="/agenda?profesional=${cita.profesional_id}&amp;dia=${dia}">No, volver a la agenda</a>
    </form>`;
  return layout({ titulo, clinica, contenido });
}
