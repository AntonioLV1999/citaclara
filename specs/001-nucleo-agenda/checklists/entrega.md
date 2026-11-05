# Lista de entrega: Núcleo de agenda

**Feature**: [spec.md](../spec.md) | **Guía**: [quickstart.md](../quickstart.md)

Esta lista se completa antes de integrar la feature. Las mediciones con personas no las puede hacer un agente: quedan sin rellenar hasta que se hagan las sesiones.

## Protocolo de SC-002 y SC-003 (prueba manual con personas)

Justificación escrita del principio VI: estos criterios miden el uso real sin formación, y un test automático no puede medirlo.

### Preparación

- [ ] Datos cargados con `npm run semilla -- --lunes <lunes de la semana en curso>`, y aplicación arrancada con `npm start`.
- [ ] Al menos **10 personas** sin formación previa en CitaClara y sin manual, para que «9 de cada 10» se pueda medir.
- [ ] Portátil y cronómetro preparados. Una sola persona observa cada sesión, y no ayuda ni da pistas.
- [ ] Antes de cada persona se repite la carga de datos, que cierra la sesión. Después se entra con la clave y se deja a la vista la agenda de hoy.

### Tareas

Se leen en este orden y con estas palabras:

1. **Encontrar un hueco**: «Un paciente llama y quiere hora con Jorge para el próximo día laborable por la tarde. Dime qué hueco le puedes dar.»
2. **Reservar**: «Reserva esa hora a un paciente que ya tiene ficha, con una sesión de fisioterapia.» El observador elige un paciente de la semilla y dice su nombre.
3. **Cancelar**: «El paciente llama de nuevo y anula esa cita. Cancélala.»

### SC-002: registrar una cita en menos de 1 minuto

- **Qué se mide**: desde que la persona ve la agenda hasta que la cita aparece en ella, en la tarea 2.
- **Cronómetro**: empieza al terminar de leer la tarea y para cuando la cita se ve en la agenda.
- **Umbral**: menos de 60 segundos.

### SC-003: tareas habituales a la primera

- **Qué se mide**: si la persona completa las tres tareas a la primera, sin ayuda y sin deshacer ni repetir ninguna.
- **Umbral**: al menos 9 de cada 10 personas completan las tres.

### Resultados

| Persona | Tarea 1 a la primera | Tarea 2 a la primera | Tarea 2 (segundos) | Tarea 3 a la primera | Observaciones |
|---------|----------------------|----------------------|--------------------|----------------------|---------------|
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

- [ ] SC-002 medido y cumplido.
- [ ] SC-003 medido y cumplido.

## Puertas de calidad de la constitución

- [x] **I. Spec primero**: el propietario ha aprobado la spec, y `specs/MAPA.md` lo refleja.
- [ ] **II. Números**: los importes, las fechas y las horas cumplen las reglas de presentación.
- [ ] **III. Solape**: `npm test` incluye las pruebas de reservas simultáneas, y ninguna ha detectado un solape.
- [ ] **IV. Simplicidad**: ninguna funcionalidad ni dependencia sin justificar en una spec.
- [ ] **V. Datos reproducibles**: las cifras de FR-030 coinciden con la salida de `npm run semilla`.
- [ ] **VI. Tests**: `npm test` y `npm run test:e2e` en verde, sin tests desactivados ni relajados.
- [ ] **VII y VIII. Interfaz e idioma**: lo que ve la persona usuaria está en español de España, sin jerga técnica y con los umbrales de FR-028.
