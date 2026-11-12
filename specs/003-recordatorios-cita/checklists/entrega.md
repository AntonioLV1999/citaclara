# Lista de entrega: Recordatorios de cita

**Feature**: [spec.md](../spec.md) | **Guía**: [quickstart.md](../quickstart.md)

Esta lista se completa antes de integrar la feature. Las mediciones con personas y con la clínica piloto no las puede hacer un agente: quedan sin rellenar hasta que se hagan.

## Protocolo de SC-005 (prueba manual con personas)

Justificación escrita del principio VI (SC-007 de la spec): este criterio mide el uso real de un paciente sin ayuda, y un test automático no puede medirlo.

### Preparación

- [ ] Datos limpios: `rm -rf datos` y `npm run semilla`.
- [ ] Recordatorios generados con `CITACLARA_AHORA=2026-11-02T08:00 npm run recordatorios`, y aplicación arrancada con el mismo momento: `CITACLARA_AHORA=2026-11-02T08:00 npm start`. Así los enlaces de los ficheros de `datos/salida-correo/` funcionan.
- [ ] Al menos **10 personas** que no conozcan CitaClara, para que «9 de cada 10» se pueda medir. Al menos la mitad lo hacen desde un **móvil** (360 píxeles de ancho o más).
- [ ] Cada persona recibe un recordatorio distinto, abierto en un programa de correo, o en el móvil reenviado a su propio correo. Si se acaban los cuatro de la semilla, se repite la preparación.
- [ ] Una sola persona observa cada sesión, con cronómetro, y no ayuda ni da pistas.

### Tarea

Se lee con estas palabras: «Has recibido este correo de tu clínica. No vas a poder ir a la cita. Haz lo que harías.»

### SC-005: cancelar desde el correo en menos de 1 minuto

- **Qué se mide**: si la persona cancela la cita sin ayuda, y cuánto tarda.
- **Cronómetro**: empieza al terminar de leer la tarea y para cuando se ve «Cita cancelada».
- **Umbral**: al menos 9 de cada 10 personas cancelan sin ayuda en menos de 60 segundos, también las que lo hacen desde el móvil.
- **Comprobación**: después de cada sesión, la cita aparece en la agenda como «Cancelada por el paciente».

### Resultados de SC-005

| Persona | Dispositivo | Sin ayuda | Segundos | Observaciones |
|---------|-------------|-----------|----------|---------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |
| 9 | | | | |
| 10 | | | | |

- [ ] **SC-005** medido y cumplido.

## Protocolo de SC-001 (medición con la clínica piloto)

Justificación escrita del principio VI: mide el efecto del producto en una clínica real durante 3 meses, y solo se puede comprobar con datos reales, después de cumplirse FR-039 de la 001.

### SC-001: menos no asistencia sin menos ocupación

- **Cifras de partida** (supuesto «Objetivo del 30 %» de la spec): la clínica aporta, de los 3 meses anteriores al inicio del uso:
  - [ ] la tasa de no asistencia, con la fórmula de RA3 de la 004: no asistidas ÷ (completadas + no asistidas);
  - [ ] la ocupación, con RA4 de la 004 y la capacidad del horario de FR-012 de la 001.
- **Periodo**: los 3 primeros meses de uso con recordatorios reales. No sirve el primer mes como referencia, porque ya tiene recordatorios.
- **Umbral**: se cumplen a la vez las dos condiciones:
  - la tasa de no asistencia del periodo baja al menos un 30 % respecto a la de partida (con la semilla, de 10,8 % a 7,6 %);
  - la ocupación del periodo no baja respecto a la de partida.
- **Informe**: además, cuántas cancelaciones del periodo tienen origen «correo» y cuántas «portal» (FR-036 de la 001).

### Resultados de SC-001

| Cifra | Partida | Periodo | Cumple |
|-------|---------|---------|--------|
| Tasa de no asistencia (RA3) | | | |
| Ocupación (RA4) | | | |
| Cancelaciones con origen «correo» | — | | — |
| Cancelaciones con origen «portal» | — | | — |

- [ ] **SC-001** medido y cumplido.

## Puertas de calidad de la constitución

- [x] **I. Spec primero**: el propietario aprobó la spec el 12/11/2026, antes de implementar, y `specs/MAPA.md` lo refleja. Los cambios en código y tests de la 001 y la 002 son los que sus contratos prevén para la 003.
- [x] **II. Números**: fechas `dd/mm/aaaa`, 24 horas y hora local de la clínica, con la zona indicada en el correo, en la pantalla y en el resumen (FR-008). Sin importes.
- [x] **III. Solape**: `tests/concurrencia/cancelar-correo.test.js` reserva el tramo a la vez que se cancela desde el correo, 1.000 rondas, sin ningún solape (FR-024).
- [x] **IV. Simplicidad**: ninguna dependencia nueva. Sin envío real hasta FR-039.
- [x] **V. Datos reproducibles**: con la semilla por defecto y `2026-11-02T08:00`, el resumen es «4 enviados, 1 sin correo, 0 fallidos» (FR-022), y las cifras de FR-030 de la 001 no cambian.
- [x] **VI. Tests**: `npm test` (604) y `npm run test:e2e` (94) en verde el 12/11/2026, incluidas las trazabilidades de la 001, la 002 y la 003, sin tests desactivados ni relajados.
- [x] **VII y VIII. Interfaz e idioma**: el correo, la pantalla de cancelación y el resumen, en español de España y sin jerga técnica, con los umbrales de FR-028 de la 001 en la pantalla.
- [x] **RR1 en 1.000 rondas (SC-003)**: `tests/concurrencia/recordatorios.test.js` termina cada ronda con un recordatorio y un fichero por cita, con al menos dos procesos que envían.
- [x] **365 días (SC-004)**: `tests/integracion/recordatorios-365-dias.test.js`, en la península y en Canarias.
- [x] **Guía rápida**: [quickstart.md](../quickstart.md) recorrida de principio a fin.

## Uso con datos reales (FR-039 de la 001)

- [ ] **FR-039 no se cumple**: el producto **solo se usa con los datos de la semilla**, y los recordatorios **solo se escriben como ficheros** (FR-018). Esta casilla la marca el responsable (AntonioLV1999) cuando escriba la fecha de comprobación en FR-039, no quien integre esta feature.

## Pendiente de personas

- SC-005 sigue pendiente: las sesiones con al menos 10 personas del protocolo de arriba no se han hecho.
- SC-001 sigue pendiente: necesita las cifras de partida de la clínica y 3 meses de uso con datos reales, después de FR-039.
