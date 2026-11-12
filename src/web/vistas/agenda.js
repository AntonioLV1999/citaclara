import { ACCIONES } from '../../dominio/estados.js';
import {
  etiquetaCita, etiquetaZona, fecha, hora, nombreDia, tramoCita,
} from '../../dominio/formato.js';
import { diaDeSemana, esDiaLaborable, minutosEntre, sumarDias } from '../../dominio/tiempo.js';
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

/** FR-041: el correo es de la ficha, no de la cita, así que se ofrece en citas de cualquier estado. */
function enlaceCorreo(cita) {
  const texto = cita.paciente_email ? 'Cambiar correo' : 'Añadir correo';
  return html`<a class="boton boton--secundario" href="/citas/${cita.id}/correo">${texto}</a>`;
}

function filaCita(cita) {
  const clase = ocupa(cita) ? 'cita' : 'cita cita--libera';
  return html`<li class="${clase}">
    <p class="cita__hora">${hora(cita.inicio)} a ${hora(cita.fin)}</p>
    <p class="cita__paciente">${cita.paciente_nombre}</p>
    <p class="cita__servicio">${cita.servicio_nombre}</p>
    <p class="estado estado--${cita.estado.replace('_', '-')}">${etiquetaCita(cita)}</p>
    <div class="acciones">
      ${cita.acciones.map((accion) => html`<a class="boton boton--secundario" href="/citas/${cita.id}/confirmar?accion=${accion}">${ACCIONES[accion].texto}</a>`)}
      ${enlaceCorreo(cita)}
      <a class="boton boton--secundario" href="/citas/${cita.id}/enlace">Enlace del paciente</a>
    </div>
  </li>`;
}

function accionDeHueco(hueco, profesional, duracionMinima) {
  if (!hueco.reservable) return html`<p class="hueco__nota">Ya ha pasado</p>`;
  if (minutosEntre(hueco.inicio, hueco.fin) < duracionMinima) return html`<p class="hueco__nota">No cabe ningún servicio</p>`;
  return html`<a class="boton" href="/citas/nueva?profesional=${profesional.id}&amp;dia=${hueco.inicio.slice(0, 10)}&amp;hora=${hora(hueco.inicio)}">Reservar</a>`;
}

function filaHueco(hueco, profesional, duracionMinima) {
  return html`<li class="hueco">
    <p class="hueco__tramo"><span class="hueco__libre">Libre</span> ${hora(hueco.inicio)} a ${hora(hueco.fin)}</p>
    ${accionDeHueco(hueco, profesional, duracionMinima)}
  </li>`;
}

/** 002/FR-019: huecos liberados por pacientes, de cualquier profesional, cada uno hacia su agenda. */
function listaHuecosLiberados(huecos) {
  return html`<section class="huecos-liberados" aria-labelledby="titulo-huecos-liberados">
    <h2 id="titulo-huecos-liberados">Huecos liberados por pacientes</h2>
    ${huecos.length
      ? html`<ul class="lista-simple">${huecos.map((hueco) => html`<li><a class="boton boton--secundario" href="/agenda?profesional=${hueco.profesional_id}&amp;dia=${hueco.inicio.slice(0, 10)}">${tramoCita(hueco)}, ${hueco.profesional_nombre}</a></li>`)}</ul>`
      : html`<p>Ningún paciente ha liberado huecos próximos.</p>`}
  </section>`;
}

function entradasEnOrden(citas, huecos) {
  const entradas = [
    ...citas.map((cita) => ({ inicio: cita.inicio, orden: 0, cita })),
    ...huecos.map((hueco) => ({ inicio: hueco.inicio, orden: 1, hueco })),
  ];
  return entradas.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.orden - b.orden);
}

export function vistaAgenda({
  clinica, profesionales, profesional, dia, hoy, citas, huecos, huecosLiberados = [], duracionMinima, momentoFijado,
}) {
  const contenido = html`<h1>Agenda de ${profesional.nombre}</h1>
    <p class="agenda__dia">${nombreDia(diaDeSemana(dia))} ${fecha(dia)}</p>
    <p>${etiquetaZona(clinica.zona_horaria)}</p>
    <nav class="acciones" aria-label="Cambiar de profesional">
      ${profesionales.map((p) => enlaceProfesional(p, profesional, dia))}
    </nav>
    ${navegacionDias(profesional, dia, hoy)}
    ${!esDiaLaborable(dia) && html`<p class="aviso aviso--info">La clínica no abre este día.</p>`}
    ${listaHuecosLiberados(huecosLiberados)}
    <ul class="agenda lista-simple">
      ${entradasEnOrden(citas, huecos).map(({ cita, hueco }) => (cita ? filaCita(cita) : filaHueco(hueco, profesional, duracionMinima)))}
    </ul>`;
  return layout({ titulo: `Agenda de ${profesional.nombre}`, clinica, contenido, momentoFijado });
}
