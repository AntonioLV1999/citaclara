# Plan de implementación: Núcleo de agenda

**Rama**: `001-nucleo-agenda` (se trabaja en `master`) | **Fecha**: 05/11/2026; revisado el 11/11/2026 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de la feature en `specs/001-nucleo-agenda/spec.md`, en la versión que incluye los dos cambios del 10/11/2026

## Resumen

Agenda para la recepción de clínicas pequeñas: acceso con clave de clínica, agenda del día por profesional con huecos libres y ocupados, alta de citas con ficha mínima de paciente, cierre de citas y semilla determinista de Clínica Eleva.

El enfoque es una sola aplicación Node, sin dependencias de producción, con HTML generado en el servidor y SQLite. La garantía capital (RN1) vive en un disparador del almacén, con un único escritor a la vez, de modo que ningún origen de citas puede saltársela. Las horas se guardan como hora local de la clínica.

### Alcance de esta revisión del plan

La versión aprobada el 06/11/2026 ya está implementada en `src/` y `tests/`, y su diseño sigue vigente. Esta revisión añade el diseño de los **dos cambios del 10/11/2026**, que se implementan juntos en una sola pasada, como recomienda el historial de la spec, porque los dos tocan el test de trazabilidad y el arranque del servidor:

| Requisito | Qué cambia en el producto | Decisión |
|-----------|---------------------------|----------|
| RN8, FR-036, FR-038, HU6, SC-010, SC-011, SC-013 | Una operación única de cancelar con canal, plazo del paciente, y origen y momento registrados en la misma escritura | [research.md §8 y §9](research.md#8-operación-única-de-cancelar-fr-038-rn8) |
| FR-027, FR-040 | Etiqueta «Cancelada por el paciente el…» en la agenda; la cita sin cerrar sigue como «Reservada» | [§10](research.md#10-etiquetas-y-cita-sin-cerrar-fr-027-fr-040) |
| FR-001, FR-037, HU4-E5, SC-012 | Almacén y cookie propios para las sesiones de paciente, que nunca abren rutas de recepción | [§11](research.md#11-sesiones-de-paciente-separadas-fr-037) |
| FR-013, FR-041, HU2-E6 | Añadir, corregir o quitar el correo de la ficha desde una cita | [§12](research.md#12-correo-de-la-ficha-desde-la-cita-fr-041) |
| FR-043, HU5-E5 | Momento de referencia que fija el reloj, con aviso en pantalla | [§13](research.md#13-momento-de-referencia-fr-043) |
| FR-029, FR-030, HU5-E4 | Teléfono de la clínica, enlaces de demostración y origen de las canceladas en la semilla, reproduciendo los resúmenes de FR-030 | [§14](research.md#14-semilla-datos-nuevos-y-resúmenes-fr-029-fr-030) |
| FR-035, SC-008 | Test de trazabilidad con la convención de identificadores y los recuentos nuevos | [§15](research.md#15-trazabilidad-fr-035) |
| Esquema | Columnas y tabla nuevas, con un control de versión del archivo de datos | [§16](research.md#16-cambio-de-esquema-sobre-un-archivo-existente) |

**Sin código en la 001**: FR-039 (puerta de uso con datos reales: es una condición de entrega, no un comportamiento) y FR-042 (lo crea la primera feature que lo necesite).

## Contexto técnico

**Lenguaje y versión**: JavaScript (módulos ES) sobre Node 26

**Dependencias principales**: ninguna en producción (`node:http`, `node:sqlite`, `node:crypto`). En desarrollo, `@playwright/test`. Los cambios del 10/11/2026 no añaden ninguna.

**Almacenamiento**: SQLite en un archivo local, en modo WAL. Pasa a la versión 2 del esquema ([data-model.md](data-model.md)).

**Pruebas**: `node:test` para dominio, servicios, rutas y concurrencia; Playwright para interfaz y accesibilidad

**Plataforma objetivo**: servidor con Node; navegadores actuales de portátil y móvil

**Tipo de proyecto**: aplicación web, un solo proyecto

**Objetivos de rendimiento**: agenda en menos de 1 segundo con el volumen de la semilla (SC-004). Los cambios no añaden consultas por cita: el origen y el correo salen de la misma consulta de la agenda.

**Restricciones**: cero solapes con reservas simultáneas (SC-001); un solo «cancelada ahora» con cancelaciones simultáneas (SC-013); semilla independiente del reloj y con los resúmenes de FR-030 (SC-005); funcionamiento desde 360 píxeles (FR-028)

**Escala y alcance**: 2 a 5 profesionales por clínica, una clínica en la semilla, unas 500 citas, unas 14 rutas y 6 pantallas

**Estado de partida**: la suite está en rojo solo en el test de trazabilidad, que echa en falta exactamente los 18 identificadores de los dos cambios (RN8, H2-E6, H4-E5, H5-E4, H5-E5, H6-E1 a H6-E9 y SC-010 a SC-013). Es el rojo esperado y acotado de S-18. Cualquier otro fallo es una regresión.

No queda ninguna incógnita: todo está resuelto en [research.md](research.md).

## Comprobación de constitución

*PUERTA: debe superarse antes de la fase 0 y repetirse tras la fase 1.*

| Principio | Cumplimiento | Estado |
|-----------|--------------|--------|
| I. Spec primero | Propietario registrado en `specs/MAPA.md`. Spec aprobada el 06/11/2026, y sus dos cambios, el 10/11/2026. Este plan no añade comportamiento que no esté en la spec. | Cumple |
| II. Números | Céntimos enteros y funciones únicas de formato. El momento de cancelación se guarda y se muestra en hora local de la clínica, en `dd/mm/aaaa` y 24 horas. RN8 se calcula sobre el reloj local, con pruebas el 29/03/2027 (FR-025 y HU6-E5). | Cumple |
| III. Solape | La garantía sigue en el almacén y no cambia. Cancelar solo libera ocupación, y lo hace en una transacción `BEGIN IMMEDIATE`, como el alta; reservar en un tramo recién liberado ya está cubierto por las pruebas de RN1. Las cancelaciones simultáneas tienen su propia prueba por procesos (SC-013). | Cumple |
| IV. Simplicidad | Sin dependencias nuevas. La tabla de sesiones de paciente es lo mínimo que exige FR-037, sin modelo de acceso, que es de la 002. FR-042 no se implementa. El cambio de esquema no añade un sistema de migraciones: solo un control de versión, porque FR-039 garantiza que no hay datos reales ([research.md §16](research.md#16-cambio-de-esquema-sobre-un-archivo-existente)). | Cumple |
| V. Datos reproducibles | La semilla debe reproducir los dos resúmenes escritos en FR-030, y las cifras de citas no cambian. Si no los reproduce, el defecto está en la implementación. | Cumple |
| VI. Tests | Cada test cita su regla o criterio. El test de trazabilidad se actualiza según FR-035, sin relajarse: cambia su recuento y admite la convención nueva, como dice la spec. El rojo de S-18 termina con esta implementación. | Cumple |
| VII. Interfaz | La etiqueta de cancelación, el formulario de correo y el aviso del reloj fijado tienen textos literales en el [contrato](contracts/interfaz-web.md), y se comprueban a 360 píxeles con el resto de pantallas. | Cumple |
| VIII. Español | Interfaz, mensajes, datos, documentación y este plan en español de España. | Cumple |

**Repetición tras la fase 1**: sin cambios ni infracciones. La sección de complejidad queda sin uso.

**Aviso ajeno a esta feature**: el comentario «INFORME DE IMPACTO» de `constitution.md` indica que debía eliminarse antes del commit, y sigue ahí.

## Trazabilidad de pruebas

| Reglas y criterios | Tipo de prueba |
|--------------------|----------------|
| RN1, SC-001 | Concurrencia: varios procesos con **barrera en cada ronda**, sobre el hueco exacto y sobre cruces parciales; también por HTTP |
| RN1 a RN7, FR-011, FR-012 | Unitarias del dominio e integración contra el almacén, incluida la escritura directa que salta el servicio |
| FR-001 a FR-004 | Rutas: sin sesión, clave incorrecta, datos de otra clínica |
| FR-013 | Integración: paciente nuevo con cita rechazada no deja ficha |
| FR-014 a FR-022 | Rutas y cálculo de huecos |
| FR-023 a FR-025, SC-009 | Reloj inyectado; Madrid y Canarias; 25/10/2026, 28/03/2027 y 31/10/2027 |
| FR-029 a FR-034, SC-005, SC-006 | Semilla: dos ejecuciones, cambio de lunes, recuentos y cero solapes |
| FR-027, FR-028, SC-007 | Playwright a 360 píxeles y en portátil: desbordamiento, tamaños y contraste |
| **RN8, H6-E1 a H6-E5, SC-010** | Servicio de cancelar con reloj inyectado, por los canales «portal» y «correo» con el mismo resultado: 15:59, 16:00:00, 16:00:59 y 16:01 para una cita a las 18:00; y el 29/03/2027 a las 07:00 y 07:01 |
| **FR-036, FR-038, H6-E8, H3-E5** | Integración: los cuatro resultados en su orden, con lo que devuelve cada uno; ningún resultado distinto de «cancelada ahora» toca la cita; el almacén rechaza una cancelada sin origen o una no cancelada con origen |
| **H6-E9, SC-013** | Concurrencia: 1.000 rondas con barrera, cancelando la misma cita por canales distintos; un solo «cancelada ahora» y un solo origen por ronda. Además, un test que comprueba que solo el servicio de cancelar importa la escritura de la cancelación |
| **FR-027, H6-E6, H6-E7, SC-011** | Rutas de la agenda: «Cancelada por el paciente el 08/11/2026 a las 19:30» para «portal» y «correo», «Cancelada» para «recepción»; la semilla, sin canceladas sin origen |
| **FR-037, H4-E5, SC-012, CL sesiones** | Rutas: cada ruta registrada que no es pública se rechaza con una sesión de paciente válida, en su cookie y en la de recepción; salir de una sesión no cierra la otra |
| **FR-041, H2-E6** | Rutas: añadir, corregir y quitar el correo; correo no válido con 422; nombre, teléfono y cita sin cambios; otra clínica, 404 |
| **FR-043, H5-E5** | Servidor arrancado con el momento fijado: la agenda se abre el 04/11/2026, sin reservar antes de las 12:00, con el aviso; el reloj no avanza; un ajuste mal escrito impide arrancar |
| **FR-029, FR-030, H5-E4** | Semilla: teléfono, 40 enlaces con la forma de FR-029 (el primero, `c73f5e835397826416bda7b3e5323d02`), 37 canceladas con origen «recepción» y los dos resúmenes de FR-030 |
| **FR-035, SC-008** | Trazabilidad: RN1 a RN8, 42 escenarios y 13 criterios; nombres con la convención; la cobertura de la 001 solo cuenta los tests que empiezan por un identificador sin prefijo |
| SC-002, SC-003 | **Prueba manual con personas.** Justificación escrita del principio VI: mide el uso real sin formación, y un test automático no puede medirlo. Se registra en la lista de entrega. |

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/001-nucleo-agenda/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── interfaz-web.md
│   ├── semilla.md
│   ├── operacion-cancelar.md   # nuevo: la usan la 002 y la 003
│   └── configuracion.md        # nuevo: momento de referencia (FR-043)
├── checklists/
│   ├── requirements.md
│   └── entrega.md
└── tasks.md             # lo genera /speckit-tasks
```

### Código fuente (raíz del repositorio)

```text
src/
├── dominio/             # funciones puras: reglas, huecos, tiempo, formato
│                        #   + plazo de RN8, cita sin cerrar (FR-040), etiqueta de cancelación
├── datos/               # esquema con disparadores, conexión y consultas
│                        #   + versión del esquema, sesiones de paciente, escritura de la cancelación
├── servicios/           # casos de uso: acceso, alta de cita, cambio de estado
│                        #   + cancelar.js (FR-038), correo de la ficha (FR-041)
├── web/                 # servidor, rutas, vistas y archivos estáticos
│                        #   + rutas y vista del correo, aviso del reloj fijado en la plantilla
├── semilla/             # generador puro y comando
│                        #   + teléfono, enlaces y origen de las canceladas
└── principal.js         # arranque; + lee el momento de referencia (FR-043)

tests/
├── ayudas/
├── unit/
├── integracion/
├── concurrencia/        # + cancelaciones simultáneas (SC-013)
└── e2e/
```

**Decisión de estructura**: se mantiene la del primer plan. Un solo proyecto, porque la interfaz se genera en el servidor. Separar `dominio` de `web` permite probar las reglas sin levantar el servidor. La operación de cancelar vive en `servicios/` porque la llamarán también la 002 y la 003, que no deben pasar por las rutas de recepción.

## Riesgos

- **`node:sqlite` es reciente**: ha funcionado en la prueba, pero el plan fija Node 26 como mínimo.
- **Un solo servidor**: SQLite encaja con esta escala. Si hicieran falta varios servidores, habría que migrar a PostgreSQL con restricción de exclusión. El disparador y el modelo se trasladan bien, y no se prepara nada por adelantado (principio IV).
- **Resúmenes de FR-030**: dependen del orden y del nombre de cada campo del objeto generado. Si la implementación da otros valores, se corrige la implementación, no la spec (historial, D4). El test los compara literalmente.
- **Archivos de datos antiguos**: tras el cambio de esquema, un `datos/citaclara.db` anterior no sirve. El servidor y la semilla lo detectan y lo explican, en lugar de fallar con un error interno ([research.md §16](research.md#16-cambio-de-esquema-sobre-un-archivo-existente)).
- **Coordinación con las ramas**: la 002, la 003 y la 004 no planifican ni tocan `src/` hasta que `master` esté en verde (S-18). La operación de cancelar y la tabla de sesiones de paciente son las piezas que heredan, y sus contratos están en [operacion-cancelar.md](contracts/operacion-cancelar.md) y [data-model.md](data-model.md).
- **Autenticación simplificada y conexión sin cifrar**: siguen siendo deuda consciente, y ahora las cubre la puerta de FR-039, que no se cumple mientras su fecha de comprobación esté pendiente.
