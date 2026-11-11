# Lista de entrega: Portal del paciente

**Feature**: [spec.md](../spec.md) | **Guía**: [quickstart.md](../quickstart.md)

Esta lista se completa antes de integrar la feature. Las mediciones con personas no las puede hacer un agente: quedan sin rellenar hasta que se hagan las sesiones o pasen las 8 semanas.

Justificación escrita del principio VI (SC-010): SC-002, SC-003, SC-008 y SC-009 miden el uso real de personas, y un test automático no puede medirlo.

## Protocolo de SC-002 y SC-003 (prueba manual con personas)

### Preparación

- [ ] Datos cargados con `npm run semilla`, con el lunes por defecto (02/11/2026), y aplicación arrancada con `CITACLARA_AHORA=2026-11-04T12:00` y `CITACLARA_DIRECCION=http://<IP del ordenador>:3000`, para que el móvil llegue al servidor.
- [ ] Al menos **10 personas** sin instrucciones previas sobre el portal, para que «9 de cada 10» se pueda medir.
- [ ] Un móvil por sesión, con el navegador en una ventana privada, y un cronómetro. Una sola persona observa cada sesión, y no ayuda ni da pistas.
- [ ] Antes de cada persona se repite la carga de datos, que cierra las sesiones y deshace las cancelaciones. El observador copia desde la agenda el enlace de un paciente de la semilla con alguna cita cancelable (por ejemplo, David Gil o Isabel Navarro) y lo deja abierto en el móvil, sin cargar todavía.

### Tareas

Se leen en este orden y con estas palabras:

1. **Localizar la próxima cita**: «Esta es la página de tus citas en la clínica. Dime qué día y a qué hora es tu próxima cita.»
2. **Cancelar una cita**: «No vas a poder ir a esa cita. Cancélala.»

### SC-002: localizar la próxima cita en menos de 1 minuto

- **Qué se mide**: desde que se abre el enlace en el móvil hasta que la persona dice el día y la hora correctos de la próxima cita, en la tarea 1.
- **Cronómetro**: empieza al abrir el enlace y para cuando la persona dice la respuesta correcta.
- **Umbral**: al menos 9 de cada 10 personas tardan menos de 60 segundos.

### SC-003: cancelar una cita a la primera, en menos de 30 segundos

- **Qué se mide**: si la persona cancela la cita a la primera, sin ayuda y sin volver atrás, y cuánto tarda desde que ve su página hasta que ve «Cita cancelada», en la tarea 2.
- **Cronómetro**: empieza al terminar de leer la tarea 2 y para cuando se ve «Cita cancelada».
- **Umbral**: al menos 9 de cada 10 personas la cancelan a la primera y en menos de 30 segundos.

### Resultados

| Persona | Paciente de la semilla | Tarea 1 (segundos) | Tarea 2 a la primera | Tarea 2 (segundos) | Observaciones |
|---------|------------------------|--------------------|----------------------|--------------------|---------------|
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

- [ ] **SC-002** medido y cumplido. Fecha: ____ · Responsable: ____ · Resultado: ____
- [ ] **SC-003** medido y cumplido. Fecha: ____ · Responsable: ____ · Resultado: ____

## Protocolo de SC-008 y SC-009 (medición en la puesta en marcha)

Solo se puede medir en una clínica real, y por tanto después de cumplir FR-039 de la 001 (002/FR-006).

### Semana de referencia (antes de la puesta en marcha)

- [ ] Recepción anota durante una semana laborable completa, antes de dar ningún enlace a los pacientes:
  - cada llamada de un paciente para **consultar** una cita, y cada una para **cancelar**;
  - cada cancelación registrada, con su canal (todas serán de recepción).
- [ ] Se guarda la hoja con la fecha de la semana y el total de llamadas de consulta y cancelación.

### Medición a las 8 semanas

- [ ] Recepción vuelve a anotar las mismas llamadas durante una semana laborable completa, 8 semanas después de la puesta en marcha.
- [ ] Se cuentan las cancelaciones de esas 8 semanas por origen (`portal`, `correo` y `recepcion`), con una consulta a la base.

### SC-008: al menos el 50 % de las cancelaciones, desde el portal

- **Qué se mide**: cancelaciones con origen `portal`, divididas por el total de cancelaciones de las 8 semanas.
- **Umbral**: al menos el 50 %.

### SC-009: las llamadas bajan al menos un 50 %

- **Qué se mide**: llamadas de consulta y cancelación de la semana a las 8 semanas, frente a las de la semana de referencia.
- **Umbral**: como mucho la mitad de las de la semana de referencia.

- [ ] **SC-008** medido y cumplido. Fecha: ____ · Responsable: ____ · Resultado: ____
- [ ] **SC-009** medido y cumplido. Fecha: ____ · Responsable: ____ · Resultado: ____

## Escenarios manuales de quickstart.md (T060)

Se recorren los 12 escenarios de [quickstart.md](../quickstart.md#escenarios-manuales) con `CITACLARA_AHORA=2026-11-04T12:00`.

| # | Resultado | Observaciones |
|---|-----------|---------------|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |

## Puertas de integración

- [ ] **VI. Tests**: `npm test` y `npm run test:e2e` en verde, sin tests desactivados ni relajados (T059).
- [ ] **III. Solape**: `tests/concurrencia/hueco-liberado.test.js` sin ningún solape en 1.000 rondas (T052, SC-005).
- [ ] **SC-010**: `tests/unit/trazabilidad-002.test.js` en verde (T057).

## Uso con datos reales (002/FR-006)

- [ ] **FR-039 de la 001 no se cumple**: el portal **solo se usa con los datos de la semilla**. Esta casilla la marca el responsable de FR-039 cuando se cumpla, no quien integre esta feature.
