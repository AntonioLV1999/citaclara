# Guía de validación: Núcleo de agenda

**Feature**: [spec.md](spec.md) | **Contratos**: [interfaz web](contracts/interfaz-web.md), [semilla](contracts/semilla.md), [operación de cancelar](contracts/operacion-cancelar.md), [configuración](contracts/configuracion.md)

Esta guía demuestra de punta a punta que la feature funciona, una vez implementada, incluidos los dos cambios del 10/11/2026.

## Requisitos previos

- Node 26 o superior.
- `npm install` en la raíz del repositorio.
- `npx playwright install chromium`, solo para las pruebas de interfaz.
- Si hay un `datos/citaclara.db` de antes del cambio de esquema, bórralo: la aplicación lo detecta y pide hacerlo.

## Puesta en marcha

Con el reloj fijado, para que la demostración sea igual para todos (FR-043):

```text
npm run semilla
CITACLARA_AHORA=2026-11-04T12:00 npm start                      # Git Bash, macOS o Linux
$env:CITACLARA_AHORA = '2026-11-04T12:00'; npm start             # PowerShell
```

Abre `http://localhost:3000` y entra con la clave `eleva-demo`. La agenda se abre el miércoles 04/11/2026, con reservas sin cerrar el lunes y el martes, y huecos reservables desde las 12:00.

Sin `CITACLARA_AHORA`, el reloj es el real. Para tener reservas hoy, genera la semilla con `npm run semilla -- --lunes <lunes de la semana en curso>`.

## Pruebas automáticas

```text
npm test            # dominio, servicios, rutas y concurrencia
npm run test:e2e    # interfaz en navegador real
```

**Resultado esperado**: todo en verde, incluido el test de trazabilidad, que hoy está en rojo de forma acotada (S-18) y vuelve a verde con esta implementación. Cada test empieza por el identificador que comprueba, según FR-035: por ejemplo `RN8`, `H6-E9`, `FR-041` o `SC-013`.

## Escenarios manuales

| # | Pasos | Resultado esperado | Referencia |
|---|-------|--------------------|------------|
| 1 | Abre la aplicación sin sesión | Pide la clave; una clave incorrecta muestra el mensaje y ningún dato | Historia 4 |
| 2 | Abre la agenda de María, y cambia a Jorge y a otro día | Citas y huecos del día elegido, con la hora local indicada | Historia 2 |
| 3 | Pulsa un hueco libre y reserva una sesión de fisioterapia | La cita aparece con fin 45 minutos después | Historia 1 |
| 4 | Abre el alta en dos pestañas para el mismo hueco y confirma ambas | La segunda se rechaza diciendo qué cita lo impide, y muestra los huecos actuales | RN1 |
| 5 | Intenta reservar hoy a una hora pasada | Rechazo con el mensaje de RN2 | RN2 |
| 6 | Reserva con un paciente nuevo, solo con nombre y teléfono | Quedan creadas la ficha y la cita | FR-013 |
| 7 | Cancela una cita futura y reserva otra en su tramo | Se ven las dos sin confundirlas; la cancelada pone «Cancelada», sin fecha | Historia 3, H6-E7 |
| 8 | Marca una cita pasada como no asistida y prueba a cambiarla | Pide confirmación; después queda definitiva | RN4 |
| 9 | Abre la agenda en un móvil de 360 píxeles de ancho | Se maneja sin desplazamiento horizontal | FR-028 |
| 10 | Con el reloj fijado, mira cualquier pantalla, también la de acceso | Aviso «Reloj de demostración: la hora está fijada en el miércoles 04/11/2026 a las 12:00 y no avanza.»; ningún hueco reservable antes de las 12:00 | H5-E5 |
| 11 | En una cita cuyo paciente no tiene correo, pulsa «Añadir correo», escribe uno mal, y después uno bien | Primero el mensaje de correo no válido, conservando lo escrito; después vuelve a la agenda y la cita ofrece «Cambiar correo» | H2-E6 |
| 12 | En esa misma cita, pulsa «Cambiar correo», deja el campo en blanco y guarda | La cita vuelve a ofrecer «Añadir correo»; la cita, el nombre y el teléfono no cambian | FR-041 |
| 13 | Cancela otra vez una cita ya cancelada, abriendo su confirmación en dos pestañas | La segunda responde «Esta cita ya está cancelada y no se puede cambiar.» | H3-E5, FR-038 |

Las cancelaciones del paciente (H6-E1 a H6-E6, H6-E8 y H6-E9) no tienen pantalla en la 001: se prueban como regla con la [operación de cancelar](contracts/operacion-cancelar.md), y la 002 y la 003 las prueban en sus pantallas.

## Verificación de la semilla

1. Ejecuta `npm run semilla` dos veces: los dos resúmenes de contenido coinciden entre sí y con FR-030 (SC-005).
2. Ejecuta `npm run semilla -- --lunes 2026-11-09`: cambia el resumen de contenido, pero no el resumen sin fechas, que sigue siendo el de FR-030 (FR-032).
3. Comprueba en la salida las cifras de FR-030: 463 citas de historia (380, 46 y 37) y 57 reservas futuras.
