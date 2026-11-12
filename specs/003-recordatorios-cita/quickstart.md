# Guía rápida de validación: Recordatorios de cita

**Feature**: [spec.md](spec.md) | **Contratos**: [proceso](contracts/proceso-recordatorios.md), [correo](contracts/correo-recordatorio.md), [pantalla](contracts/pantalla-cancelar.md)

Recorrido de demostración con la semilla por defecto. Las cifras salen de FR-022 y se comprobaron el 11/11/2026 con el generador de la semilla.

## Requisitos previos

- Node 26 o posterior, y `npm install` hecho.
- El modelo común de acceso de la 002 en `master` ([research.md §1](research.md#1-qué-pone-la-003-y-qué-hereda-de-la-002-rr6-d2)).
- Sin `CITACLARA_SMTP` en el entorno, salvo en el paso 6.

Los ejemplos usan Git Bash. En PowerShell, `CITACLARA_AHORA=… npm …` se escribe `$env:CITACLARA_AHORA = '…'; npm …`.

## 1. Datos limpios

```text
rm -rf datos
npm run semilla
```

## 2. Recordar las citas del 03/11/2026 (HU1, HU3, FR-022)

```text
CITACLARA_AHORA=2026-11-02T08:00 npm run recordatorios
```

Esperado:

- Una línea de resumen: «02/11/2026 08:00 (hora peninsular) · Clínica Eleva · citas del martes 03/11/2026: 4 enviados, 1 sin correo, 0 fallidos». La misma línea al final de `datos/recordatorios.log`.
- Cuatro ficheros `.eml` en `datos/salida-correo/`, para Paula Gómez (12:00), Javier Navarro (16:00), Luis Delgado (17:15) y Óscar Domínguez (17:30). Ninguno para Nuria Delgado (19:15), que no tiene correo.
- Al abrir uno con un programa de correo: destinatario, asunto, los datos de la cita, «Horas en hora peninsular» y el enlace, como en [correo-recordatorio.md](contracts/correo-recordatorio.md).

## 3. Sin duplicados (RR1, HU1-E2)

Repetir el paso 2, una vez seguida y otra con `CITACLARA_AHORA=2026-11-03T08:00`.

Esperado: «0 enviados» en la primera, y sigue habiendo cuatro ficheros del 03/11/2026. La segunda recuerda las citas del 04/11/2026, no las del 03/11/2026.

## 4. Cancelar desde el correo (HU2, HU4)

```text
CITACLARA_AHORA=2026-11-02T08:00 npm start
```

1. Copiar el enlace del fichero de Paula Gómez y abrirlo en un navegador, sin entrar en la agenda. Esperado: «Cancelar tu cita» con Clínica Eleva, María, Sesión de fisioterapia, martes 03/11/2026, 12:00, y el aviso de que no se puede deshacer. La cita sigue reservada.
2. Pulsar «Sí, cancelar la cita». Esperado: «Cita cancelada».
3. Volver a abrir el mismo enlace. Esperado: «Esta cita ya está cancelada», sin botones.
4. Entrar en la agenda con `eleva-demo` y abrir la de María del 03/11/2026. Esperado: la cita de las 12:00 aparece como «Cancelada por el paciente el 02/11/2026 a las 08:00», y su tramo está libre y se puede reservar.
5. Con las herramientas del navegador a 360 píxeles de ancho, repetir el punto 1 con otro enlace: sin desplazamiento horizontal.

## 5. Fuera de plazo y caducado (HU2-E5, HU2-E6, RR6)

Parar el servidor y arrancarlo con `CITACLARA_AHORA=2026-11-03T14:01`.

1. Abrir el enlace de Javier Navarro (16:00). Esperado: «Ya no se puede cancelar desde aquí», con el límite del martes 03/11/2026 a las 14:00 y el teléfono 000 200 000 como enlace de llamada. La cita no cambia.
2. Abrir el enlace de Paula Gómez (12:00, ya empezada). Esperado: «Este enlace no funciona», la misma respuesta que un enlace inventado.
3. Cambiar un carácter de cualquier enlace y abrirlo. Esperado: la misma respuesta.

## 6. Servidor de correo configurado (HU3-E4, FR-018)

```text
rm -rf datos && npm run semilla
CITACLARA_SMTP=smtp://correo.example.com:587 CITACLARA_AHORA=2026-11-02T08:00 npm run recordatorios
```

Esperado: los mismos cuatro ficheros que en el paso 2, el aviso de que el envío real está desactivado y ninguna conexión de red.

## 7. Suite

```text
npm test
npm run test:e2e
```

Esperado: todo en verde, incluidos `tests/unit/trazabilidad.test.js` (la 001) y `tests/unit/trazabilidad-003.test.js`. SC-001 y SC-005 se miden a mano con la clínica piloto, según `checklists/entrega.md`.
