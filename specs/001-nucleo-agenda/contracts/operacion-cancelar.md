# Contrato: operación única de cancelar

**Feature**: [spec.md](../spec.md) (FR-038, FR-036, RN5, RN8) | **Decisiones**: [research.md §8 y §9](../research.md#8-operación-única-de-cancelar-fr-038-rn8)

Interfaz interna que comparten todos los canales: la acción «Cancelar» de la agenda (001), el portal (002) y el enlace del correo (003). Es la única forma de cancelar una cita: ninguna ruta, proceso ni spec escribe una cancelación por otra vía (FR-038).

## Firma

```text
cancelarCita(contexto, citaId, canal) → resultado | null
```

| Parámetro | Contenido |
|-----------|-----------|
| `contexto` | `{ bd, clinica, ahora, momentoFijado }`, el mismo que reciben las rutas. `clinica` aporta el filtro y la zona horaria; `ahora` y `momentoFijado`, el «ahora» del sistema ([configuracion.md](configuracion.md)) |
| `citaId` | Identificador de la cita, que debe ser de `clinica` |
| `canal` | `recepcion`, `portal` o `correo`. Es el origen que se registra (FR-036). Cualquier otro valor lanza una excepción: es un error de programación |

Devuelve `null`, sin efecto, si la cita no existe en esa clínica. El canal decide qué responder (recepción, 404). Cómo localiza la cita cada canal del paciente lo deciden la 002 y la 003.

## Resultados

Se comprueban en este orden, dentro de una sola transacción `BEGIN IMMEDIATE`:

| `resultado` | Cuándo | Campos además de `resultado` y `cita` | Efecto |
|-------------|--------|---------------------------------------|--------|
| `ya_cancelada` | La cita ya está cancelada | `origen`, `momento`: los registrados antes | Ninguno |
| `no_cancelable` | La cita está completada o no asistida | `estado` | Ninguno |
| `fuera_de_plazo` | Canal `portal` o `correo`, cita reservada, y «ahora» posterior al límite | `limite`: inicio − 2 horas, en `AAAA-MM-DDTHH:MM` | Ninguno |
| `cancelada_ahora` | Cita reservada y, si el canal es del paciente, «ahora» anterior o igual al límite | `origen`, `momento`: los recién registrados | Queda cancelada y su tramo, libre |

- **Límite de RN8**: `inicio` menos 120 minutos sobre el reloj local de la clínica. «Ahora» va con minutos, sin segundos, así que el minuto límite entra entero.
- **Con `recepcion`**: nunca da `fuera_de_plazo` (RN5).
- **Indivisible**: comprobar y escribir es una sola operación. Entre cancelaciones simultáneas de la misma cita, exactamente una obtiene `cancelada_ahora`, y las demás `ya_cancelada` con el origen y el momento de esa (H6-E9, SC-013).
- **Sin texto**: la operación devuelve el resultado, no el mensaje. Cada canal elige el suyo: recepción, el de H3-E5 en [interfaz-web.md](interfaz-web.md); el portal, según 002/FR-017; el correo, según 003/FR-014.

## Funciones relacionadas que exporta la 001

| Función | Módulo | Uso |
|---------|--------|-----|
| `sinCerrar(cita, ahora)` | `src/dominio/estados.js` | Única definición de cita sin cerrar (FR-040). La citan la 002 (RP2, 002/FR-009) y la 004 (RA6) |
| `etiquetaCita(cita)` | `src/dominio/formato.js` | Etiqueta de FR-027 para una cita, también la cancelada con su origen. El paciente ve en sus canales la misma etiqueta que la agenda |
| `ahoraLocal(contexto, zona)` | `src/dominio/tiempo.js` | «Ahora» en hora local de la clínica, respetando el momento de referencia (FR-043) |
