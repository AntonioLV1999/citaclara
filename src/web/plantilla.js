class Seguro {
  constructor(texto) {
    this.texto = texto;
  }

  toString() {
    return this.texto;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function aHtml(valor) {
  if (valor === null || valor === undefined || valor === false) return '';
  if (Array.isArray(valor)) return valor.map(aHtml).join('');
  if (valor instanceof Seguro) return valor.texto;
  return String(valor).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Marca como ya generado un HTML de confianza. Nunca debe recibir datos de personas. */
export function seguro(texto) {
  return new Seguro(texto);
}

/** Plantilla etiquetada: todo lo interpolado se escapa, salvo lo marcado como seguro. */
export function html(trozos, ...valores) {
  return new Seguro(trozos.reduce((acumulado, trozo, i) => acumulado + aHtml(valores[i - 1]) + trozo));
}

export function layout({ titulo, clinica, contenido, scripts = [] }) {
  return html`<!DOCTYPE html>
<html lang="es-ES">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo} · CitaClara</title>
  <link rel="stylesheet" href="/estaticos/estilos.css">
  ${scripts.map((script) => html`<script src="/estaticos/${script}" defer></script>`)}
</head>
<body>
  <header class="cabecera">
    <p class="marca">CitaClara${clinica && html`<span class="marca__clinica">${clinica.nombre}</span>`}</p>
    ${clinica && html`<nav class="cabecera__menu" aria-label="Principal">
      <a class="boton boton--claro" href="/agenda">Agenda</a>
      <a class="boton boton--claro" href="/citas/nueva">Nueva cita</a>
      <form method="post" action="/salir"><button class="boton boton--claro" type="submit">Salir</button></form>
    </nav>`}
  </header>
  <main class="contenido">
    ${contenido}
  </main>
</body>
</html>`;
}

export function pagina(cuerpo, estado = 200) {
  return { estado, cuerpo: String(cuerpo) };
}

export function redireccion(ubicacion, cookie) {
  return { estado: 303, ubicacion, cookie };
}

const VOLVER_A_AGENDA = { ruta: '/agenda', texto: 'Volver a la agenda' };

export function paginaMensaje(estado, titulo, mensaje, clinica, destino = VOLVER_A_AGENDA) {
  const contenido = html`<h1>${titulo}</h1>
    <p class="aviso aviso--error" role="alert">${mensaje}</p>
    <p><a class="boton" href="${destino.ruta}">${destino.texto}</a></p>`;
  return pagina(layout({ titulo, clinica, contenido }), estado);
}

export function paginaNoEncontrada(clinica) {
  return paginaMensaje(404, 'No encontramos esta página', 'No encontramos lo que buscas. Vuelve a la agenda y elige de nuevo.', clinica);
}

export function paginaSinSesion() {
  return paginaMensaje(401, 'Necesitas entrar', 'Para hacer esto hay que entrar con la clave de la clínica.', null, { ruta: '/acceso', texto: 'Ir a la pantalla de acceso' });
}

export function paginaFallo() {
  return paginaMensaje(500, 'Algo ha fallado', 'Algo ha fallado y no se ha podido completar. Inténtalo de nuevo en unos minutos.', null);
}

export function paginaDemasiadoGrande() {
  return paginaMensaje(413, 'Demasiado texto', 'El formulario lleva demasiado texto. Acórtalo e inténtalo de nuevo.', null);
}
