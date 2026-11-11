import { euros, fecha } from '../../dominio/formato.js';
import { html, layout } from '../plantilla.js';

/**
 * Escala de un gráfico de porcentajes (FR-021): de 0 % al primer múltiplo de 10 % igual o superior
 * al valor más alto, y como mínimo 10 %. Los valores son pares `{ numerador, denominador }`.
 */
export function escalaPorcentaje(valores) {
  const mayor = Math.max(0, ...valores.filter((v) => v.denominador > 0).map((v) => v.numerador / v.denominador));
  const techo = Math.max(10, Math.ceil((mayor * 100 - 1e-9) / 10) * 10);
  return {
    texto: `Escala de 0 % a ${techo} %`,
    proporcion: (v) => (v.denominador > 0 ? (v.numerador / v.denominador) * 100 / techo : 0),
  };
}

/** Escala de un gráfico de importes (FR-021): de 0,00 € al importe más alto. */
export function escalaImporte(centimos) {
  const mayor = Math.max(0, ...centimos);
  return {
    texto: `Escala desde ${euros(0)}`,
    proporcion: (c) => (mayor > 0 ? c / mayor : 0),
  };
}

const anchura = (proporcion) => `${Math.round(Math.min(1, proporcion) * 10000) / 100}%`;

/**
 * FR-019 y FR-020: cada fila tiene su etiqueta y su cifra exacta en texto; la barra es decorativa,
 * sale de cero y no distingue nada por el color.
 */
export function graficoBarras({ titulo, escala, filas }) {
  return html`<table class="grafico">
    <caption>${titulo}<span class="grafico__escala">${escala.texto}</span></caption>
    <tbody>
      ${filas.map(({ etiqueta, cifra, proporcion }) => html`<tr>
        <th scope="row">${etiqueta}</th>
        <td><span class="grafico__cifra">${cifra}</span>${proporcion > 0 && html`<span class="grafico__barra" aria-hidden="true" style="inline-size: ${anchura(proporcion)}"></span>`}</td>
      </tr>`)}
    </tbody>
  </table>`;
}

function avisoSinCerrar(n) {
  if (n === 0) return '';
  const texto = n === 1
    ? 'Hay 1 cita sin cerrar en este periodo: ya ha pasado su hora y sigue como reservada. No cuenta en ninguna cifra, y las cifras estarán completas cuando recepción la cierre.'
    : `Hay ${n} citas sin cerrar en este periodo: ya ha pasado su hora y siguen como reservadas. No cuentan en ninguna cifra, y las cifras estarán completas cuando recepción las cierre.`;
  return html`<p class="aviso aviso--info" role="status">${texto} <a class="boton" href="/agenda">Ir a la agenda</a></p>`;
}

export function vistaAnalitica({ clinica, panel, momentoFijado }) {
  const { periodo } = panel;
  const contenido = html`<h1>Analítica</h1>
    <p class="analitica__periodo">Del ${fecha(periodo.inicio)} al ${fecha(periodo.fin)}: las 8 últimas semanas completas. La semana en curso no cuenta hasta que termina.</p>
    ${avisoSinCerrar(panel.sinCerrar)}`;
  return layout({ titulo: 'Analítica', clinica, contenido, momentoFijado });
}
