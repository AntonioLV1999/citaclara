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

Lo crea la 002, la primera feature que construye enlaces para el paciente, con la definición de FR-042: un único ajuste con la dirección pública ([modelo-acceso.md de la 002](../../002-portal-paciente/contracts/modelo-acceso.md#dirección-pública-fr-042-de-la-001)).

| Variable de entorno | Valor | Por defecto |
|---------------------|-------|-------------|
| `CITACLARA_DIRECCION` | `http://…` o `https://…`, con servidor y puerto opcional, sin ruta ni barra final | Sin definir: `http://localhost:<PORT>` |

- **Lo leen** el servidor (`src/principal.js`), que construye con él los enlaces personales que copia recepción (002/FR-002), y la 003, que construirá igual los enlaces de cancelación de los recordatorios. Es el mismo ajuste para los dos tipos de enlace; ninguna feature crea otro.
- **Forma del enlace**: `<CITACLARA_DIRECCION>/e/<token>`, igual para los dos tipos (002/FR-025).
- **Valor mal escrito**: el proceso no arranca y escribe en español: «La dirección pública CITACLARA_DIRECCION no es válida. Escríbela como http://… o https://…, sin barra al final, por ejemplo https://citas.example.com.»
- **Solo con datos de demostración** (FR-039): el navegador solo deja copiar al portapapeles en `https` o en `localhost`, y FR-039 exige la conexión cifrada antes de usar datos reales.

### Cómo arrancar con otra dirección

```text
# Git Bash, macOS o Linux
CITACLARA_DIRECCION=http://192.168.1.20:3000 npm start

# PowerShell
$env:CITACLARA_DIRECCION = 'http://192.168.1.20:3000'; npm start
```

En el código, el valor llega a las rutas como `contexto.direccion`.
