# Contrato: modelo común de acceso del paciente

**Feature**: [spec.md](../spec.md) (RP6, RP7, FR-003 a FR-005, FR-025, FR-026) | **Decisiones**: [research.md §1 a §5](../research.md#1-reparto-del-modelo-común-entre-la-002-y-la-003-rp6-rp7) | **Lo usa**: la 003 (RR6, 003/FR-011)

Interfaz interna que comparten los dos tipos de enlace del paciente: el enlace personal (002) y el enlace de cancelación del recordatorio (003). La 002 es su propietaria, y la 003 la usa sin redefinirla.

## Qué pone cada feature

| Pieza | 002 | 003 |
|-------|-----|-----|
| Forma y generador del token (FR-025) | Define y usa | Usa |
| Tabla `enlace_cancelacion` ([data-model.md](../data-model.md#enlace_cancelacion-nueva)) | Crea, lee y borra (RP7) | Inserta una fila por recordatorio |
| Ruta `GET /e/:token` y su resolución | Implementa | — |
| Vigencia del enlace de cancelación (RR6, D5) | Aplica al resolver, citando RR6 | Define la regla |
| Respuesta uniforme (FR-003) y límite de intentos (FR-004) | Implementa | — |
| Sesiones de paciente y su alcance (FR-005) | Implementa | — |
| Pantalla de cancelación del correo y sus mensajes (003/FR-011, 003/FR-014) | — | Implementa, como ruta de paciente con alcance de cita |
| Anulación en cascada (RP7) | Implementa | — |

## Token

- **Forma**: 32 caracteres hexadecimales en minúscula, 128 bits. Nada más: sin ruta, dominio ni prefijo de tipo.
- **Generador único**: `lower(hex(randomblob(16)))` de SQLite, para el enlace personal y para el de cancelación. Nunca se deriva de datos del paciente, de la cita ni de otro enlace. La única excepción son los enlaces personales de demostración de FR-029 de la 001.
- **Validación**: antes de buscar, la ruta comprueba la forma con `/^[0-9a-f]{32}$/`. Un token con otra forma da la respuesta uniforme, igual que uno inexistente, y también cuenta como intento no válido.
- **Enlace completo**: `<CITACLARA_DIRECCION>/e/<token>`, igual para los dos tipos.

## Dirección pública (FR-042 de la 001)

| Variable de entorno | Valor | Por defecto |
|---------------------|-------|-------------|
| `CITACLARA_DIRECCION` | `http://…` o `https://…`, sin barra final | `http://localhost:<PORT>` |

Es el único ajuste para construir los enlaces de los dos tipos. La 003 lo lee igual. Con un valor mal escrito, el proceso no arranca y escribe: «La dirección pública CITACLARA_DIRECCION no es válida. Escríbela como http://… o https://…, sin barra al final, por ejemplo https://citas.example.com.» La implementación lo añade a [configuracion.md de la 001](../../001-nucleo-agenda/contracts/configuracion.md), que reserva ese apartado para la primera feature que construya enlaces.

## Resolución de un enlace

`GET /e/:token`, en este orden:

1. **Bloqueo**: si la IP de origen está bloqueada, responde 429 con el mensaje de bloqueo, **sea cual sea el token**.
2. **Forma**: si el token no tiene la forma, se trata como no válido (paso 5).
3. **Enlace personal**: si coincide con `paciente.enlace`, abre una sesión de alcance de ficha y redirige a `/portal`.
4. **Enlace de cancelación**: si el SHA-256 del token está en `enlace_cancelacion` y la cita todavía no ha empezado (`ahoraLocal < cita.inicio`, RR6), abre una sesión de alcance de esa cita y redirige a `/cancelar`, la ruta que pone la 003.
5. **No válido**: suma un intento a la IP, y responde 404 con la respuesta uniforme. Si con él llega al límite, bloquea la IP.

La respuesta uniforme es idéntica byte a byte para cualquier token no válido: inventado, anulado, caducado, mal formado o de cualquier tipo. Un test lo compara.

## Límite de intentos

| Constante | Valor |
|-----------|-------|
| Intentos no válidos que bloquean | 10 |
| Ventana en la que se cuentan | 10 minutos |
| Duración del bloqueo | 15 minutos |

- Se cuenta por IP de origen, en memoria, con `relojReal()` (tiempo real, FR-043 de la 001).
- Los dos tipos de enlace cuentan juntos, porque comparten la ruta.
- Las peticiones a `/portal` con o sin sesión no cuentan: solo los enlaces.

## Sesión de paciente

- **Cookie**: `sesion_paciente=<token>`, `HttpOnly; SameSite=Lax; Path=/`. El token, de 32 bytes aleatorios en hexadecimal, solo se guarda como SHA-256 en `sesion_paciente.token_hash`.
- **Alcance**: `cita_id` `NULL` para el enlace personal (ficha), o la cita para el de cancelación.
- **Cada ruta de paciente declara su alcance**: `ficha`, `cita` o `cualquiera`. Una sesión de alcance de cita solo abre las rutas de alcance `cita` o `cualquiera`, y solo para su cita. Las rutas de `/portal` son de alcance `ficha`, salvo `POST /portal/salir`, que es `cualquiera`. La pantalla `/cancelar` de la 003 será de alcance `cita`.
- **Contexto de la ruta**: recibe `paciente` (la ficha), `clinica` (la de la ficha), `citaDelAlcance` (o `null`) y lo que ya recibían las rutas de la 001 (`bd`, `ahora`, `momentoFijado`).
- **Inactividad**: si `relojReal() - ultima_actividad` supera 30 minutos, la sesión se borra y la ruta responde como sin sesión. Si no, se actualiza `ultima_actividad`.
- **Nunca abre recepción** (FR-037 de la 001): el servidor de recepción no lee esta cookie ni esta tabla.

## Anulación del enlace personal (RP7)

```text
anularEnlace(bd, clinicaId, pacienteId) → nuevo enlace
```

En una sola transacción `BEGIN IMMEDIATE`:

1. `paciente.enlace` pasa a un token nuevo del generador único.
2. Se borran los `enlace_cancelacion` de todas las citas de esa ficha.
3. Se borran todas las `sesion_paciente` de esa ficha, de los dos alcances.

No cambia ninguna cita. Desde que termina, el enlace anterior y todos los de cancelación de esa ficha, también los de correos ya enviados, dan la respuesta uniforme.

## Lo que la 003 debe hacer para usarlo

- Generar el token con el generador único e insertar `(sha256(token), cita_id)` en `enlace_cancelacion`.
- Construir el enlace con `CITACLARA_DIRECCION` y `/e/<token>`, nunca con otra ruta.
- Registrar `GET /cancelar` y `POST /cancelar` como rutas de paciente de alcance `cita`, y cancelar con `cancelarCita(…, 'correo')` (FR-038 de la 001).
- No crear otra ruta pública, otra respuesta para enlaces no válidos ni otro contador de intentos.
