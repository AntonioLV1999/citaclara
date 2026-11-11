// Servidor de las pruebas del panel de la 004: semilla en una base temporal con las dos clínicas
// de `crearEscenario`, reloj fijado con el momento de referencia (FR-043 de la 001) y sesión de
// recepción de Clínica Eleva.
import {
  crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba, textoVisible,
} from './escenario.js';
import { cargar } from '../../src/semilla/carga.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { generar } from '../../src/semilla/generador.js';
import { crearServidor } from '../../src/web/servidor.js';

export async function panelDeSemilla({
  lunes = LUNES_POR_DEFECTO, momentoFijado = '2026-11-04T12:00', ahora,
} = {}) {
  const e = crearEscenario();
  cargar(e.bd, generar({ semilla: SEMILLA, lunes }));
  const { id: clinicaId } = e.bd.prepare("SELECT id FROM clinica WHERE nombre = 'Clínica Eleva'").get();
  const servidor = await escuchar(crearServidor({
    bd: e.bd, ahora: ahora ?? relojFijo('2026-11-04T12:00:00+01:00'), momentoFijado,
  }));
  const cookie = sesionDePrueba(e.bd, clinicaId);

  async function abrir(ruta = '/analitica', opciones = {}) {
    const r = await peticion(servidor, { ruta, cookie, ...opciones });
    return { ...r, visible: textoVisible(r.texto) };
  }

  return {
    e,
    servidor,
    cookie,
    clinicaId,
    abrir,
    async cerrar() {
      await detener(servidor);
      e.cerrar();
    },
  };
}
