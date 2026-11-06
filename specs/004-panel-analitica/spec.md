# Especificación de feature: Panel de analítica

**Rama de la feature**: `004-panel-analitica`

**Creada**: 06/11/2026

**Estado**: Borrador, pendiente de las dos definiciones de Sara (RA3 y RA4)

**Propietario**: AntonioLV1999 (registrado en `specs/MAPA.md`)

**Entrada**: descripción de la persona usuaria: «Panel de analítica para la clínica. Sara lo necesita para las renovaciones: "enseñar a la clínica lo que CitaClara le ahorra". Alcance: una página del panel (misma clave que la agenda), con interfaz moderna y gráficos claros: ocupación semanal por profesional, tasa de no asistencia por profesional, ingresos por servicio (citas completadas; importes exactos, al céntimo), y evolución de las últimas 8 semanas. Solo lectura: esta feature no escribe NADA. Construye los ejemplos de la spec con los números reales de la semilla. Preguntas cerradas para Sara: ¿cómo se define exactamente "tasa de no asistencia" y "ocupación"?».

## Escenarios de usuario y pruebas *(obligatorio)*

Todas las cifras salen de la semilla por defecto (lunes de referencia 02/11/2026), con el reloj en la semana del 02/11/2026 al 08/11/2026. El periodo analizado es entonces del 07/09/2026 al 01/11/2026, es decir, las 8 semanas de historia. Las cifras que dependen de RA3 o de RA4 están en [Cifras de referencia](#cifras-de-referencia).

### Historia de usuario 1 - Ver los ingresos por servicio (Prioridad: P1)

Sara abre el panel con la clave de la clínica y ve cuánto ha ingresado la clínica por cada servicio en las últimas 8 semanas, con importes exactos.

**Por qué esta prioridad**: es la cifra más concreta para una conversación de renovación, y la que menos admite error (constitución, principio II).

**Prueba independiente**: con los datos de demostración, abrir el panel y comparar cada importe con el recuento de citas completadas por el precio del servicio. Aporta valor por sí sola.

**Escenarios de aceptación**:

1. **Dados** los datos de demostración, **cuando** se abre el panel, **entonces** muestra estos ingresos: Sesión de fisioterapia, 220 citas, 8.800,00 €; Primera visita de fisioterapia, 40 citas, 2.000,00 €; Consulta de nutrición, 82 citas, 2.870,00 €; Primera consulta de nutrición, 38 citas, 1.710,00 €.
2. **Dados** esos ingresos, **cuando** se muestra el total, **entonces** es 15.380,00 €, que coincide exactamente con la suma de los cuatro servicios y con la suma de los ingresos de las 8 semanas.
3. **Dadas** las 46 citas no asistidas, las 37 canceladas y las reservadas, **cuando** se calculan los ingresos, **entonces** ninguna suma: solo cuentan las 380 completadas.
4. **Dado** un servicio sin citas completadas en el periodo, **cuando** se abre el panel, **entonces** aparece con 0 citas y 0,00 €, y no desaparece.

---

### Historia de usuario 2 - Ver la tasa de no asistencia por profesional (Prioridad: P1)

Sara ve qué parte de las citas de cada profesional se pierde porque el paciente no se presenta.

**Por qué esta prioridad**: la no asistencia es el problema que la clínica reconoce en su día a día, y es la cifra que Sara quiere poner sobre la mesa.

**Prueba independiente**: con los datos de demostración, comparar la tasa y los recuentos mostrados de cada profesional con los de la tabla de referencia.

**Escenarios de aceptación**:

1. **Dados** los datos de demostración, **cuando** se abre el panel, **entonces** muestra por profesional estos recuentos del periodo: María, 129 completadas, 13 no asistidas y 9 canceladas; Jorge, 131, 14 y 13; Lucía, 120, 19 y 15. Junto a ellos aparece la tasa de cada profesional y la de la clínica, según RA3 y la tabla de referencia.
2. **Dada** la tasa de la clínica, **cuando** se calcula, **entonces** sale de los recuentos totales (380, 46 y 37) y no de promediar las tasas de los profesionales.
3. **Dada** cualquier tasa mostrada, **cuando** Sara la lee, **entonces** tiene a la vista una frase llana que explica cómo se calcula.

---

### Historia de usuario 3 - Ver la ocupación semanal por profesional (Prioridad: P2)

Sara ve, semana a semana y para cada profesional, qué parte del horario de la clínica se ha aprovechado.

**Por qué esta prioridad**: aporta contexto a las otras cifras, pero depende de una capacidad teórica y la conversación de renovación se sostiene sin ella.

**Prueba independiente**: con los datos de demostración, comparar las 24 celdas (8 semanas por 3 profesionales) con la tabla de referencia.

**Escenarios de aceptación**:

1. **Dados** los datos de demostración, **cuando** se abre el panel, **entonces** cada profesional muestra su ocupación en cada una de las 8 semanas y en el periodo completo, según RA4 y la tabla de referencia.
2. **Dada** una semana y un profesional, **cuando** se calcula la ocupación, **entonces** la capacidad es de 55 horas: 11 horas al día, de lunes a viernes (FR-012 de la 001).
3. **Dada** una ocupación mostrada, **cuando** Sara la lee, **entonces** tiene a la vista una frase llana que explica cómo se calcula.

---

### Historia de usuario 4 - Ver la evolución de las últimas 8 semanas (Prioridad: P2)

Sara ve cómo han evolucionado la ocupación, la no asistencia y los ingresos de la clínica durante las últimas 8 semanas.

**Por qué esta prioridad**: enseña la tendencia, no solo la foto, pero se apoya en las cifras de las historias anteriores.

**Prueba independiente**: con los datos de demostración, comparar los 8 puntos de cada serie con la tabla de referencia.

**Escenarios de aceptación**:

1. **Dados** los datos de demostración, **cuando** se abre el panel, **entonces** la evolución muestra 8 semanas, de la que empieza el 07/09/2026 a la que empieza el 26/10/2026, en orden cronológico.
2. **Dada** la semana del 07/09/2026, **cuando** se consulta, **entonces** indica 42 completadas, 8 no asistidas, 7 canceladas y 1.975,00 € de ingresos; y la semana del 26/10/2026 indica 42, 7, 6 y 1.620,00 €.
3. **Dada** la evolución de ingresos, **cuando** se suman las 8 semanas, **entonces** el resultado es exactamente 15.380,00 €.
4. **Dada** la semana en curso, **cuando** se muestra la evolución, **entonces** no aparece, porque aún no ha terminado (RA1).

---

### Historia de usuario 5 - Consultar sin riesgo: solo con clave y sin tocar nada (Prioridad: P1)

El panel solo se abre con la clave de la clínica, que es la misma de la agenda, y mirarlo no cambia ningún dato.

**Por qué esta prioridad**: las cifras son de negocio y la promesa de esta feature es que no escribe nada.

**Prueba independiente**: intentar abrir el panel sin clave y con ella, y comparar todos los datos almacenados antes y después de consultarlo.

**Escenarios de aceptación**:

1. **Dada** una sesión abierta con la clave de la clínica, **cuando** se elige «Analítica» en el menú, **entonces** se abre el panel sin pedir nada más.
2. **Dado** alguien sin acceso, **cuando** intenta ver el panel o sus datos por cualquier vía, **entonces** se rechaza y no se revela ninguna cifra.
3. **Dadas** dos clínicas, **cuando** una abre el panel, **entonces** todas las cifras son solo suyas.
4. **Dado** el contenido completo de los datos almacenados, **cuando** se abre el panel varias veces, **entonces** el contenido no cambia en absoluto.
5. **Dado** el panel, **cuando** se revisa lo que ofrece, **entonces** no hay ninguna acción que cree, cambie o borre datos, y cualquier intento de escribir a través de él se rechaza.
6. **Dado** el panel, **cuando** se revisa todo lo que muestra, **entonces** no aparece ningún dato de un paciente concreto.
7. **Dado** un móvil con pantalla de 360 píxeles de ancho, **cuando** se abre el panel, **entonces** todos los gráficos y sus cifras se leen sin desplazamiento horizontal de la página.

---

### Casos límite

- **Citas reservadas sin cerrar dentro del periodo**: no cuentan en ninguna cifra, porque no se sabe qué pasó, y el panel avisa de cuántas hay (RA6). Con la semilla por defecto y el reloj en la semana del 09/11/2026, la semana del 02/11/2026 entra en el periodo y el aviso indica 31 citas sin cerrar. Esa semana tiene 0 completadas, 0,00 € y «Sin datos» de no asistencia.
- **Demostración en otra fecha**: el periodo sigue al reloj. Para que el panel enseñe la historia completa, se regenera la semilla con el lunes de la semana actual; las cifras son idénticas y solo cambian las fechas (FR-032 de la 001).
- **Semana sin nada que medir**: la tasa muestra «Sin datos» y no 0 % (RA7). Una tasa de 0,0 % real es otra cosa: la semana del 21/09/2026, Jorge tiene citas y ninguna no asistida.
- **Clínica con menos de 8 semanas de datos**: las 8 semanas se muestran igualmente, y las vacías indican «Sin datos» de no asistencia y 0,00 € de ingresos.
- **Cita cerrada tarde**: si recepción cierra hoy una cita de una semana ya analizada, las cifras de esa semana cambian al volver a abrir el panel. Es lo correcto: el panel refleja el estado actual.
- **Consulta mientras recepción trabaja**: todas las cifras de una misma apertura salen del mismo instante, de modo que los totales cuadran aunque se esté cerrando una cita en ese momento.
- **Días de cambio de hora**: el del 25/10/2026 cae en domingo, dentro de la semana del 19/10/2026. La capacidad sigue siendo de 55 horas y el tiempo de cada cita es la duración de su servicio, nunca una resta de relojes. Si un cambio de hora cae en cualquier otro día, se aplica lo mismo.
- **Límite de semana**: una cita pertenece a la semana de su fecha local de inicio. El cambio de semana es a las 00:00 del lunes en hora local de la clínica, también en Canarias, sea cual sea la zona del dispositivo.
- **Festivos**: la agenda no los modela (supuesto de la 001), así que no reducen la capacidad. El lunes 12/10/2026 tiene 12 citas en la semilla y cuenta como un día normal.
- **Profesional sin citas en una semana**: la ocupación es 0,0 %, y la no asistencia «Sin datos».

## Requisitos *(obligatorio)*

### Reglas de negocio

Los tests de esta feature referencian estos identificadores (constitución, principio VI). Se llaman RA para no confundirlos con las RN de la 001.

- **RA1 (periodo)**: el periodo son las 8 últimas semanas completas, de lunes a domingo, anteriores a la semana en curso según la fecha local de la clínica. La semana en curso nunca cuenta.
- **RA2 (pertenencia)**: una cita pertenece a la semana y al periodo de su fecha local de inicio.
- **RA3 (tasa de no asistencia)**: [NEEDS CLARIFICATION: ¿se calcula sobre las citas que debían atenderse (no asistidas ÷ (completadas + no asistidas)) o sobre todas las citas cerradas, incluidas las canceladas (no asistidas ÷ (completadas + no asistidas + canceladas))?]
- **RA4 (ocupación)**: [NEEDS CLARIFICATION: ¿el tiempo ocupado es solo el de las citas completadas, o también el de las no asistidas?] El resultado se divide entre la capacidad: 55 horas por profesional y semana, y para la clínica, 55 horas por el número de profesionales. El tiempo de una cita es la duración de su servicio.
- **RA5 (ingresos)**: los ingresos son la suma, en céntimos exactos, del precio del servicio de cada cita completada. Ningún importe se redondea.
- **RA6 (citas sin cerrar)**: una cita reservada cuyo inicio ya ha pasado no cuenta en ningún numerador ni denominador. Si hay alguna dentro del periodo, el panel indica cuántas son y que las cifras estarán completas cuando recepción las cierre.
- **RA7 (porcentajes)**: un porcentaje se calcula siempre a partir de los recuentos o minutos exactos de su ámbito, nunca promediando otros porcentajes. Se redondea una sola vez, al mostrarlo, a un decimal y con la mitad hacia arriba (`9,2 %`). Si el denominador es cero, se muestra «Sin datos».
- **RA8 (solo lectura)**: esta feature no crea, cambia ni borra ningún dato, ni guarda nada propio: ni cifras calculadas, ni registros de consulta, ni preferencias.

### Requisitos funcionales

**Acceso**

- **FR-001**: El panel DEBE exigir la misma sesión que la agenda (FR-001 de la 001) para cualquier consulta, por cualquier vía.
- **FR-002**: El panel DEBE limitar todas las cifras a la clínica de la sesión (FR-004 de la 001).
- **FR-003**: El menú principal DEBE incluir la entrada «Analítica», visible solo con sesión abierta.

**Contenido**

- **FR-004**: El panel DEBE ser una única página con cuatro apartados: ingresos por servicio, tasa de no asistencia por profesional, ocupación semanal por profesional y evolución de las últimas 8 semanas.
- **FR-005**: El panel DEBE indicar el periodo analizado con sus fechas de inicio y de fin (`Del 07/09/2026 al 01/11/2026`), y todos los apartados DEBEN usar ese mismo periodo (RA1).
- **FR-006**: Los ingresos por servicio DEBEN mostrar, para cada servicio de la clínica, el número de citas completadas y el importe, más el total del periodo (RA5).
- **FR-007**: La no asistencia por profesional DEBE mostrar, para cada profesional y para la clínica, la tasa y los recuentos de completadas, no asistidas y canceladas (RA3).
- **FR-008**: La ocupación DEBE mostrar, para cada profesional, la de cada una de las 8 semanas y la del periodo (RA4).
- **FR-009**: La evolución DEBE mostrar, para cada una de las 8 semanas y para la clínica en conjunto, la ocupación, la tasa de no asistencia y los ingresos, en orden cronológico.
- **FR-010**: Cada apartado DEBE explicar en una frase llana qué mide y qué citas cuenta. Las definiciones de tasa y de ocupación DEBEN verse sin pulsar nada.
- **FR-011**: Si hay citas sin cerrar en el periodo, el panel DEBE mostrar el aviso de RA6 con su número, y un enlace a la agenda.
- **FR-012**: El panel NO DEBE mostrar ningún dato de pacientes concretos: solo cifras agregadas.

**Exactitud** (constitución, principios II y V)

- **FR-013**: Cada total de importes DEBE coincidir exactamente con la suma de las partes que se muestran: el total del periodo es igual a la suma por servicio y a la suma por semana.
- **FR-014**: Los importes DEBEN mostrarse con el formato español (`1.234,56 €`), y las fechas como `dd/mm/aaaa`. Un gráfico NO DEBE redondear ni abreviar un importe, ni siquiera en sus etiquetas.
- **FR-015**: Todas las cifras de una misma apertura DEBEN corresponder a un único instante de los datos.
- **FR-016**: «Hoy» y la semana en curso DEBEN fijarse con la fecha local de la clínica y nunca con el reloj del dispositivo (FR-023 de la 001).
- **FR-017**: Con la semilla regenerada para otro lunes y el reloj en esa misma semana, el panel DEBE mostrar las mismas cifras, y solo DEBEN cambiar las fechas.

**Solo lectura**

- **FR-018**: El panel NO DEBE ofrecer ninguna acción de escritura ni aceptar ninguna, y DEBE cumplir RA8. Esta feature NO DEBE añadir ni modificar datos, tablas o semilla, de modo que los resúmenes de contenido de FR-030 de la 001 sigan siendo los mismos.

**Interfaz** (constitución, principios VII y VIII)

- **FR-019**: Cada apartado DEBE presentar sus cifras en un gráfico claro, y cada cifra DEBE poder leerse también como texto exacto, sin depender de pasar el ratón por encima. Los lectores de pantalla DEBEN acceder a las mismas cifras.
- **FR-020**: Los gráficos NO DEBEN distinguir profesionales ni series solo por el color, y los elementos gráficos DEBEN tener un contraste de al menos 3:1 con el fondo.
- **FR-021**: Los ejes de porcentaje DEBEN empezar en 0 %, y las barras de importes en 0,00 €, para que el gráfico no exagere las diferencias.
- **FR-022**: El panel DEBE cumplir FR-027 y FR-028 de la 001: español de España sin jerga técnica, de 360 píxeles de ancho al portátil de recepción, sin desplazamiento horizontal de la página, con contraste de al menos 4,5:1 en el texto y controles táctiles de al menos 44 × 44 píxeles.

**Pruebas** (constitución, principio VI)

- **FR-023**: Cada regla RA, cada escenario de aceptación y cada criterio de éxito DEBE tener un test que lo referencie, salvo SC-006, que se comprueba a mano. Las cifras de esta spec DEBEN comprobarse contra la semilla con el reloj fijado.

### Cifras de referencia

Se reproducen con `npm run semilla` y el reloj en la semana del 02/11/2026 al 08/11/2026 (constitución, principio V). Resumen de contenido de la semilla: `f1d7a17b9fa57c74ae6b40814b7f41eacfd084559e412f8a0106857d142b74e8`. Si un cambio de la semilla altera estas cifras, ese mismo cambio las actualiza. Cuando Sara decida, se conservará solo la opción elegida.

**Tasa de no asistencia del periodo (RA3)**

| Ámbito | Completadas | No asistidas | Canceladas | Opción A: sin canceladas | Opción B: con canceladas |
|--------|------------:|-------------:|-----------:|-------------------------:|-------------------------:|
| María | 129 | 13 | 9 | 9,2 % | 8,6 % |
| Jorge | 131 | 14 | 13 | 9,7 % | 8,9 % |
| Lucía | 120 | 19 | 15 | 13,7 % | 12,3 % |
| Clínica | 380 | 46 | 37 | 10,8 % | 9,9 % |

**Ocupación del periodo (RA4)**

| Ámbito | Capacidad | Horas completadas | Horas no asistidas | Opción A: solo completadas | Opción B: con no asistidas |
|--------|----------:|------------------:|-------------------:|---------------------------:|---------------------------:|
| María | 440 h | 103 h | 9,75 h | 23,4 % | 25,6 % |
| Jorge | 440 h | 102 h | 11 h | 23,2 % | 25,7 % |
| Lucía | 440 h | 69,5 h | 10,5 h | 15,8 % | 18,2 % |
| Clínica | 1.320 h | 274,5 h | 31,25 h | 20,8 % | 23,2 % |

**Ocupación semanal por profesional (opción A / opción B de RA4)**

| Semana que empieza | María | Jorge | Lucía |
|--------------------|------:|------:|------:|
| 07/09/2026 | 28,6 % / 31,4 % | 21,8 % / 26,8 % | 17,3 % / 20,9 % |
| 14/09/2026 | 27,3 % / 28,6 % | 27,3 % / 30,0 % | 15,9 % / 19,1 % |
| 21/09/2026 | 25,5 % / 29,5 % | 24,5 % / 24,5 % | 15,9 % / 17,3 % |
| 28/09/2026 | 25,0 % / 26,4 % | 20,5 % / 23,2 % | 18,2 % / 20,9 % |
| 05/10/2026 | 23,6 % / 23,6 % | 28,6 % / 30,0 % | 15,9 % / 16,8 % |
| 12/10/2026 | 20,5 % / 24,5 % | 21,8 % / 23,2 % | 17,3 % / 19,1 % |
| 19/10/2026 | 16,4 % / 17,7 % | 20,5 % / 24,5 % | 15,0 % / 17,7 % |
| 26/10/2026 | 20,5 % / 23,2 % | 20,5 % / 23,2 % | 10,9 % / 13,6 % |

**Evolución de la clínica**

| Semana que empieza | Completadas | No asistidas | Canceladas | Tasa A / B (RA3) | Ocupación A / B (RA4) | Ingresos |
|--------------------|------------:|-------------:|-----------:|-----------------:|----------------------:|---------:|
| 07/09/2026 | 42 | 8 | 7 | 16,0 % / 14,0 % | 22,6 % / 26,4 % | 1.975,00 € |
| 14/09/2026 | 49 | 6 | 3 | 10,9 % / 10,3 % | 23,5 % / 25,9 % | 2.100,00 € |
| 21/09/2026 | 50 | 4 | 4 | 7,4 % / 6,9 % | 22,0 % / 23,8 % | 2.025,00 € |
| 28/09/2026 | 51 | 6 | 3 | 10,5 % / 10,0 % | 21,2 % / 23,5 % | 2.000,00 € |
| 05/10/2026 | 54 | 2 | 5 | 3,6 % / 3,3 % | 22,7 % / 23,5 % | 2.120,00 € |
| 12/10/2026 | 49 | 6 | 4 | 10,9 % / 10,2 % | 19,8 % / 22,3 % | 1.890,00 € |
| 19/10/2026 | 43 | 7 | 5 | 14,0 % / 12,7 % | 17,3 % / 20,0 % | 1.650,00 € |
| 26/10/2026 | 42 | 7 | 6 | 14,3 % / 12,7 % | 17,3 % / 20,0 % | 1.620,00 € |
| **Total** | **380** | **46** | **37** | | | **15.380,00 €** |

### Entidades clave

Esta feature no añade entidades. Lee las de la 001 y deriva de ellas, en cada apertura, estas cifras:

- **Periodo**: las 8 semanas completas de RA1, con sus fechas de inicio y de fin.
- **Cifras por semana y profesional**: recuentos por estado, minutos y ocupación.
- **Cifras por servicio**: citas completadas e importe en céntimos.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El 100 % de las cifras de [Cifras de referencia](#cifras-de-referencia) aparece en el panel con el valor exacto, sin ninguna diferencia.
- **SC-002**: En el 100 % de los casos comprobados, los totales de importes coinciden al céntimo con la suma de sus partes, incluidas las aperturas hechas mientras se cierran citas.
- **SC-003**: Tras abrir el panel 100 veces, el contenido de los datos almacenados es idéntico al inicial.
- **SC-004**: El panel se abre en menos de 1 segundo en su uso normal, con el volumen de los datos de demostración.
- **SC-005**: Con la semilla regenerada para otro lunes, el 100 % de las cifras coincide, y solo cambian las fechas.
- **SC-006**: Al menos 9 de cada 10 personas sin formación encuentran en menos de 1 minuto, solo con lo que ve en pantalla, los ingresos de un servicio y la tasa de no asistencia de un profesional. No tiene test automático, porque mide el uso real de personas: se comprueba a mano.
- **SC-007**: El panel cumple los umbrales de FR-020 y FR-022 a 360 píxeles de ancho y en el portátil.
- **SC-008**: El 100 % de las reglas RA, de los escenarios de aceptación y de los criterios tiene un test que los referencia, salvo SC-006, y la suite está en verde.

## Supuestos

- **El panel no calcula ningún ahorro**: el encargo pide «enseñar lo que CitaClara le ahorra», pero no existen datos de la clínica de antes de CitaClara con los que comparar. El panel muestra hechos de la clínica y no afirma que CitaClara los haya causado. Una cifra de ahorro exigiría una spec propia con su referencia de partida.
- **Un solo periodo fijo**: sin selector de fechas, filtros, comparativas, exportación ni impresión específica. El encargo no los pide (constitución, principio IV).
- **Evolución de clínica**: «evolución de las últimas 8 semanas» se interpreta como las tres cifras (ocupación, no asistencia e ingresos) de la clínica en conjunto. El detalle por profesional ya está en la ocupación semanal.
- **Periodo de la tasa e ingresos**: la tasa por profesional y los ingresos por servicio se dan para las 8 semanas juntas, porque semana a semana cada profesional tiene muy pocas citas para que su tasa signifique algo.
- **Misma clave, mismas cifras**: quien tenga la clave de la clínica verá también los ingresos y las cifras por profesional. Es lo pedido, y hereda la deuda de autenticación de la 001, incluida la conexión sin cifrar.
- **Capacidad teórica**: la 001 tiene un horario único y no modela jornadas, ausencias ni festivos, así que todos los profesionales tienen 55 horas semanales en todas las semanas. Si una clínica real trabaja menos horas, su ocupación saldrá baja.
- **Precio actual del servicio**: los ingresos usan el precio del servicio, como la cita de la 001. La spec que permita cambiar precios deberá guardar el precio histórico, o los ingresos pasados cambiarían.
- **Ingresos no son cobros**: la 001 no registra pagos. «Ingresos» significa el valor de las citas completadas según su precio.
- **Datos ficticios**: las cifras de la semilla sirven para demostrar el producto, no como resultados que enseñar a una clínica real.
- **Dependencia**: requiere la 001 (agenda, acceso, semilla y formatos). No depende de las features 002 ni 003.
