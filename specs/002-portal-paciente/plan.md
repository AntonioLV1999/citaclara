# Plan de implementación: Portal del paciente

**Rama**: `002-portal-paciente` | **Fecha**: 11/11/2026 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de la feature en `specs/002-portal-paciente/spec.md`

## Resumen

Página personal del paciente, pensada para móvil, donde ve sus citas próximas y su historial y cancela una cita futura dentro del plazo de RN8 de la 001, sin cuenta ni contraseña. Recepción copia y anula el enlace personal de cada ficha desde la agenda, y ve la lista de huecos liberados por pacientes.

El enfoque amplía la aplicación de la 001 sin dependencias nuevas. Los dos tipos de enlace del paciente comparten una sola ruta pública, `/e/<token>`, con un token aleatorio de 128 bits, una respuesta uniforme y un límite de intentos. El enlace abre una sesión de paciente con su propia tabla y su propia cookie, con alcance de ficha o de una sola cita. Toda cancelación pasa por `cancelarCita(…, 'portal')`, la operación única de la 001, y el portal solo elige el mensaje. La 002 implementa el modelo común completo, también la tabla del enlace de cancelación que llenará la 003 ([research.md §1](research.md#1-reparto-del-modelo-común-entre-la-002-y-la-003-rp6-rp7)).

## Contexto técnico

**Lenguaje y versión**: JavaScript (módulos ES) sobre Node 26, como la 001

**Dependencias principales**: ninguna nueva. En producción, `node:http`, `node:sqlite` y `node:crypto`; en desarrollo, `@playwright/test`, que ya existe

**Almacenamiento**: el SQLite de la 001, que pasa a la versión 3 del esquema: `paciente.enlace` obligatorio, `sesion_paciente` ampliada y la tabla nueva `enlace_cancelacion` ([data-model.md](data-model.md))

**Pruebas**: `node:test` para dominio, servicios, rutas y concurrencia; Playwright a 360 píxeles, a 360 × 640 y en portátil, con varias zonas horarias del navegador

**Plataforma objetivo**: el servidor Node de la 001; navegadores actuales del móvil del paciente y del portátil de recepción

**Tipo de proyecto**: aplicación web, un solo proyecto, que amplía el de la 001

**Objetivos de rendimiento**: la página de un paciente con 19 citas en menos de 2 segundos en un móvil con conexión normal (SC-006). Con HTML de servidor y una consulta por página, el objetivo en local es de menos de 100 ms

**Restricciones**: cero solapes en 1.000 rondas sobre el tramo liberado (SC-005); respuesta idéntica para cualquier enlace no válido (FR-003); sesiones y bloqueos en tiempo real, también con el reloj fijado (FR-004); próxima cita visible en 360 × 640 (FR-022); el portal solo con datos de demostración mientras no se cumpla FR-039 de la 001 (FR-006)

**Escala y alcance**: una clínica, 40 pacientes de demostración y un máximo de 19 citas por paciente. 1 ruta pública, 4 rutas de paciente, 3 rutas nuevas de recepción y la lista de huecos dentro de la agenda. 6 pantallas nuevas

No queda ningún punto por aclarar: las decisiones están en [research.md](research.md).

## Comprobación de constitución

*PUERTA: debe superarse antes de la fase 0 y repetirse tras la fase 1.*

| Principio | Cumplimiento | Estado |
|-----------|--------------|--------|
| I. Spec primero | Propietaria registrada en `specs/MAPA.md` (Sara). La spec está en **Borrador**, y su estado dice que espera la aprobación del segundo cambio de la 001, que en `master` ya está aprobado (10/11/2026). Planificar no crea comportamiento, así que el plan puede hacerse; **implementar y hacer merge exige antes que Sara apruebe la spec**. Los cambios de código en módulos de la 001 son los que piden la spec de la 002 y las excepciones ya aprobadas de la 001 (FR-001, FR-013 y FR-042). | Cumple con condición |
| II. Números | Sin importes en el portal (FR-008). Fechas `dd/mm/aaaa`, 24 horas y hora local de la clínica con las funciones de la 001. El plazo y los días de cambio de hora los resuelve RN8 de la 001, sin cálculo propio. | Cumple |
| III. Solape | El portal escribe en la agenda (cancela). Cancelar no añade ocupación, y la reserva del tramo liberado pasa por el disparador `cita_solape` de la 001. Pruebas con reservas simultáneas entre sí y con la cancelación, 1.000 rondas con barrera (SC-005). | Cumple |
| IV. Simplicidad | Cero dependencias. Sin tabla de huecos: una consulta. Contador de intentos en memoria. La tabla `enlace_cancelacion` está justificada por RP6, RP7 y los escenarios de la 002 que la usan, no por la 003. | Cumple |
| V. Datos reproducibles | No cambia la semilla, sus cifras ni sus resúmenes. Los ejemplos usan la semilla por defecto y el reloj del 04/11/2026 a las 12:00 (FR-043 de la 001). | Cumple |
| VI. Tests | Cada regla RP, escenario y criterio con su test, y una trazabilidad propia. SC-002, SC-003, SC-008 y SC-009 se miden a mano, con la justificación de SC-010. | Cumple |
| VII. Interfaz | Criterios verificables de FR-021 y FR-022, comprobados en navegador real. Mensajes literales en [portal-web.md](contracts/portal-web.md#mensajes). | Cumple |
| VIII. Español | Interfaz, mensajes, documentación y este plan en español de España. | Cumple |

**Repetición tras la fase 1**: sin infracciones nuevas. La condición del principio I sigue abierta. La sección de complejidad queda sin uso.

## Base de partida

La rama está rebasada sobre `master` en `f965be1` (12/11/2026), que contiene la implementación de los dos cambios de la 001 (T084 a T124 de la 001). Este plan se apoya en ese código: `cancelarCita`, `sinCerrar`, `dentroDePlazo`, `limiteCancelacion`, `etiquetaCita`, `ahoraLocal`, `sesion_paciente`, `clinica.telefono` y `paciente.enlace`.

Antes de la primera tarea solo falta que Sara actualice el estado de la spec, que todavía dice que el segundo cambio de la 001 está pendiente de aprobación, y que la apruebe (principio I).

## Trazabilidad de pruebas

| Reglas, requisitos y criterios | Tipo de prueba |
|--------------------------------|----------------|
| RP1, RP6, 002/H2-E7, 002/SC-004 | Rutas: para cada uno de los 40 pacientes, ver y cancelar citas ajenas con su enlace personal, y otra cita con un enlace de cancelación |
| RP2, RP3, 002/FR-007 a FR-013 | Unitarias de la cita vista por el paciente y rutas del portal, con el reloj fijado |
| RP4, RP5, 002/FR-015 a FR-017, 002/H3-E1 a H3-E7 | Rutas del portal contra cada resultado de `cancelarCita`; lectura de los módulos del portal para comprobar que no importan otra escritura de citas |
| RP7, 002/H1-E5, 002/H1-E6 | Integración: anular cierra sesiones e invalida los enlaces de cancelación insertados en el test |
| 002/FR-003, 002/FR-025, 002/H1-E3 | Rutas: respuesta idéntica byte a byte para enlaces inventados, anulados, caducados y mal formados de los dos tipos; enlaces generados fuera de la semilla |
| 002/FR-004, 002/H1-E4 | Rutas con `relojReal` inyectado: bloqueo, fin del bloqueo y caducidad de la sesión a los 30 minutos, también con el reloj fijado |
| 002/FR-005, 002/FR-026, 002/H1-E8 | Rutas: el recorrido de la 001 por `servidor.rutasRegistradas`, y el inverso: la clave de clínica no abre ninguna ruta de paciente |
| 002/FR-018, 002/H4-E1 a H4-E4, 002/SC-005 | Concurrencia: trabajadores con barrera, reservas simultáneas del tramo liberado y reservas simultáneas con la cancelación, 1.000 rondas |
| 002/FR-019, 002/H4-E5 a H4-E8 | Rutas de la agenda y consulta de huecos liberados |
| 002/FR-021, 002/FR-022, 002/H2-E6, 002/SC-006, 002/SC-007 | Playwright: desbordamiento, tamaños, contraste, la primera cita en 360 × 640, el tiempo de carga y tres zonas horarias del navegador |
| 002/SC-001 | Integración (40 fichas con enlace) y Playwright (copiar desde la agenda) |
| 002/SC-010 | `tests/unit/trazabilidad-002.test.js` |
| 002/SC-002, 002/SC-003, 002/SC-008, 002/SC-009 | **Medición manual con personas**, según SC-010. Protocolo en `checklists/entrega.md` |

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/002-portal-paciente/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── portal-web.md
│   └── modelo-acceso.md
├── checklists/requirements.md
└── tasks.md             # lo genera /speckit-tasks
```

### Código fuente (raíz del repositorio)

Archivos nuevos (+) y de la 001 que cambian (~):

```text
src/
├── datos/
│   ├── esquema.sql          ~ versión 3: enlace obligatorio, sesion_paciente ampliada, enlace_cancelacion
│   ├── bd.js                ~ VERSION_ESQUEMA = 3
│   ├── pacientes.js         ~ crearPaciente sin enlace NULL; anularEnlace
│   ├── enlaces.js           + búsqueda de los dos tipos de enlace
│   ├── sesiones-paciente.js + crear, leer, tocar y borrar sesiones de paciente
│   └── portal.js            + citas de una ficha y huecos liberados
├── dominio/
│   ├── portal.js            + cita vista por el paciente: sección, etiqueta, cancelable y límite
│   └── formato.js           ~ nombre corto del día; enlace de llamada
├── servicios/
│   ├── acceso-paciente.js   + resolución de enlaces, límite de intentos y sesiones (modelo común)
│   └── cancelar-portal.js   + RP1 y traducción de los resultados de FR-038 a mensajes
├── web/
│   ├── servidor.js          ~ rutas de paciente, relojReal y referrer-policy
│   ├── plantilla.js         ~ layoutPortal y páginas de mensaje del paciente
│   ├── rutas/enlace.js      + GET /e/:token
│   ├── rutas/portal.js      + /portal
│   ├── rutas/enlace-ficha.js + /citas/:id/enlace (recepción)
│   ├── rutas/agenda.js      ~ lista de huecos liberados
│   ├── vistas/portal.js     +
│   ├── vistas/enlace-ficha.js +
│   ├── vistas/agenda.js     ~ «Enlace del paciente» y huecos liberados
│   └── estaticos/
│       ├── copiar.js        + copiar el enlace
│       └── estilos.css      ~ estilos del portal
├── semilla/carga.js         ~ borra enlaces de cancelación antes que las citas
└── principal.js             ~ CITACLARA_DIRECCION

tests/
├── unit/                    + portal, formato y trazabilidad-002
├── integracion/             + rutas del enlace, del portal y de recepción; anulación; ~ rutas-acceso (FR-001)
├── concurrencia/            + reservas sobre el tramo liberado
└── e2e/                     + flujo del paciente y accesibilidad del portal
```

**Decisión de estructura**: la misma de la 001, sin carpetas nuevas. El modelo común vive en `servicios/acceso-paciente.js`, separado del portal, para que la 003 lo use sin depender de las pantallas de la 002. Las vistas del paciente no reutilizan el `layout` de recepción, que lleva su menú y el aviso de reloj fijado.

## Riesgos

- **La spec sigue en Borrador**: si Sara cambia algo al aprobarla, este plan se revisa antes de implementar.
- **Coordinación con la 003**: la 003 todavía no tiene plan. Su plan debe usar [modelo-acceso.md](contracts/modelo-acceso.md) tal cual. Si necesita cambiarlo, lo pide a esta feature (constitución, Flujo de trabajo).
- **Cambios en módulos de la 001**: esquema, servidor, agenda, semilla y el test de FR-001. Todos están previstos por la 001 (FR-001, FR-013, FR-037, FR-042 y su research §11 y §15), pero tocan código de otro propietario. Las tareas deben dejar en verde toda la suite de la 001.
- **Copiar al portapapeles sin `https`**: fuera de `localhost`, el navegador no deja copiar. Hay alternativa (texto seleccionado), y FR-039 de la 001 exige la conexión cifrada antes de usar datos reales.
- **Un solo servidor**: el contador de intentos en memoria depende de ello, igual que la garantía de RN1 de la 001.
