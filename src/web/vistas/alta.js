import { etiquetaZona, euros, fecha, fechaEscrita, hora } from '../../dominio/formato.js';
import { sumarMinutos } from '../../dominio/tiempo.js';
import { html, layout } from '../plantilla.js';

const HORAS = Array.from({ length: 44 }, (_, i) => {
  const minutos = 9 * 60 + i * 15;
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
});

function opcion(valor, texto, elegido, atributos = '') {
  return html`<option value="${valor}"${String(valor) === String(elegido) ? html` selected` : ''}${atributos}>${texto}</option>`;
}

function campoProfesional(profesionales, profesional) {
  return html`<label class="campo">
    <span class="campo__etiqueta">Profesional</span>
    <select id="elegir-profesional" name="profesional">
      ${profesionales.map((p) => opcion(p.id, p.nombre, profesional.id))}
    </select>
  </label>`;
}

function resumen(servicio, valores) {
  const fin = sumarMinutos(`2000-01-01T${/^\d\d:\d\d$/.test(valores.hora) ? valores.hora : '09:00'}`, servicio.duracion_min);
  return html`<p class="aviso aviso--info" id="resumen" aria-live="polite">
    Duración: <span id="resumen-duracion">${servicio.duracion_min} min</span> ·
    Precio: <span id="resumen-precio">${euros(servicio.precio_centimos)}</span> ·
    Fin: <span id="resumen-fin">${hora(fin)}</span>
  </p>`;
}

function camposPaciente(pacientes, valores) {
  return html`<fieldset>
    <legend>Paciente</legend>
    <div class="campo" id="zona-busqueda" hidden>
      <label class="campo__etiqueta" for="buscar-paciente">Buscar por nombre o teléfono</label>
      <input id="buscar-paciente" type="search" autocomplete="off">
      <div id="resultados-paciente" aria-live="polite"></div>
    </div>
    <label class="campo">
      <span class="campo__etiqueta">Paciente</span>
      <select name="paciente" id="paciente">
        ${opcion('', 'Paciente nuevo', valores.paciente ?? '')}
        ${pacientes.map((p) => opcion(p.id, `${p.nombre} · ${p.telefono}`, valores.paciente))}
      </select>
    </label>
    <div id="paciente-nuevo">
      <label class="campo">
        <span class="campo__etiqueta">Nombre</span>
        <input name="paciente_nombre" value="${valores.paciente_nombre}" autocomplete="off">
      </label>
      <label class="campo">
        <span class="campo__etiqueta">Teléfono</span>
        <input name="paciente_telefono" value="${valores.paciente_telefono}" inputmode="tel" autocomplete="off">
      </label>
      <label class="campo">
        <span class="campo__etiqueta">Correo electrónico (opcional)</span>
        <input name="paciente_email" value="${valores.paciente_email}" type="email" autocomplete="off">
      </label>
    </div>
  </fieldset>`;
}

function huecosActuales({ profesional, valores, huecos }) {
  const libres = huecos.filter((h) => h.reservable);
  return html`<section class="tarjeta">
    <h2>Huecos libres de ${profesional.nombre} el ${fecha(valores.dia)}</h2>
    ${libres.length === 0
      ? html`<p>No quedan huecos libres ese día. Elige otro día.</p>`
      : html`<ul class="lista-simple">${libres.map((h) => html`<li>${hora(h.inicio)} a ${hora(h.fin)}</li>`)}</ul>`}
  </section>`;
}

export function vistaAlta({
  clinica, profesionales, profesional, servicios, pacientes, valores, mensaje, huecos, momentoFijado,
}) {
  const elegido = servicios.find((s) => String(s.id) === String(valores.servicio)) ?? servicios[0];
  const contenido = html`<h1>Nueva cita</h1>
    <p>${etiquetaZona(clinica.zona_horaria)}</p>
    ${mensaje && html`<p class="aviso aviso--error" role="alert">${mensaje}</p>`}
    ${huecos && huecosActuales({ profesional, valores, huecos })}
    <form method="post" action="/citas" id="formulario-alta" novalidate>
      ${campoProfesional(profesionales, profesional)}
      <label class="campo">
        <span class="campo__etiqueta">Servicio</span>
        <select name="servicio" id="servicio">
          ${servicios.map((s) => opcion(
            s.id,
            `${s.nombre} · ${s.duracion_min} min · ${euros(s.precio_centimos)}`,
            elegido?.id,
            html` data-duracion="${s.duracion_min}" data-precio="${euros(s.precio_centimos)}"`,
          ))}
        </select>
      </label>
      ${camposPaciente(pacientes, valores)}
      <label class="campo">
        <span class="campo__etiqueta">Día (dd/mm/aaaa)</span>
        <input name="dia" type="text" value="${fechaEscrita(valores.dia)}" autocomplete="off">
      </label>
      <label class="campo">
        <span class="campo__etiqueta">Hora</span>
        <select name="hora" id="hora">${HORAS.map((h) => opcion(h, h, valores.hora))}</select>
      </label>
      ${elegido && resumen(elegido, valores)}
      <div class="acciones">
        <button class="boton" type="submit">Reservar cita</button>
        <button class="boton boton--secundario" type="submit" id="ver-servicios" formaction="/citas/nueva">Ver sus servicios</button>
        <a class="boton boton--secundario" href="/agenda?profesional=${profesional.id}&amp;dia=${valores.dia}">Volver a la agenda</a>
      </div>
    </form>`;
  return layout({ titulo: 'Nueva cita', clinica, contenido, scripts: ['alta.js'], momentoFijado });
}

export function vistaResultadosPaciente(pacientes) {
  if (pacientes.length === 0) {
    return html`<p>No hay pacientes con ese nombre o teléfono. Si es nuevo, escribe sus datos abajo.</p>`;
  }
  return html`<ul class="lista-simple">
    ${pacientes.map((p) => html`<li><button class="boton boton--secundario" type="button" data-paciente="${p.id}">${p.nombre} · ${p.telefono}</button></li>`)}
  </ul>`;
}
