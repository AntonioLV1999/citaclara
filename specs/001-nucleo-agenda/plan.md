# Plan de implementación: Núcleo de agenda

**Rama**: `001-nucleo-agenda` | **Fecha**: 05/11/2026 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de la feature en `specs/001-nucleo-agenda/spec.md`

## Resumen

Agenda para la recepción de clínicas pequeñas: acceso con clave de clínica, agenda del día por profesional con huecos libres y ocupados, alta de citas con ficha mínima de paciente, cierre de citas y semilla determinista de Clínica Eleva.

El enfoque es una sola aplicación Node, sin dependencias de producción, con HTML generado en el servidor y SQLite. La garantía capital (RN1) vive en un disparador del almacén, con un único escritor a la vez, de modo que ningún origen de citas puede saltársela. Las horas se guardan como hora local de la clínica.

## Contexto técnico

**Lenguaje y versión**: JavaScript (módulos ES) sobre Node 26

**Dependencias principales**: ninguna en producción (`node:http`, `node:sqlite`, `node:crypto`). En desarrollo, `@playwright/test`.

**Almacenamiento**: SQLite en un archivo local, en modo WAL

**Pruebas**: `node:test` para dominio, servicios, rutas y concurrencia; Playwright para interfaz y accesibilidad

**Plataforma objetivo**: servidor con Node; navegadores actuales de portátil y móvil

**Tipo de proyecto**: aplicación web, un solo proyecto

**Objetivos de rendimiento**: agenda en menos de 1 segundo con el volumen de la semilla (SC-004)

**Restricciones**: cero solapes con reservas simultáneas (SC-001); semilla independiente del reloj (SC-005); funcionamiento desde 360 píxeles (FR-028)

**Escala y alcance**: 2 a 5 profesionales por clínica, una clínica en la semilla, unas 500 citas, unas 12 rutas y 5 pantallas

## Comprobación de constitución

*PUERTA: debe superarse antes de la fase 0 y repetirse tras la fase 1.*

| Principio | Cumplimiento | Estado |
|-----------|--------------|--------|
| I. Spec primero | Propietario registrado en `specs/MAPA.md`. **La spec sigue en Borrador: su propietario debe aprobarla antes de integrar.** | Cumple para planificar |
| II. Números | Céntimos enteros y funciones únicas de formato. Hora local de la clínica; cambio de hora definido en FR-025. | Cumple |
| III. Solape | Garantía en el almacén, no en la interfaz. Pruebas con reservas simultáneas por proceso, exactas y parciales. La semilla también pasa por el disparador. | Cumple |
| IV. Simplicidad | Cero dependencias de producción; la única de desarrollo está justificada en [research.md](research.md). Sin API ni aplicación de cliente. | Cumple |
| V. Datos reproducibles | Generador puro con resumen de contenido verificable. | Cumple |
| VI. Tests | Cada test cita su regla o criterio; ver la tabla de trazabilidad. | Cumple |
| VII. Interfaz | Criterios verificables en FR-027 y FR-028, comprobados en navegador real. | Cumple |
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
│   └── semilla.md
├── checklists/requirements.md
└── tasks.md             # lo genera /speckit-tasks
```

### Código fuente (raíz del repositorio)

```text
src/
├── dominio/             # funciones puras: reglas, huecos, tiempo, formato
├── datos/               # esquema con disparadores, conexión y consultas
├── servicios/           # casos de uso: acceso, alta de cita, cambio de estado
├── web/                 # servidor, rutas, vistas y archivos estáticos
├── semilla/             # generador puro y comando
└── principal.js         # arranque

tests/
├── unit/
├── integracion/
├── concurrencia/
└── e2e/
```

**Decisión de estructura**: un solo proyecto, porque la interfaz se genera en el servidor y no hay nada que separar en `frontend` y `backend`. Separar `dominio` de `web` permite probar las reglas sin levantar el servidor. Hay que añadir `package.json` y un `.gitignore`, que aún no existe, para `node_modules/` y el archivo de datos.

## Riesgos

- **`node:sqlite` es reciente**: ha funcionado en la prueba, pero el plan fija Node 26 como mínimo.
- **Un solo servidor**: SQLite encaja con esta escala. Si hicieran falta varios servidores, habría que migrar a PostgreSQL con restricción de exclusión. El disparador y el modelo se trasladan bien, y no se prepara nada por adelantado (principio IV).
- **Autenticación simplificada**: la deuda de [research.md](research.md) debe resolverse antes de usar datos reales de pacientes.
