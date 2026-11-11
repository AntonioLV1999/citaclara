# Contrato: proceso de recordatorios

**Feature**: [spec.md](../spec.md) (FR-001 a FR-006, FR-018 a FR-020, RR1 a RR3) | **Decisiones**: [research.md §2 a §5, §8 y §9](../research.md#2-disparo-diario-fr-001-fr-002-casos-límite-de-ejecución)

## Función de servicio

```text
ejecutarRecordatorios(contexto, opciones) → resumen[]
```

En `src/servicios/recordatorios.js`.

| Parámetro | Contenido |
|-----------|-----------|
| `contexto` | `{ bd, ahora, momentoFijado }`, el mismo que reciben las rutas. «Ahora» se lee siempre con `ahoraLocal(contexto, zona)` (FR-003) |
| `opciones.clinicas` | Las clínicas que se procesan. Por defecto, todas (`todasLasClinicas`) |
| `opciones.direccion` | La dirección pública, `CITACLARA_DIRECCION` ya validada |
| `opciones.enviar` | `(mensaje) → void`, que escribe o envía un mensaje y lanza una excepción si falla. Por defecto, el escritor de ficheros `.eml` en `datos/salida-correo/` |
| `opciones.smtpConfigurado` | `true` si `CITACLARA_SMTP` tiene valor. Solo cambia el aviso del resumen: el envío sigue siendo simulado (FR-018) |

Devuelve un resumen por clínica: `{ clinica, hoy, ventana, enviados, sinCorreo, fallidos }`, con `ventana` como `AAAA-MM-DD` y los tres recuentos como números.

Un fallo con una cita no detiene a las demás (FR-005). Un error que no sea de una cita, como no poder abrir el almacén, sí detiene el proceso.

## Lanzarlo a mano (FR-002, FR-003)

```text
npm run recordatorios          # node src/recordatorios.js
```

| Variable de entorno | Uso | Contrato |
|---------------------|-----|----------|
| `CITACLARA_AHORA` | Momento de referencia, el mismo que el del servidor | [configuracion.md de la 001](../../001-nucleo-agenda/contracts/configuracion.md) |
| `CITACLARA_DIRECCION` | Dirección pública para construir el enlace | [modelo-acceso.md de la 002](../../002-portal-paciente/contracts/modelo-acceso.md) |
| `PORT` | Solo para la dirección por defecto, `http://localhost:<PORT>`, que debe coincidir con la del servidor | Igual que el servidor: 3000 por defecto |
| `CITACLARA_SMTP` | Servidor de correo. Con valor, se avisa de que el envío real está desactivado (FR-018) | Este contrato |

- Con un ajuste mal escrito, el proceso no arranca y escribe el mismo mensaje que el servidor.
- Procesa todas las clínicas, escribe los resúmenes y termina con código 0. Si alguna cita ha fallado, termina con código 1.
- Si el archivo de datos tiene otra versión del esquema, explica cómo regenerarlo, igual que el servidor y la semilla.

## Ejecución programada (FR-001)

`src/servicios/programador.js`, que solo arranca `src/principal.js`:

```text
programarRecordatorios({ contexto, clinicas, relojReal, ejecutar, cadaMs = 60_000 }) → { parar }
```

- Cada `cadaMs`, para cada clínica, calcula la hora local real con `ahoraEnZona(relojReal(), zona)`, sin el momento de referencia, porque es una espera (FR-043 de la 001).
- Si son las 08:00 o más y no ha ejecutado aún para esa fecha local en este proceso, llama a `ejecutar` con esa clínica y anota la fecha.
- Comprueba también al arrancar, sin esperar el primer intervalo (caso límite «Ejecución retrasada»).
- Escribe el resumen igual que la ejecución manual.

## Resumen (FR-006)

Una línea por clínica y ejecución, en la salida del proceso y al final de `datos/recordatorios.log`:

```text
02/11/2026 08:00 (hora peninsular) · Clínica Eleva · citas del martes 03/11/2026: 4 enviados, 1 sin correo, 0 fallidos
```

- El primer momento es el «ahora» de la ejecución, en hora local de la clínica, con la zona indicada: «hora peninsular» o «hora de Canarias» (FR-008).
- Con `CITACLARA_SMTP`, se añade después de los resúmenes, una sola vez: «Hay un servidor de correo configurado, pero el envío real está desactivado hasta que se cumplan las condiciones para usar datos reales. Los recordatorios se han escrito en datos/salida-correo/.»
- Por cada cita fallida, una línea más con el número de la cita y el error, para poder diagnosticarla. Nunca la dirección de correo.

## Escritor de ficheros (FR-019)

- Carpeta: `datos/salida-correo/`, que crea si no existe. Está dentro de `datos/`, fuera del control de versiones.
- Un fichero por recordatorio: `recordatorio-<cita_id>-<8 hexadecimales al azar>.eml`, creado con `wx`: nunca sobrescribe.
- Contenido: [correo-recordatorio.md](correo-recordatorio.md).
- No abre ninguna conexión de red.
