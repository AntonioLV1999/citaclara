# Contrato: página del panel de analítica

**Feature**: [spec.md](../spec.md) | **Contrato de la 001**: [interfaz-web.md](../../001-nucleo-agenda/contracts/interfaz-web.md)

HTML generado en el servidor, con el `layout` común de la 001: cabecera, menú, aviso del reloj fijado cuando lo hay (FR-043 de la 001) y `Cache-Control: no-store`. La página no lleva JavaScript.

## Ruta

| Método y ruta | Propósito | Respuestas |
|---------------|-----------|------------|
| `GET /analitica` | El panel de la clínica de la sesión. La consulta de la URL se ignora | 200 |

- **Sin sesión de recepción**, o con una sesión de paciente en cualquier cookie: 303 a `/acceso`, sin ninguna cifra (FR-001, H5-E2, H5-E8).
- **Cualquier otro método** sobre `/analitica` o bajo `/analitica/`: no hay ruta. 401 sin sesión y 404 con sesión, con la página de mensaje de la 001 y sin tocar ningún dato (H5-E5).
- La respuesta **no pone cookies** (RA8).

## Menú (FR-003)

El menú principal del `layout`, que solo se pinta con sesión, queda así, en este orden: «Agenda», «Nueva cita», «Analítica» (enlace a `/analitica`) y «Salir».

## Estructura de la página (FR-004, FR-005)

En este orden:

1. `<h1>`: «Analítica».
2. **Periodo**: «Del 07/09/2026 al 01/11/2026: las 8 últimas semanas completas. La semana en curso no cuenta hasta que termina.»
3. **Aviso de citas sin cerrar** (RA6, FR-011), solo si hay alguna, con `role="status"`:
   - «Hay 31 citas sin cerrar en este periodo: ya ha pasado su hora y siguen como reservadas. No cuentan en ninguna cifra, y las cifras estarán completas cuando recepción las cierre.» Con una sola: «Hay 1 cita sin cerrar en este periodo: ya ha pasado su hora y sigue como reservada. No cuenta en ninguna cifra, y las cifras estarán completas cuando recepción la cierre.»
   - Enlace «Ir a la agenda» a `/agenda`.
4. Cuatro apartados (`<section>` con su `<h2>`), cada uno con su frase llana visible bajo el título (FR-010):

| `<h2>` | Frase llana (FR-010) |
|--------|----------------------|
| Ingresos por servicio | «Suma del precio de las citas completadas. Las no asistidas, las canceladas y las reservadas no suman.» |
| No asistencia por profesional | «Tasa de no asistencia: de las citas que debían atenderse, es decir, las completadas y las no asistidas, qué parte acabó sin que el paciente viniera. Las canceladas no cuentan, sea quien sea quien cancelara.» |
| Ocupación semanal por profesional | «Ocupación: tiempo de las citas completadas dividido entre el horario de la clínica, de lunes a viernes de 09:00 a 20:00, que son 55 horas por semana y profesional. Las no asistidas, las canceladas y las reservadas no cuentan.» |
| Evolución de las últimas 8 semanas | «Las mismas cifras para toda la clínica, semana a semana, calculadas igual que en los apartados anteriores.» |

El horario y las 55 horas de la frase de ocupación salen de las constantes del horario de FR-012 de la 001, no se escriben a mano.

## Gráficos (FR-019 a FR-021)

Todos siguen el mismo patrón ([research.md §7](../research.md#7-gráficos-sin-dependencias-fr-019-a-fr-021)):

- Una `<table class="grafico">` con `<caption>` (el título del gráfico) y, bajo él, la escala en texto: «Escala de 0 % a 30 %» o «Escala desde 0,00 €».
- Cada fila: la etiqueta en `<th scope="row">`, la cifra exacta en texto y una barra con `aria-hidden="true"` cuya longitud es la proporción sobre la escala. Las barras empiezan siempre en cero y un valor cero no dibuja barra.
- Ningún gráfico distingue nada solo por el color: cada barra tiene su etiqueta escrita, y cada serie tiene su gráfico.

### Ingresos por servicio

Gráfico «Ingresos por servicio», con una fila por servicio de la clínica en orden de `id`, incluidos los que tienen 0 (H1-E4). Cifra de cada fila: «220 citas · 8.800,00 €» (singular: «1 cita»). Debajo, fuera de las barras: «Total del periodo: 15.380,00 €».

### No asistencia por profesional

- Gráfico «Tasa de no asistencia», con una fila por profesional y una última, «Toda la clínica». Cifra: «9,2 %» o «Sin datos».
- Tabla «Citas por profesional», con columnas «Profesional», «Completadas», «No asistidas», «Canceladas» y «Tasa», y la fila «Toda la clínica»: `María | 129 | 13 | 9 | 9,2 %`.

### Ocupación semanal por profesional

- Un gráfico por profesional, con título «Ocupación de María» y nueve filas: «Semana del 07/09/2026» a «Semana del 26/10/2026» y «Las 8 semanas». Cifra: «28,6 %». Los tres comparten la escala.
- Tabla «Horas del periodo», con columnas «Profesional», «Capacidad», «Horas completadas» y «Ocupación», y la fila «Toda la clínica»: `María | 440 h | 103 h | 23,4 %` y `Toda la clínica | 1.320 h | 274,5 h | 20,8 %`.

### Evolución de las últimas 8 semanas

- Tres gráficos de la clínica en conjunto, cada uno con una fila por semana en orden cronológico («Semana del 07/09/2026»): «Ocupación de la clínica» (`22,6 %`), «Tasa de no asistencia de la clínica» (`16,0 %` o «Sin datos») e «Ingresos de la clínica» (`1.975,00 €`). Bajo el de ingresos: «Total de las 8 semanas: 15.380,00 €».
- Tabla «Citas por semana», con columnas «Semana», «Completadas», «No asistidas» y «Canceladas», y una fila final «Total»: `07/09/2026 | 42 | 8 | 7` y `Total | 380 | 46 | 37`.

## Formatos (FR-014, RA7)

| Cifra | Formato | Ejemplos |
|-------|---------|----------|
| Importe | `euros()` de la 001, sin abreviar ni redondear | `8.800,00 €`, `0,00 €`, `15.380,00 €` |
| Porcentaje | Un decimal, mitad hacia arriba, una sola vez | `9,2 %`, `0,0 %`, `Sin datos` |
| Horas | Exactas, sin redondear | `103 h`, `69,5 h`, `1.320 h` |
| Fecha | `dd/mm/aaaa` | `07/09/2026` |

## Textos

- Español de España y sin jerga (FR-022, FR-027 de la 001). Los estados se nombran siempre en plural y en lenguaje llano («completadas», «no asistidas», «canceladas», «reservadas»), nunca con su código (`no_asistida`).
- La página no contiene ningún dato de pacientes (FR-012).

## Presentación (FR-020, FR-022)

- Sin desplazamiento horizontal de la página de 360 píxeles al portátil.
- Gráficos: por debajo de 40rem, la etiqueta de cada fila va encima de su cifra y de su barra; desde 40rem, etiqueta, cifra y barra van en una sola línea.
- Tablas: su título es su `<caption>`. Por debajo de 40rem, cada fila es una ficha con el nombre de la fila arriba y cada cifra junto al nombre de su columna (atributo `data-columna`); la cabecera solo se oculta a la vista, y los lectores de pantalla la siguen leyendo.
- Texto con contraste de al menos 4,5:1, barras con al menos 3:1 sobre su fondo, y controles de al menos 44 × 44 píxeles (el enlace del aviso y los del menú).
