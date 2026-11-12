// FR-042 de la 001: dirección pública del producto, de la que cuelgan los enlaces de paciente.
const DIRECCION = /^https?:\/\/[^\s/]+(:\d+)?$/;

/** `http://…` o `https://…`, con servidor y puerto opcional, sin ruta ni barra al final. */
export function esDireccionValida(texto) {
  return typeof texto === 'string' && DIRECCION.test(texto);
}
