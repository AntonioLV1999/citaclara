import { avisoRelojFijado, enlaceTelefono } from '../dominio/formato.js';

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

/** FR-043: mientras el reloj está fijado, todas las pantallas lo dicen, con texto y no solo color. */
function avisoReloj(momentoFijado) {
  return momentoFijado && html`<p class="reloj-fijado" role="status">${avisoRelojFijado(momentoFijado)}</p>`;
}

export function layout({ titulo, clinica, contenido, scripts = [], momentoFijado = null }) {
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
      <a class="boton boton--claro" href="/analitica">Analítica</a>
      <form method="post" action="/salir"><button class="boton boton--claro" type="submit">Salir</button></form>
    </nav>`}
  </header>
  ${avisoReloj(momentoFijado)}
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

export function paginaMensaje(estado, titulo, mensaje, clinica, { destino = VOLVER_A_AGENDA, momentoFijado } = {}) {
  const contenido = html`<h1>${titulo}</h1>
    <p class="aviso aviso--error" role="alert">${mensaje}</p>
    <p><a class="boton" href="${destino.ruta}">${destino.texto}</a></p>`;
  return pagina(layout({ titulo, clinica, contenido, momentoFijado }), estado);
}

export function paginaNoEncontrada(clinica, momentoFijado) {
  return paginaMensaje(404, 'No encontramos esta página', 'No encontramos lo que buscas. Vuelve a la agenda y elige de nuevo.', clinica, { momentoFijado });
}

export function paginaSinSesion(momentoFijado) {
  return paginaMensaje(401, 'Necesitas entrar', 'Para hacer esto hay que entrar con la clave de la clínica.', null, {
    destino: { ruta: '/acceso', texto: 'Ir a la pantalla de acceso' },
    momentoFijado,
  });
}

export function paginaFallo(momentoFijado) {
  return paginaMensaje(500, 'Algo ha fallado', 'Algo ha fallado y no se ha podido completar. Inténtalo de nuevo en unos minutos.', null, { momentoFijado });
}

export function paginaDemasiadoGrande(momentoFijado) {
  return paginaMensaje(413, 'Demasiado texto', 'El formulario lleva demasiado texto. Acórtalo e inténtalo de nuevo.', null, { momentoFijado });
}

// Portal del paciente (002): sin el menú de recepción ni el aviso del reloj fijado, que FR-043 de la
// 001 pide solo en recepción. Las páginas sin sesión no llevan ningún dato de clínica ni de paciente.

/** 002/FR-011: el teléfono de la clínica como enlace de llamada. */
export function enlaceLlamada(clinica, clase = 'boton boton--secundario') {
  return clinica?.telefono
    ? html`<a class="${clase}" href="${enlaceTelefono(clinica.telefono)}">Llamar a la clínica: ${clinica.telefono}</a>`
    : '';
}

export function layoutPortal({ titulo, clinica = null, contenido }) {
  return html`<!DOCTYPE html>
<html lang="es-ES">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>${titulo} · CitaClara</title>
  <link rel="stylesheet" href="/estaticos/estilos.css">
</head>
<body class="portal">
  <header class="cabecera">
    <p class="marca">${clinica ? clinica.nombre : 'CitaClara'}</p>
    ${clinica && html`<div class="cabecera__menu">
      ${enlaceLlamada(clinica, 'boton boton--claro')}
      <form method="post" action="/portal/salir"><button class="boton boton--claro" type="submit">Salir</button></form>
    </div>`}
  </header>
  <main class="contenido">
    ${contenido}
  </main>
</body>
</html>`;
}

function mensajePortal(estado, titulo, mensaje, { clinica = null, rol = 'alert', destino } = {}) {
  const contenido = html`<h1>${titulo}</h1>
    <p class="aviso ${rol === 'alert' ? 'aviso--error' : 'aviso--info'}" role="${rol}">${mensaje}</p>
    ${destino && html`<p><a class="boton" href="${destino.ruta}">${destino.texto}</a></p>`}`;
  return pagina(layoutPortal({ titulo, clinica, contenido }), estado);
}

export function paginaSesionTerminada() {
  return mensajePortal(401, 'Tu sesión ha terminado',
    'Por seguridad, la sesión se cierra tras 30 minutos sin uso. Vuelve a abrir tu enlace para ver tus citas.');
}

export function paginaHasSalido() {
  return mensajePortal(200, 'Has salido', 'Para volver a ver tus citas, abre otra vez tu enlace.', { rol: 'status' });
}

/** 002/FR-003: idéntica byte a byte para cualquier enlace no válido, de cualquier tipo. */
export function paginaEnlaceNoValido() {
  return mensajePortal(404, 'Este enlace no funciona',
    'Puede que esté incompleto o que ya no sea válido. Pide a tu clínica que te dé el enlace de nuevo.');
}

export function paginaDemasiadosIntentos() {
  return mensajePortal(429, 'Demasiados intentos',
    'Se han probado demasiados enlaces que no funcionan. Espera 15 minutos y vuelve a abrir tu enlace, o pide a tu clínica que te lo dé de nuevo.');
}

export function paginaCitaNoEncontrada(clinica) {
  return mensajePortal(404, 'No encontramos esa cita', 'Vuelve a tus citas y elige una de la lista.', {
    clinica, destino: { ruta: '/portal', texto: 'Volver a mis citas' },
  });
}
