# Modelo de datos: Portal del paciente

**Feature**: [spec.md](spec.md) | **Decisiones**: [research.md](research.md) | **Base**: [modelo de la 001](../001-nucleo-agenda/data-model.md), en la versión de `master`

Convenciones de la 001: fechas y horas en texto, en hora local de la clínica, `AAAA-MM-DDTHH:MM`. Las marcas de **tiempo real** (`ultima_actividad`) son enteros en milisegundos desde 1970, porque miden esperas y no horas de la clínica (FR-043 de la 001, «Esperas»).

Esta feature no cambia `clinica`, `profesional`, `servicio` ni `cita`, ni los disparadores de RN1, RN3, RN4 y RN7, ni la semilla y sus cifras.

## Esquema versión 3

`VERSION_ESQUEMA` pasa de 2 a 3. Un archivo de datos de la versión 2 se rechaza con el mensaje de `EsquemaAntiguo` y se regenera con `npm run semilla` ([research.md §6](research.md#6-enlace-personal-de-cada-ficha-y-anulación-fr-001-fr-002-rp7)).

### paciente (cambia una columna)

| Campo | Tipo | Reglas |
|-------|------|--------|
| enlace | texto | **Pasa a obligatorio.** Por defecto `lower(hex(randomblob(16)))`. Mantiene el `CHECK` de 32 caracteres hexadecimales en minúscula y el índice único. Es el enlace personal vigente de la ficha: uno por ficha, sin caducidad (FR-001, FR-025) |

El resto de columnas no cambia. La semilla sigue escribiendo los enlaces de demostración de FR-029 de la 001, que tienen la misma forma.

### sesion_paciente (se amplía)

| Campo | Tipo | Reglas |
|-------|------|--------|
| token_hash | texto | Clave primaria. SHA-256 del token, que solo viaja en la cookie `sesion_paciente` (de la 001) |
| paciente_id | entero | Referencia a `paciente` (de la 001). Es la ficha de la sesión, en los dos alcances |
| cita_id | entero o nulo | **Nuevo.** `NULL`: sesión abierta con el enlace personal, con alcance de toda la ficha. Con valor: sesión abierta con un enlace de cancelación, con alcance solo de esa cita (RP6). Referencia a `cita` |
| ultima_actividad | entero | **Nuevo.** Milisegundos de tiempo real de la última petición. Caduca a los 30 minutos sin actividad (FR-004) |

Restricción: si `cita_id` tiene valor, esa cita es de `paciente_id`. Lo comprueba un disparador `BEFORE INSERT`, para que ninguna vía abra una sesión de una cita con la ficha de otro paciente.

### enlace_cancelacion (nueva)

Credencial de una sola cita (RP6). La crea la 002 como parte del modelo común, y la llena la 003 con cada recordatorio ([modelo-acceso.md](contracts/modelo-acceso.md)).

| Campo | Tipo | Reglas |
|-------|------|--------|
| token_hash | texto | Clave primaria. SHA-256 del token de 32 caracteres hexadecimales, generado al azar con el mismo generador que el enlace personal (FR-025). El token en claro solo va en el correo |
| cita_id | entero | Referencia a `cita` |

Índice por `cita_id`, que sirve a la anulación en cascada de RP7.

## Relaciones

```text
clinica 1──* paciente 1──* cita 1──* enlace_cancelacion
               │                │
               └──* sesion_paciente *──┘ (cita_id, opcional)
```

Una ficha tiene exactamente un enlace personal vigente, muchas sesiones de paciente y, a través de sus citas, muchos enlaces de cancelación.

## Ciclo de vida de las credenciales

```text
Enlace personal:     nace con la ficha ──► vigente ──(recepción lo anula)──► sustituido por uno nuevo
Enlace de cancelación: nace con el recordatorio (003) ──► vigente ──┬─(llega el inicio de la cita, RR6)──► caducado
                                                                  └─(se anula el enlace personal, RP7)──► borrado
Sesión de paciente:  se abre con un enlace vigente ──► activa ──┬─(30 min sin actividad)──► caducada y borrada
                                                               ├─(el paciente sale)──► borrada
                                                               ├─(se anula el enlace personal, RP7)──► borrada
                                                               └─(se regenera la semilla)──► borrada
```

- **Anular el enlace personal** (RP7) es una sola transacción: nuevo `paciente.enlace`, borrado de los `enlace_cancelacion` de las citas de la ficha y borrado de todas sus `sesion_paciente`.
- **Regenerar la semilla**: `borrarClinica` borra, antes que las citas, los enlaces de cancelación y las sesiones de paciente de esa clínica (caso límite «Regenerar la semilla»).
- **Una sesión de alcance de cita** no se convierte nunca en una de ficha.

## Datos derivados (sin almacenar)

### Cita vista por el paciente

Se calcula en cada carga con las funciones de la 001 ([research.md §7](research.md#7-qué-ve-el-paciente-rp2-fr-007-a-fr-013)), con `ahora = ahoraLocal(contexto, zona)`.

| Dato | Regla | Origen |
|------|-------|--------|
| Sección | «Próximas citas» si `reservada` y `!sinCerrar`; si no, «Historial» | RP2, FR-040 de la 001 |
| Orden | Próximas, de la más cercana a la más lejana; historial, de la más reciente a la más antigua | FR-007 |
| Etiqueta | `sinCerrar` → «Pendiente de confirmar por la clínica»; si no, `etiquetaCita` | FR-009, FR-027 de la 001 |
| Cancelable | Próxima y `dentroDePlazo(inicio, ahora)` | RP3, RN8 de la 001 |
| Límite mostrado | `limiteCancelacion(inicio)`, en las próximas no cancelables | FR-013 |
| Campos | Día de la semana, fecha, inicio, fin, servicio, profesional y etiqueta. Nunca el precio | FR-008 |

### Hueco liberado

| Campo | Regla |
|-------|-------|
| Profesional, inicio, fin | Los de una cita `cancelada` con `origen_cancelacion` en (`portal`, `correo`) |
| Condición | `inicio > ahora`, y ninguna cita `reservada` o `completada` del mismo profesional con `inicio < fin_hueco` y `inicio_hueco < fin` |
| Unicidad | Uno por cada combinación de profesional, inicio y fin |
| Orden | Por inicio, del más cercano al más lejano |

## Dónde se hace cumplir cada regla

| Regla | Almacén | Servicio o ruta |
|-------|---------|-----------------|
| RP1 una ficha, sus citas | Disparador de `sesion_paciente`: la cita del alcance es de la ficha | Toda consulta del portal filtra por `paciente_id` de la sesión; cancelar comprueba el paciente de la cita antes de llamar a FR-038 |
| RP2 futura o historial | — | `sinCerrar` de la 001 |
| RP3 plazo | — | `cancelarCita` de la 001 (RN8), al registrar |
| RP4 una sola forma de cancelar | `CHECK` de origen y momento, de la 001 | Solo `cancelarCita(…, 'portal')` |
| RP5 única escritura | — | El portal no importa ninguna otra función de escritura de citas; un test lo comprueba leyendo los módulos |
| RP6 alcance de cada credencial | `cita_id` de la sesión | Cada ruta de paciente declara el alcance que admite |
| RP7 anulación en cascada | Una transacción | Servicio de anulación |
| FR-001 toda ficha tiene enlace | `NOT NULL DEFAULT` | — |
| FR-004 inactividad | `ultima_actividad` | Comprobación en cada petición, con `relojReal` |
| FR-004 límite de intentos | — (en memoria) | Contador por IP |
| FR-025 forma | `CHECK` de `paciente.enlace` | Validación de la ruta antes de buscar |
| RN1 en el tramo liberado | `cita_solape`, de la 001 | Alta de la 001, sin cambios |
