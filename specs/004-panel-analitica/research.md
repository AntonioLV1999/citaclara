# Investigación: Panel de analítica

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 11/11/2026

El contexto técnico no tenía ninguna incógnita abierta: la 004 hereda el stack de la 001 (Node 26, `node:http`, `node:sqlite`, HTML generado en el servidor) y no lo cambia. Esta investigación registra las decisiones de diseño propias del panel, cada una frente a la alternativa más simple (constitución, principio IV).

Base de partida: rama rebasada sobre `master` (`f965be1`), con el segundo cambio de la 001 aprobado e implementado, y la suite en verde.

## 1. Dónde se calculan las cifras

- **Decisión**: una consulta lee las citas del periodo, una fila por cita y solo con lo necesario (`profesional_id`, `servicio_id`, `estado`, `inicio`, la duración y el precio del servicio). Todo el cálculo lo hace una función pura de `src/dominio/analitica.js`, que recibe esas filas, los profesionales, los servicios y el «ahora» local, y devuelve todas las cifras del panel.
- **Por qué**: con el volumen de la semilla son unas 500 filas, y una función pura se prueba regla a regla (RA1 a RA7) sin base ni servidor, como el resto del dominio de la 001. La cita sin cerrar se decide con `sinCerrar` de `src/dominio/estados.js`, la única definición de FR-040, y no con una condición SQL que la repita.
- **Alternativas descartadas**:
  - *Agregar en SQL con `GROUP BY`*: menos filas, pero reparte las reglas entre SQL y JavaScript, duplica FR-040 y obliga a probar las reglas contra una base.
  - *Guardar cifras precalculadas*: lo prohíbe RA8.

## 2. Un único instante de los datos (FR-015, SC-002)

- **Decisión**: las tres lecturas (profesionales, servicios y citas del periodo) van dentro de una transacción de lectura (`BEGIN` diferido, lecturas y `COMMIT`; `ROLLBACK` si algo falla), en la conexión del servidor. Con SQLite en modo WAL, una transacción de lectura ve una única instantánea desde su primera lectura, aunque otro proceso escriba mientras tanto.
- **Por qué**: dentro del servidor no hay intercalado posible, porque `node:sqlite` es síncrono y el manejador termina antes de atender otra petición. El riesgo real es otro proceso que escriba en el mismo archivo (la semilla, un script, o los procesos de las pruebas de concurrencia). La transacción de lectura lo resuelve sin bloquear a nadie: no toma el turno de escritura.
- **Alternativas descartadas**:
  - *`BEGIN IMMEDIATE`*: también da un instante único, pero toma el turno de escritura y frenaría a recepción mientras se abre el panel, sin ninguna ventaja.
  - *Una sola sentencia SQL con todo*: da el mismo instante, pero obliga a agregar en SQL (ver §1).
- **Dónde vive**: la función auxiliar está en `src/datos/analitica.js`, junto a las consultas del panel, y no se añade a `src/datos/bd.js`, que no la necesita para nada más.

## 3. Periodo y semanas (RA1, RA2, FR-016, días de cambio de hora)

- **Decisión**: el «hoy» sale de `ahoraLocal(contexto, clinica.zona_horaria)` de `src/dominio/tiempo.js`, que ya respeta el momento de referencia de FR-043. El lunes de la semana en curso es `hoy` menos `(diaDeSemana(hoy) + 6) % 7` días. El periodo va del lunes de 8 semanas antes (`sumarDias(lunes, -56)`) al domingo anterior (`sumarDias(lunes, -1)`), y las citas se filtran con `inicio >= 'AAAA-MM-DDT00:00'` del primer lunes e `inicio < 'AAAA-MM-DDT00:00'` del lunes en curso. La semana de una cita es la división entera de los días entre la fecha de su inicio y el primer lunes, entre 7.
- **Por qué**: las horas se guardan como texto en hora local de la clínica y `tiempo.js` hace la aritmética con UTC como calendario neutro, así que ni el cambio de hora ni la zona del proceso o del dispositivo intervienen. Canarias funciona igual porque «hoy» se calcula con la zona de la clínica.
- **Comprobación prevista**: la clínica de Canarias de `tests/ayudas/escenario.js` con el reloj real en el lunes 09/11/2026 a las 00:30 peninsulares, que son las 23:30 del domingo en Canarias: para Madrid el periodo empieza el 14/09/2026, y para Canarias, el 07/09/2026. Y un periodo que contiene el 28/03/2027, con la semilla regenerada para el lunes 05/04/2027.

## 4. Capacidad (RA4)

- **Decisión**: la capacidad semanal de un profesional se calcula recorriendo los 7 días de la semana con `esDiaLaborable` y sumando `minutosEntre(APERTURA, CIERRE)` de `src/dominio/huecos.js` por cada día laborable. Con el horario actual da 5 × 660 = 3.300 minutos (55 h); en el periodo, 26.400 minutos (440 h) por profesional y 79.200 (1.320 h) para la clínica de 3 profesionales.
- **Por qué**: así la capacidad sale del horario de FR-012 de la 001 y cambia con él, como pide el supuesto «Capacidad teórica», sin copiar un 55 en el código. Como el horario no depende de la fecha, el cambio de hora no altera la capacidad.
- **Tiempo de una cita**: la `duracion_min` de su servicio, nunca `fin - inicio` (caso límite «Días de cambio de hora»).
- **Alternativa descartada**: *una constante `CAPACIDAD_SEMANAL = 3300`*: más corta, pero se quedaría desfasada si otra spec cambia el horario.

## 5. Porcentajes exactos (RA7)

- **Decisión**: cada porcentaje se calcula a partir de sus dos enteros (recuentos o minutos) en décimas, con aritmética entera y la mitad hacia arriba: `décimas = floor((2000 · n + d) / (2 · d))`. Se muestra con una nueva función `porcentaje(n, d)` de `src/dominio/formato.js`, que da `9,2 %` o `Sin datos` si `d` es 0. Los porcentajes nunca se promedian: el de la clínica sale de los recuentos totales (H2-E2) y el del periodo, de los minutos del periodo.
- **Por qué**: con coma flotante, `Math.round(x * 10) / 10` puede redondear mal los casos de mitad exacta. Los enteros son pequeños (miles), así que la fórmula entera es exacta y simple.
- **Comprobación**: las cifras de referencia, más casos de mitad exacta (1 de 16 es 6,25 %, que se muestra 6,3 %; 1 de 80 es 1,25 %, que se muestra 1,3 %) y el denominador cero.

## 6. Importes y horas (RA5, FR-013, FR-014)

- **Decisión**: los ingresos se suman en céntimos enteros y se muestran con `euros()` de `src/dominio/formato.js`, que ya da `1.234,56 €`. El total del periodo se obtiene sumando las partes por servicio, y la función de dominio comprueba que es igual a la suma por semana. Si no lo fuera, lanza un error en lugar de mostrar un total que no cuadra (principio II).
- **Horas**: los minutos son múltiplos de 15, así que las horas son exactas en cuartos. Una nueva función `horas(minutos)` de `formato.js` las escribe sin redondear y con el formato español: `103 h`, `69,5 h`, `1.320 h`, `274,5 h` o, si llegara el caso, `12,25 h`.
- **Alternativa descartada**: *mostrar las horas redondeadas a un decimal*: rompería la exactitud con cuartos de hora.

## 7. Gráficos sin dependencias (FR-019 a FR-021)

- **Decisión**: gráficos de barras horizontales en HTML y CSS, generados en el servidor y sin JavaScript. Cada gráfico es una tabla (`<table>` con `<caption>`): cada fila tiene su etiqueta en texto (`<th scope="row">`), su cifra exacta en texto y una barra decorativa con `aria-hidden="true"` cuya longitud es la proporción de la cifra sobre la escala del gráfico.
- **Por qué**:
  - **Texto exacto y lectores de pantalla** (FR-019): la cifra está escrita en la fila, no en una etiqueta emergente, y la tabla se recorre con las órdenes normales del lector de pantalla.
  - **Sin depender del color** (FR-020): no hay leyendas de color. Cada barra lleva su nombre al lado, y las series distintas van en gráficos distintos con su propio título (ocupación de cada profesional, y cada cifra de la evolución).
  - **Contraste** (FR-020): las barras usan `--marca` (`#0b5cad`) sobre `--superficie` (`#ffffff`), unos 6,6:1, por encima de 3:1.
  - **360 píxeles** (FR-022): la etiqueta va encima de la barra en pantallas estrechas, así que ninguna fila necesita más ancho que el de la pantalla.
- **Escala** (FR-021): todas las barras empiezan en cero. La escala de un gráfico de porcentajes va de 0 % al primer múltiplo de 10 % igual o superior a su valor más alto, y se dice en texto bajo el título («Escala de 0 % a 30 %»). Los tres gráficos de ocupación por profesional comparten la misma escala para que se puedan comparar. La de importes va de 0,00 € al importe más alto del gráfico. Un valor cero no dibuja barra y conserva su cifra.
- **Alternativas descartadas**:
  - *Una biblioteca de gráficos* (Chart.js u otra): añade una dependencia y JavaScript en el navegador, dibuja en un lienzo que el lector de pantalla no lee y suele abreviar importes en los ejes. Ninguna necesidad de la spec la justifica (principio IV).
  - *SVG en línea*: más trabajo para que el texto se adapte a 360 píxeles, sin ninguna ventaja para barras horizontales.
  - *Gráfico de líneas para la evolución*: con 8 puntos y tres magnitudes distintas exigiría tres ejes o tres gráficos, y las barras con su cifra se leen igual de bien a 360 píxeles.

## 8. Ruta, menú y solo lectura (FR-001 a FR-003, FR-018, RA8)

- **Decisión**: una sola ruta, `GET /analitica`, registrada en `src/web/servidor.js` como el resto. No es pública, así que `requerirSesion` ya la protege: sin sesión de recepción redirige a `/acceso`, y una sesión de paciente se trata igual que no tener sesión (FR-037 de la 001). Cualquier otro método sobre `/analitica` no tiene ruta: responde 401 sin sesión y 404 con sesión, sin efecto. La consulta de la URL se ignora: no hay filtros (supuesto «Un solo periodo fijo»).
- **Menú**: el `layout` de `src/web/plantilla.js` añade el enlace «Analítica» al menú principal, que ya solo se pinta con sesión.
- **Solo lectura**: el módulo de datos del panel solo contiene `SELECT`. El panel no pone cookies, no escribe registros de consulta y no guarda preferencias. Ningún archivo de esta feature toca `esquema.sql` ni `src/semilla/`.
- **Comprobación**: además de comparar el contenido completo de la base antes y después de 100 aperturas (SC-003), un test estático comprueba que los módulos del panel no contienen `INSERT`, `UPDATE`, `DELETE`, `REPLACE` ni `transaccionInmediata`.
- **Contenido comparado en SC-003**: el contenido lógico de todas las tablas (cada fila de cada tabla, en orden), no los bytes del archivo, que SQLite puede reorganizar en un punto de control del WAL sin cambiar ningún dato.

## 9. Sin datos de pacientes (FR-012)

- **Decisión**: la consulta del panel no une la tabla `paciente` ni lee ninguna columna suya. La vista solo recibe cifras, nombres de profesionales y nombres de servicios.
- **Comprobación**: la página completa no contiene ninguno de los nombres, teléfonos, correos ni enlaces de los 40 pacientes de la semilla.

## 10. Trazabilidad propia (FR-023, SC-008)

- **Decisión**: un test nuevo, `tests/unit/trazabilidad-004.test.js`, lee `specs/004-panel-analitica/spec.md` y extrae RA1 a RA8, los 22 escenarios (`004/H1-E1` a `004/H5-E8`) y los criterios `004/SC-001` a `004/SC-008`. Exige que cada uno, salvo `004/SC-006`, aparezca en el nombre de un test que **empiece** por un identificador de la 004 (`RA\d` o `004/`), con la misma frontera de palabra que la 001. También exige que el protocolo manual de SC-006 esté en `specs/004-panel-analitica/checklists/entrega.md`.
- **Por qué**: es la misma mecánica que el test de la 001, que ya admite `RA\d` y `004/...` en su comprobación «todos los tests empiezan por lo que comprueban», y no cuenta los tests de la 004 para la cobertura de la 001. El test de la 001 no se toca.
- **Alternativa descartada**: *ampliar el test de la 001 para que lea las dos specs*: mezclaría la cobertura de dos propietarios en un archivo que es de la 001.

## 11. Pruebas con el reloj fijado y otras semillas (FR-017, FR-023, SC-005)

- **Decisión**: los tests de integración arrancan el servidor con `momentoFijado: '2026-11-04T12:00'` (FR-043 de la 001) sobre una base temporal con la semilla por defecto, y comparan el texto de la página con las tablas de «Cifras de referencia». Para SC-005 se repite con la semilla de los lunes 04/01/2027 y 05/04/2027, y el reloj en el miércoles de esa semana a las 12:00: todas las cifras coinciden y solo cambian las fechas. El de abril pone el cambio de hora del 28/03/2027 dentro del periodo.
- **Comprobación ya hecha**: el 11/11/2026, con la semilla de `master` (`f965be1`) en una base temporal, las cifras por servicio, por profesional y los minutos coinciden con las de la spec, también con el lunes 04/01/2027, y el periodo del 14/09/2026 al 08/11/2026 tiene 31 citas sin cerrar ([nota de la spec](spec.md#11112026-base-para-planificar)).

## 12. Aperturas mientras recepción cierra citas (SC-002)

- **Decisión**: una prueba de concurrencia con un proceso hijo, como las de la 001. El servidor se arranca con el reloj en el 11/11/2026 a las 12:00, de modo que las 31 citas sin cerrar caen en el periodo. El hijo, con su propia conexión, las completa una a una, mientras el proceso principal abre el panel repetidamente. En cada apertura se comprueba que el total del periodo es igual a la suma por servicio y a la suma por semana, y que completadas + no asistidas + canceladas + sin cerrar da siempre el mismo número, porque cerrar una cita no cambia cuántas hay en el periodo.
- **Por qué**: es el único caso en que dos procesos tocan el mismo archivo mientras se abre el panel, y es justo lo que protege la transacción de lectura (§2).

## 13. Rendimiento (SC-004)

- **Decisión**: un test como el `SC-004` de la 001: `GET /analitica` con la semilla completa responde en menos de 1 segundo. No hace falta ningún índice nuevo: el filtro por `clinica_id` e `inicio` recorre unas 500 filas, y añadir un índice sería modificar el esquema, que FR-018 prohíbe.
