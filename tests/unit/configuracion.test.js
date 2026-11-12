import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerConfiguracion } from '../../src/configuracion.js';

// Mensajes literales de configuracion.md de la 001 y de modelo-acceso.md de la 002.
const MOMENTO_NO_VALIDO = 'El momento de referencia CITACLARA_AHORA no es válido. '
  + 'Escríbelo como AAAA-MM-DDTHH:MM, por ejemplo 2026-11-04T12:00.';
const DIRECCION_NO_VALIDA = 'La dirección pública CITACLARA_DIRECCION no es válida. '
  + 'Escríbela como http://… o https://…, sin barra al final, por ejemplo https://citas.example.com.';

test('003/FR-003 configuración compartida: sin ajustes, reloj real, puerto 3000 y dirección por defecto', () => {
  assert.deepEqual(leerConfiguracion({}), {
    momentoFijado: null, direccion: 'http://localhost:3000', puerto: 3000, smtpConfigurado: false,
  });
});

test('003/FR-003 configuración compartida: CITACLARA_AHORA válido se toma como momento fijado', () => {
  assert.equal(leerConfiguracion({ CITACLARA_AHORA: '2026-11-02T08:00' }).momentoFijado, '2026-11-02T08:00');
  assert.equal(leerConfiguracion({ CITACLARA_AHORA: '' }).momentoFijado, null);
});

test('003/FR-003 configuración compartida: CITACLARA_AHORA mal escrito lanza el mensaje literal', () => {
  for (const malo of ['2026-11-02 08:00', '2026-02-30T08:00', '2026-11-02T24:00', 'mañana']) {
    assert.throws(() => leerConfiguracion({ CITACLARA_AHORA: malo }), { message: MOMENTO_NO_VALIDO }, malo);
  }
});

test('003/FR-003 configuración compartida: CITACLARA_DIRECCION válida, mal escrita y por defecto con PORT', () => {
  assert.equal(leerConfiguracion({ CITACLARA_DIRECCION: 'https://citas.example.com' }).direccion, 'https://citas.example.com');
  assert.throws(() => leerConfiguracion({ CITACLARA_DIRECCION: 'https://citas.example.com/' }), { message: DIRECCION_NO_VALIDA });
  assert.deepEqual(
    (({ direccion, puerto }) => ({ direccion, puerto }))(leerConfiguracion({ PORT: '4000' })),
    { direccion: 'http://localhost:4000', puerto: 4000 },
  );
});

test('003/FR-003 configuración compartida: CITACLARA_SMTP presente o ausente', () => {
  assert.equal(leerConfiguracion({ CITACLARA_SMTP: 'smtp://correo.example.com:587' }).smtpConfigurado, true);
  assert.equal(leerConfiguracion({ CITACLARA_SMTP: '' }).smtpConfigurado, false);
  assert.equal(leerConfiguracion({}).smtpConfigurado, false);
});
