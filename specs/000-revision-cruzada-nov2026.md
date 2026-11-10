# Revisión cruzada de specs: solapamientos entre 001, 002, 003 y 004

**Fecha**: 10/11/2026 (segunda pasada; la primera es del 09/11/2026)

**Para**: propietarios de las specs (AntonioLV1999: 001, 003 y 004; Sara: 002)

**Motivo**: constitución, «Cuando dos specs entren en conflicto, sus propietarios lo resuelven antes de seguir, y la decisión queda escrita en las specs afectadas».

Este informe no modifica ninguna spec. Las resoluciones son propuestas, y cada propietario decide sobre la suya. Los identificadores S-01 a S-17 se mantienen de la primera pasada, para que las specs que ya los citan sigan siendo válidas. Los hallazgos nuevos siguen la numeración desde S-18.

## Versiones analizadas

Cada spec se ha leído con `git show REF:RUTA`, desde la punta de su rama y sin checkout. Ninguna de las ramas tiene cambios sin commitear.

| Spec | Rama | Commit anterior | Commit actual | Estado declarado | Propietario |
|------|------|-----------------|---------------|------------------|-------------|
| 001 Núcleo de agenda | `master` | `110b41c` | `ff243b6` | Aprobada; cambio del 10/11 **pendiente de aprobación** | AntonioLV1999 |
| 002 Portal del paciente | `002-portal-paciente` | `2ce3736` | `4893c7b` | Borrador | Sara |
| 003 Recordatorios de cita | `003-recordatorios-cita` | `db9bbc6` | `7908c87` | Borrador | AntonioLV1999 |
| 004 Panel de analítica | `004-panel-analitica` | `36242b6` | `ae4025c` | Borrador | AntonioLV1999 |

Las tres ramas de feature siguen partiendo de `110b41c`, no de `ff243b6` (ver S-19). Ninguna tiene aún cambios fuera de `specs/`, así que todos los choques se pueden evitar antes de implementar. Las referencias a código son del tronco.

## Resumen

Desde el 09/11 se han tomado **D1** (plazo de 2 horas) y **D2** (dos credenciales), y las cuatro specs han aplicado los cuatro bloqueantes. **S-01 a S-04 y S-10 quedan resueltos en las specs**, a falta de que se apruebe el cambio de la 001. S-11 queda a medias.

Quedan **17 abiertos**: 1 bloqueante, 4 altos, 8 medios y 4 bajos. De ellos, 5 son nuevos y casi todos los ha traído la propia resolución. Lo más urgente:

1. **El cambio de la 001 no se puede aprobar tal como está escrito** (S-18): la aprobación espera a unos resúmenes que solo se obtienen implementando, y no se implementa sin aprobar. Mientras tanto, la suite de `master` está en rojo.
2. **Las ramas 002, 003 y 004 citan reglas que no existen en su base** (S-19): RN8, FR-036, FR-037 y HU6 solo están en `ff243b6`.
3. **Nadie fija cuánto vive un enlace de cancelación** (S-20): la 002 se lo delega a la 003, y la 003 ya no lo dice.
4. **Siguen abiertos los cuatro altos de la primera pasada** (S-05 a S-08), que ninguna spec ha tocado.

El hallazgo colateral sigue igual: **`src/datos/` no está en git** ([ver abajo](#hallazgo-colateral-el-esquema-no-está-versionado)).

### Estado de los hallazgos

| # | Hallazgo | Gravedad | Estado al 10/11 |
|---|----------|----------|-----------------|
| S-01 | Plazo de cancelación del paciente | Bloqueante | **Resuelto** (RN8 de la 001, D1) |
| S-02 | Quién canceló | Bloqueante | **Resuelto** (FR-036 y FR-027 de la 001) |
| S-03 | Resúmenes de la semilla | Bloqueante | **Resuelto en las specs**; deja abierto S-18 |
| S-04 | Acceso del paciente | Bloqueante | **Resuelto** (RP6, RP7 de la 002; FR-001, FR-037 de la 001); deja abiertos S-20 y S-21 |
| S-05 | Operación de cancelar | Alto | Abierto |
| S-06 | Tasa de no asistencia | Alto | Abierto |
| S-07 | «Cancelada» cambia de significado | Alto | Abierto, agravado |
| S-08 | Uso con datos reales | Alto | Abierto |
| S-09 | Ocupación | Medio | Abierto |
| S-10 | Lista de huecos liberados | Medio | **Resuelto** (002/FR-019) |
| S-11 | Teléfono de la clínica | Medio | Parcial: falta la 003 |
| S-12 | Envíos al paciente | Medio | Abierto (D3 pendiente) |
| S-13 | Ficha del paciente | Medio | Abierto |
| S-14 | Identificadores de los tests | Medio | Abierto |
| S-15 | Cita sin cerrar y etiquetas | Medio (antes bajo) | Abierto, agravado |
| S-16 | Dirección pública | Bajo | Abierto |
| S-17 | «Ahora» en la demostración | Bajo | Abierto |
| S-18 | Aprobación de la 001 y suite en rojo | **Bloqueante** | Nuevo |
| S-19 | Ramas sobre una base sin las reglas que citan | Medio | Nuevo |
| S-20 | Vigencia del enlace de cancelación | Medio | Nuevo |
| S-21 | Enlaces de demostración frente a «no adivinable» | Bajo | Nuevo |
| S-22 | Referencias cruzadas desfasadas | Bajo | Nuevo |

### Un propietario por concepto

| Concepto | Propietario | Quién deja de definirlo | Estado |
|----------|-------------|-------------------------|--------|
| Plazo de cancelación del paciente | 001 (RN8) | 002 RP3, 003 RR4 | Hecho; la 003 aún copia la cifra (S-22) |
| Operación de cancelar y su resultado | 001 | 002 RP4 y FR-017, 003 RR4 | Pendiente (S-05) |
| Origen y momento de la cancelación; etiqueta | 001 (FR-036, FR-027) | 002 FR-019, 003 FR-016 | Hecho |
| Semilla y sus resúmenes | 001 (FR-029, FR-030) | 002, 003 FR-021, 004 FR-018 | Hecho; faltan los valores (S-18) |
| Teléfono de la clínica | 001 (FR-029) | 002, 003 | Falta retirar el supuesto de la 003 (S-11) |
| Ficha del paciente: quién la modifica | 001 | 002, 003 | Pendiente (S-13) |
| Puerta de uso con datos reales | 001 | 002 FR-006, 003, 004 | Pendiente (S-08) |
| Cita sin cerrar y sus etiquetas | 001 | 002 FR-009, 004 RA6 | Pendiente (S-15) |
| «Ahora» y dirección pública del producto | 001 | 002, 003 | Pendiente (S-16, S-17) |
| Convención de identificadores de los tests | 001 | 002, 003, 004 | Pendiente (S-14) |
| Modelo de acceso del paciente | 002 (RP6, RP7, FR-003 a FR-005, FR-025, FR-026) | 003 RR6 y FR-011 | Hecho |
| Alcance y vigencia del enlace de cancelación | 003 | — | Falta la vigencia (S-20) |
| Huecos liberados por pacientes | 002 (FR-019) | 003 HU4 | Hecho |
| Envíos al paciente | 003 | 002 | Pendiente (S-12) |
| Eficacia de los recordatorios | 003 | — | Pendiente (S-07) |
| Tasa de no asistencia | 004 | 001 FR-030 (solo el nombre), 003 SC-001 | Pendiente (S-06) |
| Ocupación de un profesional | 004 | — | Pendiente (S-09) |

### Decisiones que tienen que tomar personas

| # | Decisión | Quién decide | Estado o recomendación |
|---|----------|--------------|------------------------|
| D1 | Valor único del plazo de cancelación (S-01) | Sara, con AntonioLV1999 | **Tomada**: 2 horas en todos los canales |
| D2 | ¿Dos credenciales de paciente o una? (S-04) | Sara, con AntonioLV1999 | **Tomada**: dos, con un solo modelo de acceso |
| D3 | ¿El recordatorio lleva el enlace personal del portal? (S-12) | Sara, con AntonioLV1999 | Pendiente. Se recomienda **no en esta versión** |
| D4 | Cómo se obtienen los resúmenes nuevos sin implementar antes de aprobar (S-18) | AntonioLV1999 | Pendiente. Se recomienda **calcularlos en un worktree desechable** |
| D5 | Hasta cuándo vale un enlace de cancelación (S-20) | AntonioLV1999, con Sara | Pendiente. Se recomienda **hasta el inicio de la cita** |

### Quién escribe qué

| Objeto | 001 | 002 | 003 | 004 |
|--------|-----|-----|-----|-----|
| `cita.estado`: reservada → cancelada | Recepción, sin plazo; paciente con RN8 | Paciente, portal | Paciente, correo | Lee |
| `cita`: origen y momento de la cancelación | Define (FR-036) | Escribe «portal» | Escribe «correo» | No lo usa |
| `clinica`: teléfono | Define y siembra (FR-029) | Lo muestra | Supone que no existe (S-11) | — |
| `paciente`: enlace personal | Siembra el de demostración (FR-029) | Define y gestiona | Lo usa para anular (RP7) | Excluido (FR-012) |
| Enlace de cancelación | Excepción en FR-001 | Modelo común (RP6) | Genera, alcance | — |
| `paciente`: correo | Solo en el alta | No lo edita | Depende de él | — |
| `sesion` | Recepción; aísla la de paciente (FR-037) | Sesión de paciente, aparte | Hereda la de la 002 | La de recepción |
| Recordatorio | — | — | Nuevo | — |
| Semilla y resúmenes | Propietaria | No la altera | Protege las cifras | Protege las cifras |

---

## Resueltos desde el 09/11

Se resumen para dejar constancia. Las citas completas están en el historial de cambios de cada spec.

- **S-01. Plazo de cancelación.** La 001 añade RN8: el paciente cancela por cualquier canal hasta 2 horas antes del inicio, minuto límite incluido, con el cálculo de los días de cambio de hora. RN5 deja a recepción sin plazo. La 002 (RP3, FR-015, HU3) y la 003 (RR4) ya no fijan cifra propia y citan RN8. La 002 ha recalculado sus ejemplos: 41 de las 42 citas futuras son cancelables, e Isabel Serrano puede cancelar hasta las 08:30.
- **S-02. Quién canceló.** FR-036 de la 001 define el origen («recepción», «portal», «correo») y el momento, escritos en la misma operación que cancela. FR-027 añade una única etiqueta, «Cancelada por el paciente», con fecha y hora. La 002 (FR-019) y la 003 (FR-016, HU4) solo la citan. Las 37 canceladas de la semilla nacen con origen «recepción».
- **S-03. Resúmenes de la semilla.** FR-029 de la 001 añade a la semilla el teléfono, los enlaces de demostración y el origen. FR-030 separa las cifras de citas, que no cambian y son lo que protegen las demás specs, de los resúmenes, que solo cita la 001. La 003 (FR-021) y la 004 (FR-018, «Cifras de referencia») ya protegen las cifras y no copian el hash. Los valores nuevos quedan pendientes: ver S-18.
- **S-04. Acceso del paciente.** La 002 es propietaria del modelo común (RP6): dos credenciales, no adivinables (FR-025), con respuesta uniforme (FR-003), límite de intentos (FR-004) y sesiones aparte (FR-005). RP7 hace que anular el enlace personal invalide los enlaces de cancelación de la ficha, con un escenario en cada spec (002 HU1-E6, 003 HU2-E10). FR-001 de la 001 admite una sola excepción, y FR-037 impide que una sesión de paciente abra recepción o el panel, con escenarios en la 001 (HU4-E5), la 002 (HU1-E8) y la 004 (HU5-E8).
- **S-10. Huecos liberados.** 002/FR-019 incluye en la lista toda cancelación con origen de paciente, «por cualquiera de sus canales». Los huecos del correo ya no se quedan fuera.

---

## Bloqueantes

### S-18. El cambio de la 001 no se puede aprobar, y la suite de `master` está en rojo

**Specs**: 001, y por arrastre 002 y 003.

> **[master · FR-030]** Resumen de contenido: [NEEDS CLARIFICATION: valor nuevo; solo se puede calcular generando la semilla con el teléfono, los enlaces y el origen, es decir, al implementar este cambio.

> **[master · Historial de cambios]** Este cambio queda **pendiente de aprobación** por su propietario, y no se implementa hasta entonces (principio I).

> **[master · Historial de cambios]** se calculan al implementar este cambio y se escriben en FR-030 en ese mismo commit, que sustituye los dos marcadores. La aprobación espera a ese commit, para aprobar la spec ya completa.

> **[002-portal-paciente · Cambios que se piden a la 001]** Deben estar aprobados antes de aprobar esta spec.

**Por qué chocarán**

- **En spec**: es un círculo. No se implementa sin aprobar, y no se aprueba sin los resúmenes, que solo salen de implementar. La 002 no puede aprobarse sin que se apruebe la 001, y la 003 depende del modelo de la 002.
- **En código**: el cambio está commiteado en `master`, y [trazabilidad.test.js](../tests/unit/trazabilidad.test.js) lee la spec del tronco. Hoy falla con 14 identificadores sin test: `RN8`, `H4-E5`, `H5-E4`, `H6-E1` a `H6-E8`, `SC-010`, `SC-011` y `SC-012`. Quien clone `master` hoy encuentra la suite en rojo por una spec que aún no está vigente.

**Resolución**

- **Decisión D4. Se recomienda calcular los resúmenes en un worktree desechable**: aplicar solo los datos nuevos de la semilla (FR-029), ejecutar `npm run semilla`, copiar los dos valores a FR-030 y descartar el código. No es implementar: es medir el dato que la spec necesita para estar completa. Después se aprueba la spec y se implementa de verdad, comprobando que salen los mismos valores.
- Mientras el cambio no se apruebe, conviene que el test de trazabilidad no lo exija, o que el cambio viva en una rama de la 001 y no en el tronco. Lo decide el propietario de la 001.

---

## Altos

### S-05. La operación de cancelar: tres respuestas al mismo hecho

**Specs**: 001, 002 y 003. **Sin cambios desde el 09/11**, salvo HU6-E8 de la 001, que fija que un intento fallido no toca el origen ni el momento.

> **[master · FR-020]** Recepción DEBE poder marcar una cita reservada como completada, cancelada o no asistida, según RN4 y RN5. El sistema DEBE rechazar cualquier otra transición.

> **[master · HU3, escenario 5]** **Dada** una cita completada, cancelada o no asistida, **cuando** se intenta cambiar su estado, **entonces** se rechaza con un mensaje que indica el estado en que ya está.

> **[002-portal-paciente · FR-017]** Repetir una cancelación ya hecha NO DEBE producir un error ni cambiar nada.

> **[002-portal-paciente · HU3, escenario 6]** **Dada** una cita ya cancelada por recepción mientras el paciente tenía la página abierta, **cuando** pulsa «Cancelar», **entonces** un mensaje le dice que ya está cancelada y la página se actualiza.

> **[003-recordatorios-cita · Casos límite]** **Doble pulsación al confirmar**: la cita se cancela una vez y la segunda pulsación ve el mensaje de cita ya cancelada.

> **[003-recordatorios-cita · Dependencias]** **FR-020 de la 001** reserva a recepción los cambios de estado. Debe admitir la cancelación del paciente.

**Por qué chocarán**

- **En spec**: una doble cancelación es un rechazo en la 001, un no-error en la 002 y un mensaje de «ya cancelada» en la 003. La 001 ya define el plazo del paciente (RN8) y su origen (FR-036), pero FR-020 sigue hablando solo de recepción. El cambio que pide la 003 no lo ha recogido la 001, que lo deja fuera expresamente.
- **En código**: `aplicarAccion` ([cambio-estado.js](../src/servicios/cambio-estado.js)) es la única vía, y responde con rechazo y 409 a una cita ya cancelada. Si cada feature escribe su propia cancelación, se pierde la transacción `BEGIN IMMEDIATE` que protege RN1 y RN4. Ahora además debe escribir el origen y el momento en el mismo `UPDATE` (FR-036).
- **En pruebas**: nadie prueba portal contra correo a la vez, ni qué origen queda registrado si los dos llegan juntos.

**Resolución**

- **Propietario: 001.** FR-020 admite al paciente dentro de RN8. Una sola operación de cancelar recibe el canal, aplica RN8 y FR-036 y distingue «cancelada ahora» de «ya estaba cancelada».
- 002 y 003 son llamantes y solo eligen el mensaje. Para el paciente se recomienda el comportamiento de la 002, sin error.
- Se añade una prueba de cancelación simultánea entre portal y correo que compruebe que queda un solo origen.

---

### S-06. Tasa de no asistencia: dos fórmulas y un objetivo sin fórmula

**Specs**: 001, 003 y 004. **Sin cambios desde el 09/11.**

> **[master · FR-030]** de las que entre el 9 % y el 11 % sean no asistidas, entre el 7 % y el 9 % canceladas y el resto completadas, calculado sobre el total de citas de la historia.

> **[004-panel-analitica · RA3]** la tasa es no asistidas ÷ (completadas + no asistidas). Las canceladas no cuentan, porque el paciente avisó y el hueco quedó libre.

> **[003-recordatorios-cita · SC-001]** La tasa de no asistencia de la clínica piloto baja al menos un 30 % respecto a la suya previa, medida durante los 3 primeros meses de uso.

**Por qué chocarán**: con los mismos datos, 46 ÷ 463 = 9,9 % y 46 ÷ 426 = 10,8 %. Si la clínica aporta su tasa de partida sobre el total y luego se compara con el panel, verá un **empeoramiento aparente de un 9 %** sin que haya cambiado nada. Esta es la cifra que se usará en las renovaciones.

**Resolución**

- **Propietario: 004**, con RA3 como única definición de «tasa de no asistencia».
- 001 FR-030 sigue igual, pero lo llama «porcentaje de composición de la semilla».
- 003 SC-001 cita RA3, y la tasa de partida se pide con esa fórmula. Con la semilla, un 30 % menos desde 10,8 % sería 7,6 %.

---

### S-07. «Cancelada» cambia de significado y la tasa mejora sola

**Specs**: 001, 003 y 004. **Abierto, y ahora con una contradicción más en la 004.**

> **[004-panel-analitica · RA3]** Las canceladas no cuentan, porque el paciente avisó y el hueco quedó libre.

> **[004-panel-analitica · Supuestos]** **Dependencia**: requiere la 001 (agenda, acceso, semilla y formatos). No depende de las features 002 ni 003.

> **[004-panel-analitica · HU5, escenario 8]** **Dada** una sesión de paciente, **cuando** intenta abrir el panel o sus datos por cualquier vía, **entonces** se rechaza igual que sin acceso

> **[003-recordatorios-cita · Dependencias]** **004-panel-analitica**: el origen de la cancelación (FR-016) puede interesarle; aquí solo se justifica por la agenda.

> **[master · Casos límite]** **El paciente llama para cancelar**: si recepción registra la cancelación, el origen es «recepción» y la etiqueta es «Cancelada», aunque lo pidiera el paciente.

**Por qué chocarán**

- **En spec**: «el hueco quedó libre» no se cumple en una cancelación anotada tarde. La 004 dice no depender de la 002, pero su nuevo escenario 8 prueba una sesión que solo existe con la 002.
- **En producción**: con RN8, una cancelación 2 horas antes saca la cita del numerador y del denominador. Si 10 de las 46 no asistidas de la semilla pasaran a canceladas, la tasa bajaría de 10,8 % a 8,7 %, **un 20 % menos sin una sola cita más atendida**. SC-001 de la 003 se podría cumplir solo por este cambio de clasificación. El origen de FR-036 permitiría ahora medirlo, pero ninguna spec lo usa para eso.

**Resolución**

- **Propietario: 003**, de cómo se mide su eficacia. SC-001 se acompaña de una segunda condición: que la ocupación (RA4) no baje en el mismo periodo. Opcionalmente, que se informe aparte de cuántas canceladas tienen origen de paciente.
- 004 corrige la justificación de RA3 y sustituye «No depende» por «el escenario 8 de la HU5 solo se puede probar con la 002». RA8 sigue vigente.

---

### S-08. Uso con datos reales: un canal bloqueado y otro sin bloquear

**Specs**: 001, 002, 003 y 004. **Sin cambios desde el 09/11.** La 001 lo deja fuera de su cambio, y la 002 lo mantiene como «Pendiente» en su tabla de cambios a la 001.

> **[002-portal-paciente · FR-006]** El portal NO DEBE abrirse con datos reales de pacientes mientras la conexión no vaya cifrada

> **[003-recordatorios-cita · FR-018]** Si hay un servidor de correo configurado, el sistema DEBE enviar los recordatorios a través de él.

> **[003-recordatorios-cita · Supuestos]** **Datos reales (deuda de la 001)**: la conexión sin cifrar de la 001 también afecta a los enlaces de cancelación. Enviar correo real a pacientes reales exige resolver antes esa deuda.

**Por qué chocarán**: la 002 lo hace un requisito. En la 003 es un supuesto, mientras FR-018 obliga a enviar. Basta configurar el servidor de correo para que salgan a pacientes reales enlaces sin cifrar, con el servicio de salud en el texto, aunque el portal siga bloqueado. Desde D2, esos enlaces son una credencial del mismo modelo que el portal.

**Resolución**: **propietario 001**, donde nació la deuda. Un requisito único define la puerta de uso con datos reales: conexión cifrada, revisión de protección de datos y responsable con fecha. 002 FR-006, 003 FR-018 y el supuesto de la 004 lo citan, y la 003 lo aplica como condición para el envío real.

---

## Medios

### S-09. «Ocupación» no significa lo mismo que «ocupado»

**Specs**: 001 y 004. **Sin cambios desde el 09/11.**

> **[master · FR-016]** Un hueco libre DEBE ser cualquier tramo continuo dentro del horario que no esté ocupado por una cita reservada o completada.

> **[004-panel-analitica · RA4]** Las no asistidas y las canceladas no cuentan, igual que no ocupan el hueco en la agenda (RN1 de la 001). La capacidad es de 55 horas por profesional y semana

**Por qué chocarán**: «igual que» es cierto para canceladas y no asistidas, pero en la agenda también ocupa la reservada. Con la semilla por defecto, esta semana la agenda muestra llena la del 02/11 y el panel le da un 0,0 % de ocupación. Y si otra spec cambia el horario, las 55 horas escritas como cifra quedarán desfasadas.

**Resolución**: **propietario 004** para «ocupación», y **001** para «tramo ocupado». RA4 retira el «igual que», dice expresamente que las reservadas no cuentan y deriva la capacidad de FR-012 sin copiar el número.

---

### S-11. Teléfono de la clínica: la 001 ya lo añade y la 003 sigue razonando que no existe

**Specs**: 001, 002 y 003. **Parcial.**

> **[master · Entidades]** **Clínica**: [...] Tiene nombre, clave de acceso, zona horaria y teléfono, que es el que se da a los pacientes.

> **[003-recordatorios-cita · Supuestos]** **Sin teléfono de la clínica**: la 001 no lo guarda y añadirlo alteraría la semilla, así que el mensaje de fuera de plazo dice «contacta con la clínica» sin dar un número.

**Por qué chocarán**: el supuesto de la 003 ya es falso. El portal dará un número que se puede pulsar, y la pantalla del correo, que es la que se usará más cerca de la cita, solo dirá que contacte con la clínica.

**Resolución**: la 003 retira el supuesto y muestra el teléfono en el mensaje de fuera de plazo (HU2-E6). FR-010 de la 003 no se ve afectado, porque prohíbe los datos de la ficha del paciente y no los de la clínica.

---

### S-12. Envíos al paciente: la 002 justifica no enviar lo que la 003 envía

**Specs**: 002 y 003. **Sin cambios desde el 09/11. D3 sigue pendiente.**

> **[002-portal-paciente · Supuestos]** **Entrega manual del enlace**: el sistema no envía nada, así que recepción entrega cada enlace una vez [...]. Es trabajo nuevo para Sonia, aceptado a cambio de no depender de un proveedor externo ni de coste por envío.

> **[003-recordatorios-cita · Supuestos]** **Un único correo**: no hay confirmación de asistencia, ni segundo aviso, ni correo de confirmación tras cancelar.

**Por qué chocarán**: el motivo por el que Sonia entrega los enlaces a mano deja de valer cuando la 003 configure un servidor de correo.

**Resolución**: **propietario 003** de todo envío al paciente. **Decisión D3**: se recomienda no incluir el enlace personal en esta versión. Con D2 el motivo es más claro: el correo reenviado solo debe dar acceso a una cita (RP6), y meter el enlace personal deshace esa separación. La 002 actualiza el motivo de su supuesto.

---

### S-13. Ficha del paciente: nadie puede completar el correo que falta

**Specs**: 001, 002 y 003. **Sin cambios desde el 09/11.** La 002 lo mantiene como «Pendiente» en su tabla.

> **[master · FR-013]** Fuera del alta de cita no se gestionan pacientes.

> **[002-portal-paciente · Cambios que se piden a la 001]** FR-013 [...] Exceptuar el enlace personal (002/FR-002) [...] Pendiente

> **[003-recordatorios-cita · FR-022]** De las 57 reservas futuras, 43 son de pacientes con correo y 14 de pacientes sin él.

**Por qué chocarán**: una ficha sin correo no se puede completar por ninguna vía. Con la semilla, 14 de 57 citas (24,6 %) nunca tendrían recordatorio. La salida natural es crear una ficha nueva, que duplica a la persona y, desde D2, le da otro enlace personal y deja vivos los de la ficha antigua.

**Resolución**: **propietario 001**. Se decide en un solo sitio qué se puede cambiar de una ficha y quién. Se propone permitir a recepción añadir o corregir el correo, y unir esa excepción a FR-013 con la del enlace personal que pide la 002.

---

### S-14. Identificadores de los tests: `FR-001` significa cuatro cosas

**Specs**: las cuatro. **Sin cambios desde el 09/11.**

> **[002-portal-paciente · Reglas de negocio]** Como la 001 usa la misma numeración de FR, los requisitos de esta spec se citan como `002/FR-nnn`.

> **[003-recordatorios-cita · FR-023]** Cada regla RR y cada criterio de aceptación DEBE tener un test que lo referencie

> **[004-panel-analitica · Reglas de negocio]** Se llaman RA para no confundirlos con las RN de la 001.

**Por qué chocarán** (en código, [trazabilidad.test.js](../tests/unit/trazabilidad.test.js)):

- «Todos los tests empiezan por lo que comprueban» solo admite `RN`, `FR-`, `SC-`, `H…-E…` y `CL`. Cualquier test que empiece por `RP1`, `RR1`, `RA1` o `002/FR-001` **hará fallar la suite**.
- La cobertura de la 001 se comprueba por nombre en todos los tests. Un test de la 003 llamado `H2-E1` o `SC-010` **contará falsamente como cobertura de la 001**. Desde el 10/11 el riesgo es mayor, porque la 001 tiene ahora `SC-010` a `SC-012`, que también existen en la 002 y la 003.
- La 003 ya cita la 002 como `002/FR-003`, pero sus propios identificadores siguen sin prefijo.

**Resolución**: **propietario 001**, que tiene el test guardián. Se adopta la convención de la 002 para todo identificador que se repita (`NNN/FR-nnn`, `NNN/SC-nnn`, `NNN/Hx-Ey`), y el test se amplía a RP, RR y RA, con el cambio de spec primero (principio VI). Conviene hacerlo junto con S-18, porque es el mismo test.

---

### S-15. Cita sin cerrar y etiquetas: la 001 ya prohíbe la que añade la 002

**Specs**: 001, 002 y 004. **Sube de bajo a medio**: desde el 10/11 es una contradicción directa.

> **[master · FR-027]** Hay una única etiqueta más: una cita cancelada con origen «portal» o «correo» (FR-036) se muestra como «Cancelada por el paciente» [...] Ninguna otra spec añade etiquetas de estado sin cambiar antes este requisito.

> **[002-portal-paciente · FR-009]** Los estados DEBEN mostrarse como en la 001 (FR-027). Una cita reservada ya empezada DEBE mostrarse como «Pendiente de confirmar por la clínica».

> **[002-portal-paciente · HU3, escenario 2]** la cita queda cancelada, pasa al historial como «Cancelada»

> **[master · Casos límite]** **Cita ya empezada**: siempre está fuera de plazo para el paciente, porque el límite es anterior al inicio.

> **[004-panel-analitica · RA6]** una cita reservada cuyo inicio ya ha pasado no cuenta en ningún numerador ni denominador.

**Por qué chocarán**

- La 002 añade una etiqueta que FR-027 prohíbe, y no la incluye en su tabla de cambios a la 001.
- En el portal, la cita que el paciente acaba de cancelar sale como «Cancelada», mientras FR-027 dice que con origen «portal» se muestra como «Cancelada por el paciente». La 001 no aclara si FR-027 rige solo la agenda o todo el producto.
- «Cita sin cerrar» sigue teniendo tres textos: «ha llegado su hora» (001), «posterior» (002) y «ya ha pasado» (004). El efecto sigue siendo casi nulo, porque RA6 solo mira semanas terminadas.

**Resolución**: **propietario 001**. Define «cita sin cerrar», con la frontera que ya implementa `cita.inicio <= ahora`, admite en FR-027 la etiqueta «Pendiente de confirmar por la clínica» y aclara qué etiquetas ve el paciente. 002 y 004 la citan.

---

### S-19. Las ramas citan reglas que no existen en su base

**Specs**: 002, 003 y 004.

> **[master · Estado]** hasta que el propietario lo apruebe, la versión vigente es la del commit `110b41c`.

> **[002-portal-paciente · Historial de cambios]** Cita el cambio de la 001 del 10/11/2026, que está pendiente de aprobación por su propietario. Si ese cambio varía antes de aprobarse, hay que revisar estas citas.

**Por qué chocarán**

- Las tres ramas parten de `110b41c`. RN8, FR-036, FR-037 y HU6 solo existen en `ff243b6`, que no es la versión vigente ni está en sus ramas.
- Al planificar desde un worktree, `specs/001-nucleo-agenda/spec.md` no tendrá esas reglas, y los tests de la feature no podrán enlazar con ellas.
- La 002 es la única que avisa de la dependencia. La 003 y la 004 citan el cambio sin decir que está pendiente.

**Resolución**: tras aprobar la 001 (S-18), las tres ramas se actualizan desde `master` antes de su `/speckit-plan`. La 003 y la 004 añaden a su historial el mismo aviso que la 002.

---

### S-20. Nadie fija hasta cuándo vale un enlace de cancelación

**Specs**: 002 y 003. Nuevo, nacido de S-04.

> **[002-portal-paciente · RP6]** Lo genera la 003 con cada recordatorio, y la 003 fija su alcance concreto y su vigencia (RR6 y FR-011 de la 003).

> **[002-portal-paciente · FR-003]** «Caducado» solo se aplica al enlace de cancelación, según la vigencia que fije la 003

> **[003-recordatorios-cita · RR6]** un enlace de cancelación solo da acceso a la cita para la que se generó y nunca cancela sin confirmación expresa.

> **[003-recordatorios-cita · HU2, escenario 5]** **Dada** una cita completada o no asistida, **cuando** se abre su enlace, **entonces** se indica el estado en que está y no se ofrece cancelar.

**Por qué chocarán**

- **En spec**: la 002 delega la vigencia y la 003 no la fija. La entidad de la 003 decía antes «deja de permitir acciones cuando la cita no puede cancelarse», y esa frase desapareció al resolver S-04. «Caducado» de FR-003 no se aplica nunca.
- **En producción**: según HU2-E5, un correo de hace meses sigue abriendo una pantalla con la clínica, el profesional, el servicio y la fecha. Esa pantalla revela una visita de salud a quien tenga el correo, sin límite de tiempo y sin que el paciente pueda anularlo, salvo pidiendo a recepción que anule su enlace personal.

**Resolución**: **propietario 003**. **Decisión D5. Se recomienda que valga hasta el inicio de la cita**, que ya está fuera de RN8, y que después dé la respuesta uniforme de 002/FR-003. Así se conservan HU2-E4 (doble pulsación o reapertura antes de la cita) y desaparece HU2-E5, que pasa a ser un caso de enlace caducado.

---

## Bajos

### S-16. Dirección pública del producto

**Specs**: 002 y 003. **Sin cambios desde el 09/11.**

> **[002-portal-paciente · Supuestos]** **Portal por clínica**: cada clínica tiene su dirección de portal

> **[003-recordatorios-cita · Supuestos]** **Dirección del producto**: el enlace necesita una dirección pública del producto, que forma parte de la configuración.

**Por qué chocarán**: habrá dos ajustes para lo mismo, y el proceso de recordatorios corre sin petición web, así que no puede deducir la dirección. La 003 habla de una por producto y la 002 de una por clínica, y desde D2 las dos generan enlaces del mismo modelo.

**Resolución**: **propietario 001**. Un único ajuste de configuración, que usan la 002 y la 003.

---

### S-17. «Ahora» en la demostración

**Specs**: las cuatro. **Sin cambios desde el 09/11.**

> **[003-recordatorios-cita · FR-003]** El proceso DEBE poder ejecutarse indicando el momento que toma como «ahora»

> **[003-recordatorios-cita · HU3, escenario 3]** un enlace de cancelación que funciona contra el producto en marcha.

> **[002-portal-paciente · Datos de los ejemplos]** con el reloj fijado en el **miércoles 04/11/2026 a las 12:00**, hora peninsular.

**Por qué chocarán**: `crearServidor` recibe `ahora`, pero `src/` no ofrece ninguna forma de fijarlo al arrancar. El proceso de la 003 podrá simular el 02/11, pero el producto en marcha seguirá en la fecha real, y el enlace se abrirá ya fuera de RN8. Los momentos de referencia siguen siendo distintos en cada spec: 04/11 a las 12:00 (002), 02/11 a las 08:00 (003), semana del 02/11 (004) y 29/03/2027 (HU6-E5 de la 001).

**Resolución**: **propietario 001**. Una única forma de fijar «ahora» en la demostración, para el servidor y para los procesos.

---

### S-21. Enlaces de demostración frente a «ningún enlace puede adivinarse»

**Specs**: 001 y 002. Nuevo, nacido de S-03 y S-04.

> **[master · FR-029]** un enlace personal de demostración para cada uno de los 40 pacientes [...] DEBEN ser deterministas (mismos parámetros, mismos enlaces) y son, como la clave `eleva-demo` (FR-002), ficticios y públicos

> **[002-portal-paciente · FR-025]** Ningún enlace de paciente, de ninguno de los dos tipos, DEBE poder adivinarse ni deducirse de los datos del paciente o de la cita, ni de otro enlace.

**Por qué chocarán**: un enlace determinista y publicado en la documentación se puede adivinar por definición. La 001 hace la excepción, pero la 002, que es la propietaria del modelo, no la recoge. Un test de FR-025 escrito contra la semilla fallaría, o se escribiría de forma que no pruebe nada.

**Resolución**: **propietario 002**. FR-025 admite la excepción de los enlaces de demostración de FR-029 de la 001, igual que FR-002 de la 001 lo hace con la clave, y exige probarlo con enlaces generados fuera de la semilla.

---

### S-22. Referencias cruzadas desfasadas

**Specs**: las cuatro. No cambian comportamiento, pero un lector que siga la referencia llega al sitio equivocado.

- **003 RR6** cita 002/FR-001 para «no se puede adivinar», que ahora está en **002/FR-025**, y 002/FR-002 para la anulación, que es **RP7**.
- **003** repite la cifra de «2 horas» en las aclaraciones, en HU2-E6, en un caso límite y en sus dependencias. RN8 dice ser «el único plazo del paciente». Basta con citar RN8.
- **002, tabla de cambios a la 001**: la fila «Entidad Paciente y Supuestos» sigue como «Pendiente», pero la 001 ya cambió las dos.
- **004 HU5-E8** fundamenta el rechazo en FR-001 de la 001, cuando la regla es **FR-037**.
- **`specs/MAPA.md`** sigue diciendo «Aprobada» para la 001, sin mencionar el cambio pendiente.
- **003 HU4** no cita 002/FR-019, aunque la lista de huecos ya incluye las cancelaciones del correo.

**Resolución**: cada propietario corrige las suyas en su próximo cambio.

---

## Hallazgo colateral: el esquema no está versionado

**Sin cambios desde el 09/11.** `.gitignore` contiene `datos/`, sin anclar. Esa línea ignora la carpeta de la base de datos y también **`src/datos/`** (`git check-ignore` lo confirma para `src/datos/esquema.sql`):

- `git ls-files src/datos` no devuelve nada, en ninguna rama.
- Ahí están `esquema.sql` (con los disparadores de RN1 y RN4), `bd.js`, `citas.js`, `pacientes.js`, `sesiones.js` y `catalogo.js`.
- Los worktrees de 002, 003 y 004 **no tienen esa carpeta**. Un clon nuevo no arranca, porque `src/servicios/` importa de ella.

Con la resolución de los bloqueantes, la carpeta es aún más central: FR-036 (origen y momento), FR-037 (almacén de sesiones de paciente) y los enlaces de RP6 se implementan ahí. Se propone cambiar la regla a `/datos/`, que sigue cubriendo los `.eml` de `datos/salida-correo/` de la 003, y commitear `src/datos/` antes de empezar ningún plan, y antes del worktree de D4.

No se ha cambiado nada: queda para decisión del propietario de la 001.

## Orden de resolución propuesto

1. Versionar `src/datos/` (hallazgo colateral).
2. AntonioLV1999 toma D4 y D5. Sara y AntonioLV1999 toman D3.
3. Completar y aprobar el cambio de la 001 (S-18). Si es posible, en el mismo cambio, recoger lo que aún le corresponde: operación de cancelar y FR-020 (S-05), puerta de datos reales (S-08), ficha (S-13), convención de identificadores y test de trazabilidad (S-14), cita sin cerrar y etiquetas (S-15), dirección (S-16) y «ahora» (S-17). Si no, se hace en un segundo cambio, pero antes de cualquier plan.
4. Las tres ramas se actualizan desde `master` (S-19).
5. La 002 recoge la excepción de demostración (S-21) y actualiza su tabla de cambios y el supuesto de entrega manual (S-12, S-22).
6. La 003 fija la vigencia del enlace (S-20), retira el supuesto del teléfono (S-11) y redefine SC-001 (S-06, S-07). La 004 corrige RA3, RA4 y su dependencia (S-06, S-07, S-09).
7. Integración en orden 001 → 002 → 003 → 004, porque 003 depende del modelo de acceso de 002.

## Notas de integración

No son solapes de dominio, pero conviene tenerlas presentes:

- Las tres ramas añaden una fila en el mismo punto de `specs/MAPA.md`, y darán un conflicto de merge sencillo.
- Siguen existiendo las ramas `001-nucleo-agenda`, `main02`, `main03` y `main04`, todas en `110b41c` y sin trabajo propio. La 003 ya no remite a `main04`. Se pueden borrar para que nadie las tome por buenas.
- `src/web/vistas/agenda.js` recibirá cambios de 002 (lista de huecos y enlace personal) y de 003 (etiqueta), y la cabecera de `src/web/plantilla.js` el menú «Analítica» de 004.
- Los tests «FR-001 solo la pantalla de acceso es pública» ([rutas-acceso.test.js:83](../tests/integracion/rutas-acceso.test.js#L83)) y el de trazabilidad los tocarán la 001, la 002 y la 003. FR-001 de la 001 ya dice que el primero se amplía en el mismo cambio que cree cada ruta pública.

## Revisado y sin conflicto

- **Mover citas**: 001 y 003 RR5 coinciden, cancelar y crear otra. 002 lo deja fuera.
- **Citas canceladas y recordatorios**: 003 RR2 cumple lo que la 002 le pide.
- **Formatos de fecha, hora e importe**: 002, 003 y 004 remiten a FR-023 a FR-026 de la 001.
- **Precio histórico**: 001 y 004 coinciden en que lo resolverá la spec que permita cambiar precios.
- **RN1**: la cancelación solo libera tramos, y 002 FR-024 y 003 FR-024 prueban el solape contra reservas simultáneas.
- **Correo tras cancelar**: 002 y 003 coinciden en que no se envía.
- **Analítica y datos nuevos de la semilla**: la 004 ha comprobado que ninguna de sus cifras depende del teléfono, los enlaces ni el origen.
- **Cambio de hora en RN8**: el cálculo de la 001 es coherente con el horario de FR-012 (límite entre las 07:00 y las 17:30) y con los ejemplos de la 002 (Isabel Serrano a las 08:30, Javier Peña a las 10:15) y de la 003 (08:00 para una cita de las 10:00).
