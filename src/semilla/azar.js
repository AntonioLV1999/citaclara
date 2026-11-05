/** Generador mulberry32: la misma semilla da siempre la misma secuencia. */
export function crearAzar(semilla) {
  let estado = semilla >>> 0;

  function siguiente() {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function entero(minimo, maximo) {
    return minimo + Math.floor(siguiente() * (maximo - minimo + 1));
  }

  function elegir(lista) {
    return lista[entero(0, lista.length - 1)];
  }

  function barajar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = entero(0, i);
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  return { entero, elegir, barajar };
}
