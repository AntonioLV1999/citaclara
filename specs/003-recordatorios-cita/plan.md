# Plan de implementación: Recordatorios de cita

**Rama**: `003-recordatorios-cita` | **Fecha**: 11/11/2026 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de la feature en `specs/003-recordatorios-cita/spec.md`, con la entrada del historial del 11/11/2026

## Resumen

Cada día a las 08:00, en hora local de cada clínica, el producto envía un recordatorio por correo de cada cita reservada del día siguiente, con un enlace para que el paciente la cancele si no va a ir. Mientras no se cumpla la puerta de uso con datos reales (FR-039 de la 001), el correo se escribe como fichero `.eml` en `datos/salida-correo/`.

El enfoque amplía la aplicación de la 001 sin dependencias nuevas:

- **Disparo**: un programador dentro del servidor, y `npm run recordatorios` para lanzarlo a mano.
- **Garantía de RR1**: está en el almacén. La clave primaria de `recordatorio` es la cita, y el envío se reserva en una transacción antes de salir.
- **Ventana**: el día natural siguiente, calculado en texto de hora local, sin que intervenga el cambio de hora.
- **Enlace de cancelación**: sigue el [modelo común de acceso de la 002](../002-portal-paciente/contracts/modelo-acceso.md) tal cual. La 003 solo inserta el enlace y pone la pantalla `/cancelar`, que cancela con `cancelarCita(…, 'correo')` (FR-038 de la 001).

## Contexto técnico

**Lenguaje y versión**: JavaScript (módulos ES) sobre Node 26, como la 001

**Dependencias principales**: ninguna nueva. En producción, `node:http`, `node:sqlite`, `node:crypto` y `node:fs`; en desarrollo, `@playwright/test`, que ya existe

**Almacenamiento**: el SQLite de la 001, que pasa de la versión 3 (la de la 002) a la 4 con la tabla `recordatorio` ([data-model.md](data-model.md)). Los ficheros `.eml` y `datos/recordatorios.log`, en `datos/`, fuera del control de versiones

**Pruebas**: `node:test` para dominio, servicios, rutas y concurrencia; Playwright para la pantalla de cancelación a 360 píxeles y en portátil

**Plataforma objetivo**: el servidor Node de la 001; cualquier programa de correo para abrir los `.eml`; el navegador del móvil del paciente

**Tipo de proyecto**: aplicación web, un solo proyecto, que amplía el de la 001 y la 002, más un proceso de línea de órdenes

**Objetivos de rendimiento**: con el volumen de la semilla (unas 8 citas por día), una ejecución tarda menos de 1 segundo. No hay un objetivo en la spec, y no se optimiza nada más

**Restricciones**: cero duplicados en 1.000 rondas de ejecuciones simultáneas (SC-003); cero citas sin recordatorio en 365 días con los dos cambios de hora, en la península y en Canarias (SC-004); ninguna conexión de red mientras no se cumpla FR-039 (FR-018); enlace de la misma forma y por la misma ruta que el personal (002/FR-025, 002/FR-003); pantalla desde 360 píxeles (FR-017)

**Escala y alcance**: una clínica en la semilla; 57 reservas futuras, de ellas 43 con correo. 1 tabla nueva, 2 rutas de paciente, 1 pantalla con 4 variantes, 1 proceso y 1 programador

No queda ningún punto por aclarar: las decisiones están en [research.md](research.md).

## Comprobación de constitución

*PUERTA: debe superarse antes de la fase 0 y repetirse tras la fase 1.*

| Principio | Cumplimiento | Estado |
|-----------|--------------|--------|
| I. Spec primero | Propietario registrado en `specs/MAPA.md` (AntonioLV1999). La spec está en **Borrador**, y la condición que ella misma ponía para planificar (S-18: `master` en verde con el cambio de la 001) ya se cumple. Planificar no crea comportamiento, así que el plan puede hacerse; **implementar y hacer merge exige antes que su propietario apruebe la spec**. Los cambios en código de la 001 y la 002 son los que sus contratos prevén para la 003 (FR-038, FR-042 y FR-043 de la 001; modelo común de la 002). | Cumple con condición |
| II. Números | Sin importes. Fechas `dd/mm/aaaa`, 24 horas y hora local de la clínica con las funciones de la 001, y la zona indicada en el correo, en la pantalla y en el resumen (FR-008). Días de cambio de hora definidos por RR3, con prueba en las dos zonas (SC-004). | Cumple |
| III. Solape | La 003 escribe en la agenda (cancela). Cancelar no añade ocupación, y la reserva del tramo liberado pasa por el disparador `cita_solape` de la 001. Prueba con procesos y barrera que reservan el tramo a la vez que se cancela desde el correo (FR-024, [research.md §11](research.md#11-pruebas-de-solape-fr-024-principio-iii)). | Cumple |
| IV. Simplicidad | Cero dependencias. Sin envío real, que no se puede usar hasta FR-039 ([§5](research.md#5-modo-de-envío-fr-018-a-fr-020-hu3)). Sin tabla de ejecuciones ni programador del sistema operativo ([§2](research.md#2-disparo-diario-fr-001-fr-002-casos-límite-de-ejecución)). Correo en texto plano. Ninguna ruta, respuesta ni contador propios para los enlaces. | Cumple |
| V. Datos reproducibles | No cambia la semilla, sus cifras ni sus resúmenes (FR-021). Las cifras de FR-022 (5 citas el 03/11/2026, 4 con correo; 57 futuras, 43 con correo) se han reproducido con el generador. El correo es idéntico entre ejecuciones salvo el enlace (HU3-E5). | Cumple |
| VI. Tests | Cada regla RR, escenario y criterio con su test, con la convención de FR-035 de la 001, y una trazabilidad propia ([§10](research.md#10-trazabilidad-fr-023-sc-007)). SC-001 y SC-005 se miden a mano, con la justificación de SC-007. | Cumple |
| VII. Interfaz | Mensajes literales en [pantalla-cancelar.md](contracts/pantalla-cancelar.md) y en [correo-recordatorio.md](contracts/correo-recordatorio.md). Criterios de FR-017 comprobados en navegador real. | Cumple |
| VIII. Español | Correo, pantalla, resumen, documentación y este plan en español de España. | Cumple |

**Repetición tras la fase 1**: sin infracciones nuevas. La condición del principio I sigue abierta, y se añade la dependencia de orden con la 002 (ver «Requisitos previos»). La sección de complejidad queda sin uso.

## Requisitos previos

1. **Aprobación de la spec** por su propietario (principio I).
2. **El modelo común de acceso de la 002 en `master`**: tabla `enlace_cancelacion`, `GET /e/:token`, la respuesta uniforme, las sesiones de alcance de cita, `CITACLARA_DIRECCION` y el generador único del token ([research.md §1](research.md#1-qué-pone-la-003-y-qué-hereda-de-la-002-rr6-d2)). La 002 está en Borrador y su propietaria es Sara, así que el orden de merge lo acuerdan las dos features. Si al implementar falta en la 002 alguna pieza que este plan usa, como una función exportada, se le pide a la 002 y no se crea aquí (constitución, «Flujo de trabajo»).
3. **Rebase sobre `master`** cuando entre la 002, para partir de su código.

## Trazabilidad de pruebas

| Reglas, requisitos y criterios | Tipo de prueba |
|--------------------------------|----------------|
| RR1, 003/H1-E2, 003/FR-002, 003/CL «Fallo a mitad» | Integración: dos ejecuciones seguidas, y una reanudada tras un fallo provocado a mitad |
| RR1, 003/H1-E3, 003/SC-003 | Concurrencia: 4 procesos con barrera, 1.000 rondas; un recordatorio y un fichero por cita |
| RR2, 003/H1-E1, E4 a E7, 003/SC-002 | Integración con el reloj fijado: reservadas, fuera de ventana, cada estado de llegada, sin correo, dos citas del mismo paciente; correo de la ficha tomado al enviar |
| RR3, 003/FR-004, 003/SC-004, 003/CL «Días de cambio de hora», «Fines de semana», «Ejecución retrasada», «Un día sin ejecución» | Unitarias de la ventana e integración de 365 días seguidos en `Europe/Madrid` y `Atlantic/Canary` |
| RR4, 003/FR-014, 003/H2-E2, E4, E6, 003/CL «Doble pulsación», «Pantalla abierta mientras vence», «Justo en el límite» | Rutas `/cancelar` contra cada resultado de `cancelarCita`, con el reloj fijado a 07:55, 08:00 y 08:01 para una cita a las 10:00 |
| RR5, 003/H1-E9 | Integración: cita recordada, cancelada y sustituida por otra; la nueva recibe su recordatorio |
| RR6, 003/H2-E5, E7, E10, 003/CL «Pantalla abierta hasta el inicio», «Hueco cancelado y vuelto a ocupar», «Correo compartido» | Rutas: enlace en el inicio y después, alterado, tras anular el enlace personal (RP7), y `POST` después del inicio |
| 003/FR-001, 003/CL «Ejecución retrasada» | Unitarias del programador con `relojReal` inyectado: 07:59, 08:00, arranque a las 10:00, día siguiente, dos zonas |
| 003/FR-003, 003/H3-E3 | Integración: proceso y servidor con el mismo `CITACLARA_AHORA`; el enlace del fichero abre la pantalla |
| 003/FR-005, 003/FR-006, 003/H1-E8 | Integración con un `enviar` que falla en una cita: las demás salen, el resumen la cuenta y otra ejecución la envía |
| 003/FR-007 a FR-010, 003/H1-E10, 003/H3-E5 | Unitarias de `componerRecordatorio`: campos, formato, zona de Canarias, nada de la ficha salvo el nombre, y dos composiciones iguales salvo el token |
| 003/FR-011 a FR-013, FR-015, 003/H2-E1, E8 | Rutas: la pantalla muestra solo la cita, `GET` no cambia nada, la clave de clínica no la abre |
| 003/FR-016, 003/H4-E1, E2 | Rutas de la agenda tras cancelar por el correo y por recepción |
| 003/FR-017, 003/H2-E9 | Playwright a 360 píxeles y en portátil: desbordamiento, tamaños y contraste de las cuatro variantes |
| 003/FR-018 a FR-020, 003/H3-E1, E2, E4 | Integración: ficheros `.eml` creados sin sobrescribir; con `CITACLARA_SMTP`, igual y sin red |
| 003/FR-021, 003/FR-022, 003/H2-E3 | Integración con la semilla por defecto y `2026-11-02T08:00`: 4 enviados, 1 sin correo; el tramo cancelado se reserva |
| 003/FR-024, 003/H2-E3 | Concurrencia: reservas simultáneas con la cancelación por `POST /cancelar`, 1.000 rondas, cero solapes |
| 003/SC-006 | Rutas: tras cancelar por el correo, la siguiente carga de la agenda muestra la cita cancelada y el tramo libre |
| 003/SC-007, 003/FR-023 | `tests/unit/trazabilidad-003.test.js` |
| 003/SC-001, 003/SC-005 | **Medición manual** con la clínica piloto, según SC-007. Protocolo en `checklists/entrega.md`, que crean las tareas |

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/003-recordatorios-cita/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── proceso-recordatorios.md
│   ├── correo-recordatorio.md
│   └── pantalla-cancelar.md
├── checklists/requirements.md
└── tasks.md             # lo genera /speckit-tasks
```

### Código fuente (raíz del repositorio)

Archivos nuevos (+) y de la 001 o la 002 que cambian (~):

```text
src/
├── configuracion.js            + lectura y validación de CITACLARA_AHORA, CITACLARA_DIRECCION, PORT y CITACLARA_SMTP
├── recordatorios.js            + npm run recordatorios
├── principal.js                ~ usa configuracion.js y arranca el programador
├── datos/
│   ├── esquema.sql             ~ versión 4: tabla recordatorio
│   ├── bd.js                   ~ VERSION_ESQUEMA = 4
│   └── recordatorios.js        + citas de la ventana, reserva del envío y su anulación
├── dominio/
│   └── recordatorio.js         + ventana (RR3) y composición del .eml
├── servicios/
│   ├── recordatorios.js        + ejecutarRecordatorios y resumen
│   ├── salida-correo.js        + escritor de .eml (modo simulado)
│   └── programador.js          + disparo diario a las 08:00 locales
├── web/
│   ├── servidor.js             ~ registra las rutas /cancelar como rutas de paciente
│   ├── rutas/cancelar.js       + GET y POST /cancelar
│   └── vistas/cancelar.js      + pantalla y mensajes
└── semilla/carga.js            ~ borra los recordatorios antes que las citas

tests/
├── unit/                       + recordatorio (ventana y correo), programador, trazabilidad-003
├── integracion/                + proceso, modo simulado, semilla, rutas /cancelar, agenda
├── concurrencia/               + ejecuciones simultáneas; reservas con la cancelación del correo
└── e2e/                        + cancelación desde el correo y su accesibilidad
```

`package.json` gana el script `"recordatorios": "node src/recordatorios.js"`.

**Decisión de estructura**: la misma de la 001 y la 002, sin carpetas nuevas. La ventana y el correo son funciones puras en `dominio/`, que se prueban sin almacén ni ficheros. El proceso recibe la función de envío como parámetro, de modo que los tests provocan fallos sin tocar el disco y el envío real futuro solo tendrá que sustituirla.

## Riesgos

- **La spec sigue en Borrador**: si su propietario cambia algo al aprobarla, este plan se revisa antes de implementar.
- **Dependencia de la 002**: si la 002 cambia su modelo común al aprobarse, o se retrasa, la 003 se retrasa con ella. La parte del proceso que no toca el enlace (ventana, RR1, modo simulado y resumen) se puede adelantar en las tareas, y la pantalla de cancelación espera.
- **Número de versión del esquema**: supone que la 002 entra antes y deja la versión 3. Si el orden cambia, se ajusta el número.
- **Fallo entre la reserva y el envío**: la cita se da por recordada sin correo. Es la consecuencia aceptada de RR1 ([research.md §4](research.md#4-un-recordatorio-como-máximo-rr1-fr-005-sc-003)).
- **El programador depende de que el servidor esté en marcha**: un día con el servidor parado no hay recordatorios, salvo que se lance el proceso a mano. Es el caso límite «Un día sin ejecución» de la spec.
- **Envío real sin diseñar**: cuando se cumpla FR-039, hará falta un cambio de spec o de plan que elija cómo enviar, el remitente real y el tratamiento de los rebotes. Este plan solo deja preparada la función de envío como parámetro.
- **Cambios en módulos de otros**: `principal.js`, `servidor.js`, el esquema y la semilla de la 001, y el registro de rutas de paciente de la 002. Las tareas deben dejar en verde toda la suite de la 001 y la de la 002.
