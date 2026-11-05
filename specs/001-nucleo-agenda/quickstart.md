# Guía de validación: Núcleo de agenda

**Feature**: [spec.md](spec.md) | **Contratos**: [interfaz web](contracts/interfaz-web.md), [semilla](contracts/semilla.md)

Esta guía demuestra de punta a punta que la feature funciona, una vez implementada.

## Requisitos previos

- Node 26 o superior.
- `npm install` en la raíz del repositorio.
- `npx playwright install chromium`, solo para las pruebas de interfaz.

## Puesta en marcha

```text
npm run semilla -- --lunes <lunes de la semana en curso>
npm start
```

Abre `http://localhost:3000` y entra con la clave `eleva-demo`.

Usa el lunes de la semana en curso para tener reservas hoy. Las reservas de los días ya pasados de esa semana aparecerán sin cerrar, lo que sirve para probar los cierres.

## Pruebas automáticas

```text
npm test            # dominio, servicios, rutas y concurrencia
npm run test:e2e    # interfaz en navegador real
```

**Resultado esperado**: todo en verde. Cada test cita en su nombre la regla o el criterio que comprueba, por ejemplo `RN1`, `FR-025` o `SC-001` (principio VI).

## Escenarios manuales

| # | Pasos | Resultado esperado | Referencia |
|---|-------|--------------------|------------|
| 1 | Abre la aplicación sin sesión | Pide la clave; una clave incorrecta muestra el mensaje y ningún dato | Historia 4 |
| 2 | Abre la agenda de María, y cambia a Jorge y a otro día | Citas y huecos del día elegido, con la hora local indicada | Historia 2 |
| 3 | Pulsa un hueco libre y reserva una sesión de fisioterapia | La cita aparece con fin 45 minutos después | Historia 1 |
| 4 | Abre el alta en dos pestañas para el mismo hueco y confirma ambas | La segunda se rechaza diciendo qué cita lo impide, y muestra los huecos actuales | RN1 |
| 5 | Intenta reservar hoy a una hora pasada | Rechazo con el mensaje de RN2 | RN2 |
| 6 | Reserva con un paciente nuevo, solo con nombre y teléfono | Quedan creadas la ficha y la cita | FR-013 |
| 7 | Cancela una cita futura y reserva otra en su tramo | Se ven las dos sin confundirlas | Historia 3 |
| 8 | Marca una cita pasada como no asistida y prueba a cambiarla | Pide confirmación; después queda definitiva | RN4 |
| 9 | Abre la agenda en un móvil de 360 píxeles de ancho | Se maneja sin desplazamiento horizontal | FR-028 |

## Verificación de la semilla

1. Ejecuta `npm run semilla` dos veces: los dos resúmenes de contenido coinciden (SC-005).
2. Ejecuta `npm run semilla -- --lunes 2026-11-09`: cambia el resumen de contenido, pero no el resumen sin fechas (FR-032).
3. Comprueba en la salida que las no asistidas están entre el 9 % y el 11 %, y las canceladas entre el 7 % y el 9 % (FR-030).
