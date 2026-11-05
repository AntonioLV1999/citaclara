# Modelo de datos: Núcleo de agenda

**Feature**: [spec.md](spec.md) | **Decisiones**: [research.md](research.md)

Convenciones: las fechas y horas son texto en hora local de la clínica, con formato `AAAA-MM-DDTHH:MM`. Los importes son céntimos enteros.

## Entidades

### clinica

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | entero | Clave primaria |
| nombre | texto | Obligatorio |
| clave_hash | texto | `scrypt` con sal; nunca la clave en claro (FR-002) |
| clave_sal | texto | Obligatorio |
| zona_horaria | texto | `Europe/Madrid` o `Atlantic/Canary` (FR-023) |

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
| nombre | texto | Obligatorio, no vacío tras recortar espacios |
| telefono | texto | Obligatorio; al menos 9 dígitos, admite `+` y espacios |
| email | texto o nulo | Opcional; si existe, con forma de correo (FR-013) |

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

Índice por `(profesional_id, inicio)`, que sirve a la agenda del día y a la comprobación de solape.

### sesion

| Campo | Tipo | Reglas |
|-------|------|--------|
| token_hash | texto | Clave primaria; el token en claro solo viaja en la cookie |
| clinica_id | entero | Referencia a `clinica` |

## Relaciones

Una clínica tiene muchos profesionales, servicios, pacientes, citas y sesiones. Una cita pertenece a exactamente un profesional, un servicio y un paciente, y los cuatro registros deben ser de la misma clínica.

## Transiciones de estado (RN4, RN5, RN6)

```text
                ┌─► completada    (desde la hora de inicio; sigue ocupando)
reservada ──────┼─► no_asistida   (desde la hora de inicio; libera el tramo)
                └─► cancelada     (en cualquier momento; libera el tramo)
```

Los tres estados de llegada son definitivos. Ninguna transición ocurre de forma automática (FR-022).

## Dónde se hace cumplir cada regla

| Regla | Almacén (cualquier origen) | Servicio de agenda |
|-------|----------------------------|--------------------|
| RN1 solape | Disparador `BEFORE INSERT` | Traduce el aborto a un mensaje con la cita que lo impide |
| RN2 pasado | — (la semilla queda exenta) | Compara con `ahora()` en la zona de la clínica |
| RN3 fin | Disparador: comprueba que `fin` = `inicio` + duración | Calcula `fin` |
| RN4 transiciones | Disparador `BEFORE UPDATE`: solo desde `reservada`, y a un estado válido | Mensaje con el estado actual |
| RN4 inmutabilidad | El mismo disparador: profesional, servicio, paciente, inicio y fin no cambian | — |
| RN5 hora de inicio | — (depende del reloj) | Compara con `ahora()` |
| RN7 especialidad | Disparador `BEFORE INSERT` | Filtra los servicios del alta |
| Misma clínica | Disparador `BEFORE INSERT` | Toda consulta filtra por la clínica de la sesión |
| FR-012 horario | — | Lunes a viernes, de 09:00 a 20:00 |
| FR-011 múltiplos | `CHECK` sobre los minutos de `inicio` | Mensaje en el alta |

Como `UPDATE` solo admite cambiar `estado` desde `reservada`, y un cambio de estado nunca añade ocupación, una actualización no puede crear un solape. Por eso el disparador de RN1 basta con vigilar `INSERT`.

## Cálculo de huecos libres (FR-016, FR-018)

Función pura del dominio. Toma el horario del día y le resta los tramos de las citas reservadas y completadas. El resultado son tramos continuos `[inicio, fin)`. Si el día es hoy, marca como no reservable lo anterior a `ahora()`. Si es un día pasado, nada es reservable.

## Generación de la semilla

Reglas de contenido, además de las de [semilla.md](contracts/semilla.md):

- Entre 3 y 5 citas por profesional y día en la historia, y menos en las semanas futuras, para que queden huecos.
- La primera cita de un paciente en una especialidad usa el servicio de primera visita, y se repite solo si esa cita no llegó a completarse (FR-033).
- Recuentos exactos por estado sobre la lista barajada: `redondear(0,10 × N)` no asistidas, `redondear(0,08 × N)` canceladas y el resto completadas.
