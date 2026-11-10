# Modelo de datos: Núcleo de agenda

**Feature**: [spec.md](spec.md) | **Decisiones**: [research.md](research.md) | **Versión del esquema**: 2 (`PRAGMA user_version`)

Convenciones: las fechas y horas son texto en hora local de la clínica, con formato `AAAA-MM-DDTHH:MM`. Los importes son céntimos enteros.

**Cambios de la versión 2** (cambios del 10/11/2026), marcados con ★: teléfono de la clínica, enlace del paciente, origen y momento de la cancelación, y tabla de sesiones de paciente. Un archivo de una versión anterior no se migra: se borra y se regenera con la semilla ([research.md §16](research.md#16-cambio-de-esquema-sobre-un-archivo-existente)).

## Entidades

### clinica

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | entero | Clave primaria |
| nombre | texto | Obligatorio |
| clave_hash | texto | `scrypt` con sal; nunca la clave en claro (FR-002) |
| clave_sal | texto | Obligatorio |
| zona_horaria | texto | `Europe/Madrid` o `Atlantic/Canary` (FR-023) |
| ★ telefono | texto o nulo | El que se da a los pacientes. La semilla escribe `000 200 000` (FR-029). Admite nulo porque hay tests que crean clínicas sin teléfono |

### profesional

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | entero | Clave primaria |
| clinica_id | entero | Referencia a `clinica` |
| nombre | texto | Obligatorio |
| especialidad | texto | Obligatorio |

### servicio

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | entero | Clave primaria |
| clinica_id | entero | Referencia a `clinica` |
| nombre | texto | Obligatorio |
| especialidad | texto | Obligatorio (RN7) |
| duracion_min | entero | Mayor que 0 y múltiplo de 15 (FR-011) |
| precio_centimos | entero | Mayor o igual que 0 |

### paciente

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | entero | Clave primaria |
| clinica_id | entero | Referencia a `clinica` |
| nombre | texto | Obligatorio, no vacío tras recortar espacios. No se edita fuera del alta |
| telefono | texto | Obligatorio; al menos 9 dígitos, admite `+` y espacios. No se edita fuera del alta |
| email | texto o nulo | Opcional; si existe, con forma de correo (FR-013). ★ Recepción lo añade, corrige o quita desde una cita (FR-041) |
| ★ enlace | texto o nulo | Enlace personal: solo el token, 32 caracteres hexadecimales en minúscula (`CHECK`), único entre los que no son nulos. La semilla lo escribe para sus 40 pacientes (FR-029). Las fichas creadas en el alta nacen sin enlace: generarlo y anularlo es de la 002 (002/FR-002) |

### cita

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | entero | Clave primaria |
| clinica_id | entero | Referencia a `clinica` |
| profesional_id | entero | Referencia a `profesional` |
| servicio_id | entero | Referencia a `servicio` |
| paciente_id | entero | Referencia a `paciente` |
| inicio | texto | Hora local; minutos en 00, 15, 30 o 45 |
| fin | texto | Inicio más la duración del servicio (RN3) |
| estado | texto | `reservada`, `completada`, `cancelada` o `no_asistida` |
| ★ origen_cancelacion | texto o nulo | `recepcion`, `portal` o `correo` (FR-036) |
| ★ momento_cancelacion | texto o nulo | Hora local de la cancelación, con el formato de `inicio` |

★ **Restricción de tabla** (FR-036, SC-011): `origen_cancelacion` y `momento_cancelacion` son los dos no nulos si `estado = 'cancelada'`, y los dos nulos en cualquier otro estado. Vale para `INSERT` y para `UPDATE`, sea cual sea quien escriba.

Índice por `(profesional_id, inicio)`, que sirve a la agenda del día y a la comprobación de solape.

### sesion

| Campo | Tipo | Reglas |
|-------|------|--------|
| token_hash | texto | Clave primaria; el token en claro solo viaja en la cookie `sesion` |
| clinica_id | entero | Referencia a `clinica` |

### ★ sesion_paciente

| Campo | Tipo | Reglas |
|-------|------|--------|
| token_hash | texto | Clave primaria; el token en claro solo viaja en la cookie `sesion_paciente` |
| paciente_id | entero | Referencia a `paciente` |

Almacén propio de las sesiones de paciente (FR-037). La 001 no las crea ni las lee: solo garantiza que existen aparte y que no abren nada de recepción. La 002 la amplía con lo que su modelo de acceso necesite, como el último uso para la inactividad (002/FR-004).

## Relaciones

Una clínica tiene muchos profesionales, servicios, pacientes, citas y sesiones de recepción. Un paciente tiene muchas sesiones de paciente. Una cita pertenece a exactamente un profesional, un servicio y un paciente, y los cuatro registros deben ser de la misma clínica.

## Transiciones de estado (RN4, RN5, RN6, RN8)

```text
                ┌─► completada    (desde la hora de inicio; sigue ocupando)
reservada ──────┼─► no_asistida   (desde la hora de inicio; libera el tramo)
                └─► cancelada     (libera el tramo; registra origen y momento)
                      · recepción: en cualquier momento (RN5)
                      · portal o correo: hasta inicio − 2 h, minuto incluido (RN8)
```

Los tres estados de llegada son definitivos. Ninguna transición ocurre de forma automática (FR-022). La cancelación solo se hace con la operación única de [operacion-cancelar.md](contracts/operacion-cancelar.md) (FR-038).

**Cita sin cerrar** (FR-040): `estado = 'reservada'` e `inicio <= ahora`. No es un estado guardado: se calcula con `sinCerrar(cita, ahora)`, la misma frontera que RN5 usa para permitir completar y marcar como no asistida.

## Dónde se hace cumplir cada regla

| Regla | Almacén (cualquier origen) | Servicio |
|-------|----------------------------|----------|
| RN1 solape | Disparador `BEFORE INSERT` | Traduce el aborto a un mensaje con la cita que lo impide |
| RN2 pasado | — (la semilla queda exenta) | Compara con «ahora» en la zona de la clínica |
| RN3 fin | Disparador: comprueba que `fin` = `inicio` + duración | Calcula `fin` |
| RN4 transiciones | Disparador `BEFORE UPDATE`: solo desde `reservada`, y a un estado válido | Mensaje con el estado actual |
| RN4 inmutabilidad | El mismo disparador: profesional, servicio, paciente, inicio y fin no cambian | — |
| RN5 hora de inicio | — (depende del reloj) | `sinCerrar`, con «ahora» |
| RN7 especialidad | Disparador `BEFORE INSERT` | Filtra los servicios del alta |
| ★ RN8 plazo del paciente | — (depende del reloj, que puede estar fijado) | `cancelarCita`, solo con los canales `portal` y `correo` |
| ★ FR-036 origen y momento | Restricción de tabla; `cita_rn4` impide corregirlos después | `cancelarCita` los escribe en el mismo `UPDATE` que el estado |
| ★ FR-038 operación única | La restricción de tabla impide cancelar sin origen | Solo `src/servicios/cancelar.js` importa la escritura de la cancelación (lo comprueba un test) |
| ★ FR-037 sesiones aparte | Tabla propia | El servidor de recepción solo lee la cookie `sesion` y la tabla `sesion` |
| ★ FR-041 correo | — | Validación de FR-013; solo cambia `paciente.email` |
| Misma clínica | Disparador `BEFORE INSERT` | Toda consulta filtra por la clínica de la sesión |
| FR-012 horario | — | Lunes a viernes, de 09:00 a 20:00 |
| FR-011 múltiplos | `CHECK` sobre los minutos de `inicio` | Mensaje en el alta |

Como `UPDATE` solo admite cambiar `estado` desde `reservada`, y un cambio de estado nunca añade ocupación, una actualización no puede crear un solape. Por eso el disparador de RN1 basta con vigilar `INSERT`. `cita_rn4` no cambia en la versión 2: ya rechaza cualquier `UPDATE` de una cita que no está reservada, y no protege el origen ni el momento antes de cancelar, porque la restricción de tabla ya impide que una cita reservada los tenga.

## Cálculo de huecos libres (FR-016, FR-018)

Función pura del dominio. Toma el horario del día y le resta los tramos de las citas reservadas y completadas. El resultado son tramos continuos `[inicio, fin)`. Si el día es hoy, marca como no reservable lo anterior a «ahora». Si es un día pasado, nada es reservable. Con el reloj fijado (FR-043), «hoy» y «ahora» son los del momento de referencia.

## Generación de la semilla

Reglas de contenido, además de las de [semilla.md](contracts/semilla.md):

- Entre 3 y 5 citas por profesional y día en la historia, y menos en las semanas futuras, para que queden huecos.
- La primera cita de un paciente en una especialidad usa el servicio de primera visita, y se repite solo si esa cita no llegó a completarse (FR-033).
- Recuentos exactos por estado sobre la lista barajada: `redondear(0,10 × N)` no asistidas, `redondear(0,08 × N)` canceladas y el resto completadas.
- ★ **Campos y orden** del objeto generado, del que salen los resúmenes de FR-030 (historial, D4):
  - Clínica: `nombre`, `zona_horaria`, `telefono`, `clave_hash`, `clave_sal`.
  - Paciente: `nombre`, `telefono`, `email`, `enlace`, con el enlace del paciente *n* derivado como dice FR-029.
  - Cita cancelada: tras `inicio` y `fin`, `origen_cancelacion` (`recepcion`) y `momento_cancelacion` (igual a `inicio`). Las demás citas no llevan esos dos campos.
  - El resumen sin fechas quita `inicio`, `fin` y `momento_cancelacion`.
