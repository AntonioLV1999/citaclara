# Contrato: configuración común

**Feature**: [spec.md](../spec.md) (FR-042, FR-043) | **Decisiones**: [research.md §13](../research.md#13-momento-de-referencia-fr-043)

## Momento de referencia (FR-043)

| Variable de entorno | Valor | Por defecto |
|---------------------|-------|-------------|
| `CITACLARA_AHORA` | Fecha y hora local de la clínica, `AAAA-MM-DDTHH:MM` | Sin definir: «ahora» es la hora real |

- **Lo leen** el servidor (`src/principal.js`) y cualquier otro proceso del producto, como el de recordatorios de la 003 (003/FR-003). Es el mismo ajuste para todos; ninguno crea otro.
- **Con valor**: «ahora» es ese texto, en cada clínica y en su hora local, y no avanza mientras el proceso siga en marcha. Lo usan RN2, RN5, RN8, FR-038, FR-040, «hoy» en la agenda y la vigencia de los enlaces de la 003 (RR6). El momento registrado de una cancelación es también ese.
- **Valor mal escrito** (otro formato, o una fecha u hora imposible): el proceso no arranca y escribe en español: «El momento de referencia CITACLARA_AHORA no es válido. Escríbelo como AAAA-MM-DDTHH:MM, por ejemplo 2026-11-04T12:00.»
- **Esperas**: la inactividad de una sesión, los bloqueos por intentos (002/FR-004) y cualquier otra espera se miden con el tiempo real que pasa (`Date.now()`), nunca con este ajuste.
- **Aviso en pantalla**: con valor, todas las pantallas de recepción muestran «Reloj de demostración: la hora está fijada en el {día de la semana} {dd/mm/aaaa} a las {HH:MM} y no avanza.» (HU5-E5).
- **Solo con datos de demostración** (FR-039).

### Cómo arrancar con el reloj fijado

```text
# Git Bash, macOS o Linux
CITACLARA_AHORA=2026-11-04T12:00 npm start

# PowerShell
$env:CITACLARA_AHORA = '2026-11-04T12:00'; npm start
```

En el código, el valor llega a rutas y servicios como `contexto.momentoFijado`, y se lee siempre con `ahoraLocal(contexto, zona)`, nunca directamente.

## Dirección pública del producto (FR-042)

Reservado, sin implementar en la 001. Lo crea la primera feature que construya enlaces para el paciente (002 o 003), con la definición de FR-042: un único ajuste con la dirección pública. Ese mismo cambio lo añade a este contrato.
