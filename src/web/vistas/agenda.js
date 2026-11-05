import { ACCIONES } from '../../dominio/estados.js';
import { etiquetaEstado, etiquetaZona, fecha, hora, nombreDia } from '../../dominio/formato.js';
import { diaDeSemana, esDiaLaborable, sumarDias } from '../../dominio/tiempo.js';
import { html, layout } from '../plantilla.js';

const ocupa = ({ estado }) => estado === 'reservada' || estado === 'completada';

function enlaceProfesional(p, profesional, dia) {
  const actual = p.id === profesional.id;
  return html`<a class="boton ${actual ? '' : 'boton--secundario'}" href="/agenda?profesional=${p.id}&amp;dia=${dia}"${actual ? html` aria-current="true"` : ''}>${p.nombre}</a>`;
}

function navegacionDias(profesional, dia, hoy) {
  const enlace = (destino, texto) => html`<a class="boton boton--secundario" href="/agenda?profesional=${profesional.id}&amp;dia=${destino}">${texto}</a>`;
  return html`<nav class="acciones" aria-label="Cambiar de día">
    ${enlace(sumarDias(dia, -1), 'Día anterior')}
    ${enlace(hoy, 'Hoy')}
    ${enlace(sumarDias(dia, 1), 'Día siguiente')}
  </nav>
  <form class="ir-a-dia" method="get" action="/agenda">
    <input type="hidden" name="profesional" value="${profesional.id}">
    <label class="ir-a-dia__campo">
      <span class="campo__etiqueta">Ir a otro día (dd/mm/aaaa)</span>
      <input type="text" name="dia" value="${fecha(dia)}" autocomplete="off">
    </label>
    <button class="boton boton--secundario" type="submit">Ver día</button>
  </form>`;
}

function filaCita(cita) {
  const clase = ocupa(cita) ? 'cita' : 'cita cita--libera';
  return html`<li class="${clase}">
    <p class="cita__hora">${hora(cita.inicio)} a ${hora(cita.fin)}</p>
    <p class="cita__paciente">${cita.paciente_nombre}</p>
    <p class="cita__servicio">${cita.servicio_nombre}</p>
    <p class="estado estado--${cita.estado.replace('_', '-')}">${etiquetaEstado(cita.estado)}</p>
    ${cita.acciones.length > 0 && html`<div class="acciones">
      ${cita.acciones.map((accion) => html`<a class="boton boton--secundario" href="/citas/${cita.id}/confirmar?accion=${accion}">${ACCIONES[accion].texto}</a>`)}
    </div>`}
  </li>`;
}

function filaHueco(hueco, profesional) {
  const dia = hueco.inicio.slice(0, 10);
  return html`<li class="hueco">
    <p class="hueco__tramo"><span class="hueco__libre">Libre</span> ${hora(hueco.inicio)} a ${hora(hueco.fin)}</p>
    ${hueco.reservable
      ? html`<a class="boton" href="/citas/nueva?profesional=${profesional.id}&amp;dia=${dia}&amp;hora=${hora(hueco.inicio)}">Reservar</a>`
      : html`<p class="hueco__pasado">Ya ha pasado</p>`}
  </li>`;
}

function entradasEnOrden(citas, huecos) {
  const entradas = [
    ...citas.map((cita) => ({ inicio: cita.inicio, orden: 0, cita })),
    ...huecos.map((hueco) => ({ inicio: hueco.inicio, orden: 1, hueco })),
  ];
  return entradas.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.orden - b.orden);
}

export function vistaAgenda({ clinica, profesionales, profesional, dia, hoy, citas, huecos }) {
  const contenido = html`<h1>Agenda de ${profesional.nombre}</h1>
    <p class="agenda__dia">${nombreDia(diaDeSemana(dia))} ${fecha(dia)}</p>
    <p>${etiquetaZona(clinica.zona_horaria)}</p>
    <nav class="acciones" aria-label="Cambiar de profesional">
      ${profesionales.map((p) => enlaceProfesional(p, profesional, dia))}
    </nav>
    ${navegacionDias(profesional, dia, hoy)}
    ${!esDiaLaborable(dia) && html`<p class="aviso aviso--info">La clínica no abre este día.</p>`}
    <ul class="agenda lista-simple">
      ${entradasEnOrden(citas, huecos).map(({ cita, hueco }) => (cita ? filaCita(cita) : filaHueco(hueco, profesional)))}
    </ul>`;
  return layout({ titulo: `Agenda de ${profesional.nombre}`, clinica, contenido });
}
