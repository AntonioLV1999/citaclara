# Modelo de datos: Recordatorios de cita

**Feature**: [spec.md](spec.md) | **Decisiones**: [research.md](research.md) | **Parte de**: el modelo de la [001](../001-nucleo-agenda/data-model.md) y el de la [002](../002-portal-paciente/data-model.md)

Convenciones de la 001: las fechas y horas son texto en hora local de la clínica, `AAAA-MM-DDTHH:MM`.

## Versión del esquema

La 002 deja el esquema en la versión 3. La 003 añade una tabla y lo pasa a la **versión 4** (`VERSION_ESQUEMA = 4` en `src/datos/bd.js`). Como en la 001, un archivo de una versión anterior no se migra: se borra y se regenera con la semilla (research de la 001, §16). Si la 003 llegara a `master` antes que la 002, cosa que §1 de [research.md](research.md) descarta, este número se revisaría.

## Entidades

### recordatorio (nueva)

Constancia de que una cita tiene su aviso (entidad «Recordatorio» de la spec).

| Campo | Tipo | Reglas |
|-------|------|--------|
| cita_id | entero | **Clave primaria** y referencia a `cita`. Una cita tiene como máximo un recordatorio (RR1), y lo garantiza el almacén |
| enviado_en | texto | «Ahora» local de la clínica en la ejecución que lo envió, con el reloj fijado si lo está (FR-003) |
| direccion | texto | El correo de la ficha en el momento del envío (RR2). No cambia si después se corrige la ficha |
| modo | texto | `simulado` o `real` (`CHECK`). En la v1 solo se escribe `simulado` (FR-018, [research.md §5](research.md#5-modo-de-envío-fr-018-a-fr-020-hu3)) |

Un recordatorio simulado cuenta como enviado (FR-020): la fila es la misma en los dos modos.

### enlace_cancelacion (de la 002, sin cambios)

La crea la 002 ([data-model.md de la 002](../002-portal-paciente/data-model.md)). La 003 inserta una fila por recordatorio, en la misma transacción que el `recordatorio`:

| Campo | Lo que escribe la 003 |
|-------|-----------------------|
| token_hash | SHA-256 del token de 32 caracteres hexadecimales del generador único de la 002 (002/FR-025). El token en claro solo va en el correo |
| cita_id | La cita del recordatorio |

### cita, paciente y clinica (de la 001, sin cambios)

- **cita**: la 003 no le añade campos. Lee `estado`, `inicio`, el profesional y el servicio. Cancelar desde el correo escribe `estado = 'cancelada'`, `origen_cancelacion = 'correo'` y `momento_cancelacion`, siempre a través de `cancelarCita` (FR-038 y FR-036 de la 001).
- **paciente**: lee `nombre` y `email`. Sin correo no hay recordatorio (RR2).
- **clinica**: lee `nombre`, `zona_horaria` y `telefono`.

## Relaciones

```text
cita 1──0..1 recordatorio
cita 1──*    enlace_cancelacion   (la 003 crea uno con cada recordatorio)
```

Una cita y su recordatorio nacen juntos con su enlace. Los dos son independientes después: anular el enlace personal (RP7) borra el enlace de cancelación y deja el recordatorio, así que la cita no se vuelve a recordar (HU2-E10).

## Ciclo de vida

```text
cita reservada en la ventana, con correo
  │  reserva del envío (BEGIN IMMEDIATE): recordatorio + enlace_cancelacion
  ▼
envío ──┬─ bien ──► recordada (definitivo; no se vuelve a recordar, RR1)
        └─ falla ─► se borran ese recordatorio y ese enlace ──► puede recordarse en otra ejecución (FR-005)
```

- **La cita cambia de estado después**: el recordatorio se queda. RR5: una cita cancelada para crear otra no pasa su recordatorio a la nueva, que tiene el suyo si cumple RR2 y RR3.
- **Regenerar la semilla**: `borrarClinica` borra los recordatorios de las citas de la clínica antes que las citas, junto a los enlaces de cancelación que ya borra la 002 (caso límite «Regenerar los datos de demostración»).

## Consultas

### Citas de la ventana (RR2, RR3)

Para una clínica y su `hoy` local ([research.md §3](research.md#3-ventana-de-recordatorio-rr3-fr-004-sc-004)):

| Condición | Regla |
|-----------|-------|
| `cita.clinica_id = ?` | Por clínica |
| `cita.estado = 'reservada'` | RR2 |
| `cita.inicio >= 'mañanaT00:00' AND cita.inicio < 'pasadoT00:00'` | RR3 |
| Sin fila en `recordatorio` | RR1 |

Devuelve también si la ficha tiene correo, para separar las que se envían de las omitidas. Orden: por `inicio` y por `cita.id`, para que el resumen y los ficheros salgan siempre en el mismo orden.

### Reserva del envío

Dentro de `transaccionInmediata`, para una cita:

1. Vuelve a leer la cita y la ficha, y comprueba las tres condiciones de RR2 y la ausencia de recordatorio. Si alguna falla, no hace nada.
2. Inserta el `recordatorio` con la dirección de la ficha en ese momento, y el `enlace_cancelacion`.

## Dónde se hace cumplir cada regla

| Regla | Almacén | Servicio |
|-------|---------|----------|
| RR1 un recordatorio | Clave primaria `recordatorio.cita_id` | Reserva antes de enviar, en `BEGIN IMMEDIATE` |
| RR2 estado y correo | — | Comprobado en la reserva, justo antes del envío |
| RR3 ventana | — | Calculada con `ahoraLocal` y `sumarDias` |
| RR4 cancelar | Los de FR-038 y FR-036 de la 001 | `cancelarCita(…, 'correo')` |
| RR5 cita nueva | Clave primaria por cita, no por tramo | Nada propio |
| RR6 alcance y vigencia | `enlace_cancelacion` de la 002 | Resolución de la 002 y nueva comprobación en `/cancelar` |
| FR-005 fallo | — | Borrado del recordatorio y del enlace si el envío falla |
| RN1 solape | Disparador `cita_solape` de la 001 | — |
