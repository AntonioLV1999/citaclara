// Disparo diario de los recordatorios (003/FR-001): a las 08:00 locales de cada clínica, todos los días.
// Esperar es medir tiempo real, así que usa `relojReal` también con el reloj fijado (FR-043 de la 001).
import { ahoraEnZona } from '../dominio/tiempo.js';

const HORA_DE_ENVIO = '08:00';

/**
 * Comprueba al arrancar y cada `cadaMs`: si en la zona de una clínica ya son las 08:00 o más y en este
 * proceso no se ha ejecutado para esa fecha local, llama a `ejecutar(contexto, clinica)`. Así, arrancado
 * tarde, ejecuta en la primera comprobación (caso límite «Ejecución retrasada»); tras un reinicio el
 * mismo día vuelve a ejecutar, y RR1 impide que envíe nada repetido. `clinicas` puede ser una función,
 * para ver las clínicas de una semilla recargada.
 */
export function programarRecordatorios({
  contexto, clinicas, relojReal, ejecutar, cadaMs = 60_000, temporizador = { setInterval, clearInterval },
}) {
  const ejecutadas = new Map();

  function comprobar() {
    const ahora = new Date(relojReal());
    for (const clinica of typeof clinicas === 'function' ? clinicas() : clinicas) {
      const local = ahoraEnZona(ahora, clinica.zona_horaria);
      const dia = local.slice(0, 10);
      if (local.slice(11) < HORA_DE_ENVIO || ejecutadas.get(clinica.id) === dia) continue;
      // Se anota antes: si falla, no se reintenta cada minuto; otra ejecución a mano lo arregla.
      ejecutadas.set(clinica.id, dia);
      try {
        ejecutar(contexto, clinica);
      } catch (error) {
        console.error(`No se han podido enviar los recordatorios de ${clinica.nombre}:`, error);
      }
    }
  }

  comprobar();
  const intervalo = temporizador.setInterval(comprobar, cadaMs);
  return { parar: () => temporizador.clearInterval(intervalo) };
}
