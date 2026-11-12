import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esDireccionValida } from '../../src/dominio/direccion.js';

test('FR-042 la dirección pública admite http y https con servidor y puerto, sin barra final', () => {
  for (const valida of ['http://localhost:3000', 'https://citas.example.com', 'http://192.168.1.20:3000']) {
    assert.equal(esDireccionValida(valida), true, valida);
  }
});

test('FR-042 la dirección pública rechaza el texto vacío, otros esquemas, la falta de esquema y la barra final', () => {
  for (const mala of ['', 'ftp://x', 'citas.example.com', 'https://citas.example.com/', 'https://', 'https://citas example.com',
    'https://citas.example.com/portal', undefined]) {
    assert.equal(esDireccionValida(mala), false, String(mala));
  }
});
