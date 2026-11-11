# Guía de validación: Portal del paciente

**Feature**: [spec.md](spec.md) | **Contratos**: [portal web](contracts/portal-web.md), [modelo de acceso](contracts/modelo-acceso.md) | **Datos**: [modelo de datos](data-model.md)

Esta guía demuestra de punta a punta que la feature funciona, una vez implementada. Usa los datos y el reloj de [Datos de los ejemplos](spec.md#datos-de-los-ejemplos) de la spec.

## Requisitos previos

- La rama rebasada sobre `master`, con la implementación de los dos cambios de la 001 ([plan.md](plan.md#base-de-partida)).
- Node 26 o superior, y `npm install`.
- `npx playwright install chromium`, solo para las pruebas de interfaz.
- Si existe `datos/citaclara.db` de una versión anterior, el servidor pedirá borrarlo: el esquema pasa a la versión 3.

## Puesta en marcha

```text
npm run semilla

# Git Bash
CITACLARA_AHORA=2026-11-04T12:00 npm start

# PowerShell
$env:CITACLARA_AHORA = '2026-11-04T12:00'; npm start
```

La semilla usa el lunes por defecto (02/11/2026). Para probar desde un móvil de la misma red, arranca también con `CITACLARA_DIRECCION=http://<IP del ordenador>:3000`, para que los enlaces copiados apunten ahí.

El enlace de demostración de David Gil, el primer paciente, es `http://localhost:3000/e/c73f5e835397826416bda7b3e5323d02` (FR-029 de la 001). Es ficticio y público. Los demás se copian desde la agenda (escenario 1).

## Pruebas automáticas

```text
npm test            # dominio, servicios, rutas, concurrencia y trazabilidad de la 001 y la 002
npm run test:e2e    # interfaz en navegador real, a 360 píxeles y en portátil
```

**Resultado esperado**: todo en verde. Los tests de esta feature empiezan por `RP1` a `RP7` o por `002/` (`002/H3-E7`, `002/FR-025`, `002/SC-005`…), y `tests/unit/trazabilidad-002.test.js` falla si falta alguno de los de la spec.

## Escenarios manuales

| # | Pasos | Resultado esperado | Referencia |
|---|-------|--------------------|------------|
| 1 | Entra en recepción con `eleva-demo`, abre la agenda de María del 05/11/2026, pulsa «Enlace del paciente» en una cita de Isabel Navarro y luego «Copiar enlace» | Se copia un enlace `…/e/<32 caracteres>` sin dar de alta nada | 002/H1-E1, SC-001 |
| 2 | Abre ese enlace en una ventana privada a 360 píxeles de ancho | Entras en «Tus citas» de Isabel Navarro sin escribir nada. La próxima cita y su botón se ven sin desplazarte | 002/H1-E2, H2-E6, FR-022 |
| 3 | Abre el enlace de David Gil | «Próximas citas»: lun 09/11/2026 18:00–18:45 con María y 19:00–19:30 con Lucía. En el historial, 11 citas, y la del 02/11/2026 a las 15:15 como «Pendiente de confirmar por la clínica», sin «Cancelar» | 002/H2-E1 a H2-E3 |
| 4 | Como David Gil, cancela la de las 18:00: primero di «No», luego «Sí» | Con «No» nada cambia. Con «Sí», «Cita cancelada» y el teléfono. En el historial, «Cancelada por el paciente el 04/11/2026 a las 12:00». La de las 19:00 sigue reservada | 002/H3-E1 a H3-E3 |
| 5 | En recepción, abre la agenda de cualquier día | En «Huecos liberados por pacientes» aparece «lun 09/11/2026, 18:00–18:45, María». Al pulsarlo, vas a esa agenda, con la cita marcada como cancelada por el paciente | 002/H4-E5, H4-E6 |
| 6 | Reserva una cita en ese tramo y vuelve a la agenda | El hueco ya no está en la lista, y se ven la cancelada y la nueva sin confundirlas | 002/H4-E2, H4-E7 |
| 7 | Copia desde la agenda de Jorge del 04/11/2026 el enlace de Javier Peña, y ábrelo | Su cita de las 12:15 no ofrece cancelar: «se podía hasta el … a las 10:15», con el teléfono | 002/H3-E4 |
| 8 | Abre `http://localhost:3000/e/` seguido de 32 ceros, y después una ruta cualquiera tras `/e/` | Las dos dan exactamente la misma página «Este enlace no funciona» | 002/H1-E3, FR-003 |
| 9 | Abre once enlaces no válidos seguidos, y después uno válido | Del undécimo en adelante aparece «Demasiados intentos», y el enlace válido tampoco entra hasta que pasen 15 minutos | 002/H1-E4, FR-004 |
| 10 | En recepción, anula el enlace de David Gil desde una de sus citas, y recarga su portal en la otra ventana | La sesión abierta se cierra, el enlace anterior da «Este enlace no funciona» y el nuevo entra | 002/H1-E5, RP7 |
| 11 | Con la sesión de paciente abierta, abre `/agenda` en la misma ventana | Pide la clave de la clínica, como sin sesión. Salir del portal no cierra la sesión de recepción | 002/H1-E8, FR-005 |
| 12 | Abre el portal en un móvil con otra zona horaria, o con la del navegador cambiada | Las horas son las mismas que en el ordenador de recepción, con «Horas en hora peninsular» | 002/SC-007, FR-010 |

## Comprobaciones con personas

SC-002, SC-003, SC-008 y SC-009 se miden con pacientes reales o en la puesta en marcha, no con tests automáticos (SC-010). Su protocolo está en `checklists/entrega.md` de esta feature, que se crea con las tareas.
