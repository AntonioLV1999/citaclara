import { html, layout } from '../plantilla.js';

export function vistaAcceso({ mensaje, momentoFijado } = {}) {
  const contenido = html`<h1>Entrar en la agenda</h1>
    ${mensaje && html`<p class="aviso aviso--error" role="alert">${mensaje}</p>`}
    <form class="tarjeta" method="post" action="/acceso" novalidate>
      <label class="campo">
        <span class="campo__etiqueta">Clave de la clínica</span>
        <input name="clave" type="password" autocomplete="current-password" required autofocus>
      </label>
      <button class="boton" type="submit">Entrar</button>
    </form>`;
  return layout({ titulo: 'Entrar', contenido, momentoFijado });
}
