# Lista de entrega: Panel de analítica

**Feature**: [spec.md](../spec.md) | **Guía**: [quickstart.md](../quickstart.md)

Esta lista se completa antes de integrar la feature en `master`. Las mediciones con personas no las puede hacer un agente: quedan sin rellenar hasta que se hagan las sesiones.

## Protocolo de SC-006 (prueba manual con personas)

Justificación escrita del principio VI, recogida en la spec: SC-006 mide el uso real de personas sin formación, y un test automático no puede medirlo.

### Preparación

- [ ] Datos cargados con `npm run semilla -- --lunes <lunes de la semana en curso>` y aplicación arrancada con `npm start`, sin `CITACLARA_AHORA`. Así el panel enseña las 8 semanas de historia completas (caso límite «Demostración en otra fecha»).
- [ ] Al menos **10 personas** sin formación previa en CitaClara y sin manual, para que «9 de cada 10» se pueda medir.
- [ ] Portátil y cronómetro preparados. Una sola persona observa cada sesión, y no ayuda ni da pistas.
- [ ] Antes de cada persona se entra con la clave de la clínica y se deja a la vista la agenda de hoy, no el panel.

### Tareas

Se leen en este orden y con estas palabras. El cronómetro empieza al terminar de leer cada tarea.

1. **Ingresos de un servicio**: «¿Cuánto ha ingresado la clínica por la consulta de nutrición en estas 8 semanas?» Respuesta correcta: 2.870,00 €.
2. **Tasa de un profesional**: «¿Qué tasa de no asistencia tiene Lucía?» Respuesta correcta: 13,7 %.

### Criterio

- Una tarea tiene éxito si la persona da la respuesta correcta en menos de 1 minuto, solo con lo que ve en pantalla.
- SC-006 se cumple si al menos 9 de cada 10 personas tienen éxito en **las dos** tareas.

### Resultados

| Persona | Tarea 1 (s) | ¿Correcta? | Tarea 2 (s) | ¿Correcta? | Observaciones |
|---------|-------------|------------|-------------|------------|---------------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

- [ ] SC-006: al menos 9 de cada 10 personas con éxito en las dos tareas.

## Puertas de entrega

- [x] Spec aprobada por su propietario (12/11/2026, `specs/MAPA.md`).
- [x] `npm test` (490) y `npm run test:e2e` (76) en verde el 12/11/2026, con `tests/unit/trazabilidad-004.test.js` sin pendientes y el test de trazabilidad de la 001 sin cambios.
- [x] Cifras de referencia reproducidas con `npm run semilla` y `CITACLARA_AHORA=2026-11-04T12:00` (quickstart, paso 2).
- [x] Escenarios 2 a 6 de [quickstart.md](../quickstart.md) validados a mano el 12/11/2026 con `npm run semilla` y `npm start`:
  - Paso 2: «Del 07/09/2026 al 01/11/2026», aviso del reloj, y 15.380,00 € como total del periodo y de las 8 semanas.
  - Paso 3: «Del 14/09/2026 al 08/11/2026» y «Hay 31 citas sin cerrar».
  - Paso 4: con el lunes 04/01/2027, «Del 09/11/2026 al 03/01/2027» y 15.380,00 €.
  - Paso 5: tras 10 aperturas, el volcado de la base solo cambia en la tabla `sesion`, por el acceso.
  - Paso 6: sin sesión, `GET` da 303 a `/acceso` y `POST` da 401; con sesión, `POST` da 404.
- [x] Ninguna modificación del esquema, de la semilla ni de `src/datos/bd.js` (FR-018).
- [ ] FR-039 de la 001 cumplida antes de usar el panel con datos reales (supuesto «Misma clave, mismas cifras»). No bloquea la integración, sí el uso con datos reales.
