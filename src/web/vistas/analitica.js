import { euros, fecha, horas, porcentaje } from '../../dominio/formato.js';
import { APERTURA, CIERRE } from '../../dominio/huecos.js';
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

const citas = (n) => (n === 1 ? '1 cita' : `${n} citas`);

function apartado(titulo, frase, cuerpo) {
  return html`<section class="tarjeta">
    <h2>${titulo}</h2>
    <p class="analitica__nota">${frase}</p>
    ${cuerpo}
  </section>`;
}

function apartadoIngresos({ servicios, total }) {
  const escala = escalaImporte(servicios.map((s) => s.centimos));
  return apartado('Ingresos por servicio',
    'Suma del precio de las citas completadas. Las no asistidas, las canceladas y las reservadas no suman.',
    html`${graficoBarras({
      titulo: 'Ingresos por servicio',
      escala,
      filas: servicios.map((s) => ({
        etiqueta: s.servicio.nombre,
        cifra: `${citas(s.completadas)} · ${euros(s.centimos)}`,
        proporcion: escala.proporcion(s.centimos),
      })),
    })}
    <p class="analitica__total">Total del periodo: ${euros(total)}</p>`);
}

/**
 * Tabla de cifras exactas: la primera columna nombra la fila; la fila `total` va resaltada. Cada celda
 * lleva el nombre de su columna, que en el móvil se escribe a su lado (FR-022).
 */
function tabla({ titulo, columnas, filas }) {
  return html`<table class="tabla">
    <caption>${titulo}</caption>
    <thead><tr>${columnas.map((columna) => html`<th scope="col">${columna}</th>`)}</tr></thead>
    <tbody>
      ${filas.map(({ celdas, total }) => html`<tr${total ? html` class="tabla__total"` : ''}>
        <th scope="row">${celdas[0]}</th>${celdas.slice(1).map((celda, i) => html`<td data-columna="${columnas[i + 1]}">${celda}</td>`)}
      </tr>`)}
    </tbody>
  </table>`;
}

function apartadoNoAsistencia({ profesionales, clinica }) {
  const filas = [
    ...profesionales.map((fila) => ({ ...fila, nombre: fila.profesional.nombre })),
    { ...clinica, nombre: 'Toda la clínica', total: true },
  ];
  const escala = escalaPorcentaje(filas.map((fila) => fila.tasa));
  return apartado('No asistencia por profesional',
    'Tasa de no asistencia: de las citas que debían atenderse, es decir, las completadas y las no asistidas, qué parte acabó sin que el paciente viniera. Las canceladas no cuentan, sea quien sea quien cancelara.',
    html`${graficoBarras({
      titulo: 'Tasa de no asistencia',
      escala,
      filas: filas.map((fila) => ({
        etiqueta: fila.nombre,
        cifra: porcentaje(fila.tasa.numerador, fila.tasa.denominador),
        proporcion: escala.proporcion(fila.tasa),
      })),
    })}
    ${tabla({
      titulo: 'Citas por profesional',
      columnas: ['Profesional', 'Completadas', 'No asistidas', 'Canceladas', 'Tasa'],
      filas: filas.map((fila) => ({
        total: fila.total,
        celdas: [fila.nombre, fila.completadas, fila.noAsistidas, fila.canceladas, porcentaje(fila.tasa.numerador, fila.tasa.denominador)],
      })),
    })}`);
}

const comoPorcentaje = (par) => porcentaje(par.numerador, par.denominador);
const semanaDel = (semana) => `Semana del ${fecha(semana.inicio)}`;

function apartadoOcupacion({ profesionales, clinica }, periodo, semanal) {
  // Una sola escala para los tres gráficos, para que se puedan comparar entre sí.
  const escala = escalaPorcentaje(profesionales.flatMap((fila) => [...fila.semanas.map((s) => s.ocupacion), fila.periodo.ocupacion]));
  const frase = `Ocupación: tiempo de las citas completadas dividido entre el horario de la clínica, de lunes a viernes de ${APERTURA} a ${CIERRE}, que son ${horas(semanal).replace(/ h$/, ' horas')} por semana y profesional. Las no asistidas, las canceladas y las reservadas no cuentan.`;
  const filaDeHoras = (nombre, { capacidad, minutos, ocupacion }, total) => ({
    total, celdas: [nombre, horas(capacidad), horas(minutos), comoPorcentaje(ocupacion)],
  });
  return apartado('Ocupación semanal por profesional', frase, html`${profesionales.map((fila) => graficoBarras({
    titulo: `Ocupación de ${fila.profesional.nombre}`,
    escala,
    filas: [
      ...fila.semanas.map((s, i) => ({ etiqueta: semanaDel(periodo.semanas[i]), cifra: comoPorcentaje(s.ocupacion), proporcion: escala.proporcion(s.ocupacion) })),
      { etiqueta: 'Las 8 semanas', cifra: comoPorcentaje(fila.periodo.ocupacion), proporcion: escala.proporcion(fila.periodo.ocupacion) },
    ],
  }))}
    ${tabla({
      titulo: 'Horas del periodo',
      columnas: ['Profesional', 'Capacidad', 'Horas completadas', 'Ocupación'],
      filas: [
        ...profesionales.map((fila) => filaDeHoras(fila.profesional.nombre, fila.periodo, false)),
        filaDeHoras('Toda la clínica', clinica, true),
      ],
    })}`);
}

function apartadoEvolucion(evolucion) {
  const graficoSemanal = (titulo, escala, cifra, valor) => graficoBarras({
    titulo,
    escala,
    filas: evolucion.map((s) => ({ etiqueta: semanaDel(s.semana), cifra: cifra(s), proporcion: escala.proporcion(valor(s)) })),
  });
  const suma = (campo) => evolucion.reduce((acumulado, s) => acumulado + s[campo], 0);
  return apartado('Evolución de las últimas 8 semanas',
    'Las mismas cifras para toda la clínica, semana a semana, calculadas igual que en los apartados anteriores.',
    html`${graficoSemanal('Ocupación de la clínica', escalaPorcentaje(evolucion.map((s) => s.ocupacion)),
      (s) => comoPorcentaje(s.ocupacion), (s) => s.ocupacion)}
    ${graficoSemanal('Tasa de no asistencia de la clínica', escalaPorcentaje(evolucion.map((s) => s.tasa)),
      (s) => comoPorcentaje(s.tasa), (s) => s.tasa)}
    ${graficoSemanal('Ingresos de la clínica', escalaImporte(evolucion.map((s) => s.centimos)),
      (s) => euros(s.centimos), (s) => s.centimos)}
    <p class="analitica__total">Total de las 8 semanas: ${euros(suma('centimos'))}</p>
    ${tabla({
      titulo: 'Citas por semana',
      columnas: ['Semana', 'Completadas', 'No asistidas', 'Canceladas'],
      filas: [
        ...evolucion.map((s) => ({ celdas: [fecha(s.semana.inicio), s.completadas, s.noAsistidas, s.canceladas] })),
        { total: true, celdas: ['Total', suma('completadas'), suma('noAsistidas'), suma('canceladas')] },
      ],
    })}`);
}

export function vistaAnalitica({ clinica, panel, momentoFijado }) {
  const { periodo } = panel;
  const contenido = html`<h1>Analítica</h1>
    <p class="analitica__periodo">Del ${fecha(periodo.inicio)} al ${fecha(periodo.fin)}: las 8 últimas semanas completas. La semana en curso no cuenta hasta que termina.</p>
    ${avisoSinCerrar(panel.sinCerrar)}
    ${apartadoIngresos(panel.ingresos)}
    ${apartadoNoAsistencia(panel.noAsistencia)}
    ${apartadoOcupacion(panel.ocupacion, periodo, panel.capacidadSemanal)}
    ${apartadoEvolucion(panel.evolucion)}`;
  return layout({ titulo: 'Analítica', clinica, contenido, momentoFijado });
}
