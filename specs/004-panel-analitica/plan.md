# Plan de implementación: Panel de analítica

**Rama**: `004-panel-analitica` | **Fecha**: 11/11/2026 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de la feature en `specs/004-panel-analitica/spec.md`, aprobada por su propietario el 12/11/2026, con la base actualizada el 11/11/2026 ([nota](spec.md#11112026-base-para-planificar))

## Resumen

Una página de solo lectura, `GET /analitica`, con la misma sesión que la agenda, que enseña a la clínica cuatro cifras de las 8 últimas semanas completas: ingresos por servicio, tasa de no asistencia por profesional, ocupación semanal por profesional y su evolución. Las definiciones son las de RA1 a RA8, y las cifras con la semilla por defecto están fijadas en la spec.

El enfoque reutiliza todo el stack de la 001 sin añadir nada: una transacción de lectura trae las citas del periodo, una función pura del dominio calcula todas las cifras con enteros, y la vista dibuja gráficos de barras en HTML y CSS, con cada cifra escrita en texto. No cambia el esquema, la semilla ni ninguna regla de la 001.

## Contexto técnico

**Lenguaje y versión**: JavaScript (módulos ES) sobre Node 26, como la 001

**Dependencias principales**: ninguna nueva. Las de la 001: `node:http` y `node:sqlite` en producción, y `@playwright/test` en desarrollo. Los gráficos no usan biblioteca ([research.md §7](research.md#7-gráficos-sin-dependencias-fr-019-a-fr-021)).

**Almacenamiento**: SQLite de la 001, solo lectura. Sin cambios de esquema; sigue en la versión 2 ([data-model.md](data-model.md)).

**Pruebas**: `node:test` para dominio, rutas, trazabilidad y concurrencia; Playwright para interfaz y accesibilidad

**Plataforma objetivo**: la de la 001: servidor con Node; navegadores actuales de portátil y móvil

**Tipo de proyecto**: aplicación web, un solo proyecto

**Objetivos de rendimiento**: el panel se abre en menos de 1 segundo con la semilla (SC-004). Son 3 consultas y unas 500 filas por apertura.

**Restricciones**: cifras exactas al céntimo y al décimo de punto con la mitad hacia arriba (RA5, RA7); totales que cuadran también mientras recepción cierra citas (FR-013, FR-015); cero escrituras (RA8); de 360 píxeles al portátil sin desplazamiento horizontal (FR-022)

**Escala y alcance**: 1 ruta y 1 pantalla nuevas, 1 entrada de menú; 2 a 5 profesionales por clínica y unos 4 servicios

**Estado de partida**: rama rebasada sobre `master` (`f965be1`), con la suite en verde: `npm test` (416) y `npm run test:e2e` (66). Las cifras de referencia de la spec se han comprobado contra esa semilla ([research.md §11](research.md#11-pruebas-con-el-reloj-fijado-y-otras-semillas-fr-017-fr-023-sc-005)).

No queda ninguna incógnita: todo está resuelto en [research.md](research.md).

## Comprobación de constitución

*PUERTA: debe superarse antes de la fase 0 y repetirse tras la fase 1.*

| Principio | Cumplimiento | Estado |
|-----------|--------------|--------|
| I. Spec primero | Propietario registrado en `specs/MAPA.md`. La spec la **aprobó su propietario el 12/11/2026**, sin cambios respecto a la versión planificada, y se cumple su condición de S-18 (`master` en verde). Las reglas que cita de la 001 (FR-012, FR-016, FR-035, FR-037, FR-040, FR-043 y RN8) están aprobadas. Este plan no añade comportamiento fuera de la spec. | Cumple |
| II. Números | Céntimos enteros y `euros()` de la 001; porcentajes con aritmética entera y un solo redondeo al mostrar; horas exactas en cuartos. Los tres totales se comprueban en cada apertura y, si no cuadran, la página no se muestra. Fechas en `dd/mm/aaaa`; «hoy» con la zona de la clínica, también en Canarias; sin efecto del cambio de hora, con prueba del 28/03/2027. | Cumple |
| III. Solape | El panel no escribe en la agenda, así que no puede provocar un solape y no necesita pruebas de solape. La transacción de lectura no toma el turno de escritura y no retrasa ninguna reserva. | No aplica |
| IV. Simplicidad | Sin dependencias, sin biblioteca de gráficos, sin JavaScript en el navegador, sin índices nuevos y sin selector de fechas ni exportación. Se reutilizan `ahoraLocal`, `sinCerrar`, `euros` y las constantes del horario. Lo único nuevo en módulos compartidos son dos funciones de formato (`porcentaje` y `horas`), para que los formatos sigan teniendo una sola fuente. | Cumple |
| V. Datos reproducibles | Las cifras de la spec salen de la semilla con el reloj fijado por FR-043, y se han reproducido el 11/11/2026. La feature no toca la semilla, así que no altera ningún número citado (FR-018). | Cumple |
| VI. Tests | Cada RA, escenario y criterio tiene su test con el identificador delante (`RA3`, `004/H1-E1`, `004/SC-001`). Un test de trazabilidad propio lo exige. SC-006 se mide a mano, con justificación escrita en la spec y protocolo en la lista de entrega. El test de trazabilidad de la 001 no se toca. | Cumple |
| VII. Interfaz | Frases llanas literales en el [contrato](contracts/interfaz-panel.md); cifras escritas en texto, no solo en el gráfico; nada distinguido solo por el color; contraste y tamaños comprobados a 360 píxeles y en portátil, también el de las barras (3:1). | Cumple |
| VIII. Español | Interfaz, textos, documentación y este plan en español de España, con formato numérico español. | Cumple |

**Repetición tras la fase 1**: sin cambios ni infracciones. El diseño no ha añadido piezas respecto a la primera comprobación. La sección de complejidad queda sin uso.

**Aviso ajeno a esta feature**: el comentario «INFORME DE IMPACTO» de `constitution.md` indica que debía eliminarse antes del commit, y sigue ahí (ya lo señaló el plan de la 001).

## Trazabilidad de pruebas

Todos los nombres de test empiezan por el identificador que comprueban (FR-023): `RA1`… para las reglas y `004/…` para el resto.

| Identificadores | Tipo de prueba |
|-----------------|----------------|
| RA1, RA2, CL límite de semana, CL Canarias | Unitarias del dominio: periodo con el reloj en lunes 00:00, domingo 23:59 y miércoles; cita del domingo a las 23:45 y del lunes a las 00:00. Ruta con la clínica de Canarias y el reloj real en el lunes 09/11/2026 a las 00:30 peninsulares |
| RA3, H2-E1 a H2-E3 | Unitarias con recuentos propios, canceladas de los tres orígenes y una tasa de 0,0 % real; ruta con la semilla: tabla de referencia y frase llana visible |
| RA4, H3-E1 a H3-E3, CL cambio de hora, CL festivos, CL profesional sin citas | Unitarias: capacidad desde las constantes del horario, tiempo por la duración del servicio, reservadas fuera; ruta con la semilla: las 24 celdas y la tabla del periodo |
| RA5, H1-E1 a H1-E4, FR-013 | Unitarias en céntimos y servicio sin completadas; ruta con la semilla: importes por servicio y total en las dos sumas |
| RA6, FR-011, CL citas sin cerrar | Ruta con el reloj en el 11/11/2026 a las 12:00: aviso con 31, enlace a la agenda, semana del 02/11 con 0 y «Sin datos»; aviso en singular; sin aviso el 04/11 |
| RA7 | Unitarias: mitad exacta (6,25 % → 6,3 %), denominador cero, clínica desde recuentos y no desde tasas |
| RA8, H5-E4, H5-E5, SC-003 | Ruta: contenido lógico de todas las tablas idéntico tras 100 aperturas; POST, PUT y DELETE sobre `/analitica` rechazados sin efecto; sin cabecera `Set-Cookie`. Estático: los módulos del panel no contienen escrituras |
| H4-E1 a H4-E4 | Ruta con la semilla: 8 semanas en orden, primera y última semana, suma de 15.380,00 €, sin la semana en curso |
| H5-E1 a H5-E3, H5-E8, FR-001 a FR-003 | Ruta: menú con «Analítica» solo con sesión; sin sesión, 303 y sin cifras; sesión de paciente en cualquier cookie, igual que sin sesión; dos clínicas con cifras separadas |
| H5-E6, FR-012 | Ruta: ni un nombre, teléfono, correo ni enlace de los 40 pacientes de la semilla en la página |
| SC-001 | Ruta: cada cifra de las cuatro tablas de referencia en el texto de la página |
| SC-002, FR-015 | Concurrencia: un proceso hijo completa las 31 citas sin cerrar mientras se abre el panel; en cada apertura, los tres totales cuadran y el número de citas del periodo no cambia |
| SC-004 | Rendimiento: `GET /analitica` en menos de 1 segundo con la semilla |
| SC-005, FR-016, FR-017 | Ruta: semilla de los lunes 04/01/2027 y 05/04/2027 con el reloj en su miércoles; mismas cifras, fechas desplazadas; el periodo de abril contiene el 28/03/2027 |
| H5-E7, SC-007, FR-019 a FR-022 | Playwright a 360 píxeles y en portátil: desbordamiento, texto a 4,5:1, barras a 3:1, controles de 44 × 44, escalas desde cero y cifras visibles sin pasar el ratón |
| SC-008 | `tests/unit/trazabilidad-004.test.js`: RA1 a RA8, 22 escenarios y los criterios, salvo SC-006 |
| SC-006 | **Prueba manual con personas.** Justificación escrita en la spec: mide el uso real sin formación. Protocolo en `checklists/entrega.md` |

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/004-panel-analitica/
├── spec.md
├── plan.md              # este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── interfaz-panel.md
├── checklists/
│   ├── requirements.md
│   └── entrega.md       # lo crea la implementación: protocolo de SC-006 y puertas
└── tasks.md             # lo genera /speckit-tasks
```

### Código fuente (raíz del repositorio)

```text
src/
├── dominio/
│   ├── analitica.js     # nuevo: periodo, semanas, capacidad, clasificación, cifras e invariantes (puro)
│   └── formato.js       # + porcentaje(n, d) y horas(minutos)
├── datos/
│   └── analitica.js     # nuevo: transacción de lectura y las tres consultas, solo SELECT
└── web/
    ├── rutas/
    │   └── analitica.js # nuevo: GET /analitica
    ├── vistas/
    │   └── analitica.js # nuevo: página, apartados y gráficos de barras
    ├── estaticos/
    │   └── estilos.css  # + estilos de los gráficos y de las tablas
    ├── plantilla.js     # + entrada «Analítica» en el menú
    └── servidor.js      # + registra rutasAnalitica

tests/
├── unit/
│   ├── analitica.test.js          # nuevo: RA1 a RA7 y casos límite
│   ├── formato.test.js            # + porcentaje y horas, con nombres de la 004
│   └── trazabilidad-004.test.js   # nuevo: SC-008 de la 004
├── integracion/
│   ├── rutas-analitica.test.js    # nuevo: historias 1 a 5, SC-001, SC-003, SC-005, RA8
│   └── analitica-rendimiento.test.js  # nuevo: SC-004
├── concurrencia/
│   ├── analitica.test.js          # nuevo: SC-002
│   └── trabajador-cerrar.js       # nuevo: proceso hijo que completa citas
└── e2e/
    └── analitica.spec.js          # nuevo: H5-E7, SC-007, FR-019 a FR-022
```

**Decisión de estructura**: la de la 001, sin cambios. Las reglas del panel van en `dominio/` para probarlas sin servidor, y las consultas en un módulo propio de `datos/` para que el test estático de solo lectura tenga un único archivo que vigilar. Los únicos archivos de la 001 que se tocan son la plantilla (una entrada de menú), el servidor (registrar la ruta), los estilos y `formato.js`. Ninguno cambia un comportamiento de la 001, y su suite debe seguir en verde.

## Riesgos

- **Menú compartido**: añadir «Analítica» cambia la cabecera de todas las pantallas de recepción. A 360 píxeles, cuatro controles de 44 píxeles deben caber sin desplazamiento. Las pruebas de accesibilidad de la 001 lo vigilan en cada pantalla y deben seguir en verde.
- **Totales que no cuadran**: si un invariante falla, el panel muestra la página de fallo de la 001 en lugar de las cifras. Es lo que exige el principio II, pero un defecto en el cálculo dejaría a Sara sin panel; las pruebas de las cifras de referencia lo detectan antes.
- **Cifras que dependen de otras specs**: si otra spec cambia el horario de FR-012, la semilla o los precios, cambian las cifras de referencia de la 004 (supuestos «Capacidad teórica» y «Precio actual del servicio»), y ese cambio debe actualizar la spec y sus tests.
- **Uso con datos reales**: como el resto del producto, el panel no se usa con datos reales hasta que se cumpla la puerta de FR-039 de la 001.
