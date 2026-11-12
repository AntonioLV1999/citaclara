// Ayudas de los tests de la 003: leer un recordatorio `.eml` como lo leería un programa de correo.

/** Descodifica las palabras RFC 2047 en base64 (`=?UTF-8?B?…?=`) de una cabecera ya desplegada. */
export function descodificarCabecera(valor) {
  return valor
    .replace(/\?=\s+=\?/g, '?==?')
    .replace(/=\?UTF-8\?B\?([A-Za-z0-9+/=]*)\?=/gi, (_, b64) => Buffer.from(b64, 'base64').toString('utf8'));
}

/** Analizador mínimo de RFC 5322: cabeceras desplegadas y descodificadas, y cuerpo. */
export function leerEml(texto) {
  const separacion = texto.indexOf('\r\n\r\n');
  if (separacion < 0) throw new Error('El mensaje no separa cabeceras y cuerpo con una línea vacía CRLF');
  const bruto = texto.slice(0, separacion).replace(/\r\n[ \t]/g, ' ');
  const cabeceras = {};
  for (const linea of bruto.split('\r\n')) {
    const dos = linea.indexOf(':');
    cabeceras[linea.slice(0, dos).toLowerCase()] = descodificarCabecera(linea.slice(dos + 1).trim());
  }
  return { cabeceras, crudas: bruto, cuerpo: texto.slice(separacion + 4) };
}

/** El token del enlace de cancelación del mensaje (002/FR-025: 32 hexadecimales). */
export function tokenDelMensaje(texto) {
  const encontrado = texto.match(/\/e\/([0-9a-f]{32})\r\n/);
  if (!encontrado) throw new Error('El mensaje no tiene enlace de cancelación');
  return encontrado[1];
}
