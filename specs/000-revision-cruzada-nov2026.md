# Revisión cruzada de specs: solapamientos entre 001, 002, 003 y 004

**Fecha**: 10/11/2026, cuarta pasada (las anteriores son del 09/11/2026 y de la mañana y la tarde del 10/11/2026)

**Para**: propietarios de las specs (AntonioLV1999: 001, 003 y 004; Sara: 002)

**Motivo**: constitución, «Cuando dos specs entren en conflicto, sus propietarios lo resuelven antes de seguir, y la decisión queda escrita en las specs afectadas».

Este informe no modifica ninguna spec. Las resoluciones son propuestas, y cada propietario decide sobre la suya. Los identificadores S-01 a S-23 se mantienen de las pasadas anteriores, para que las specs que ya los citan sigan siendo válidas. Los hallazgos nuevos de esta pasada son S-24 y S-25.

## Versiones analizadas

Cada spec se ha leído desde la punta de su rama. Ninguna de las ramas tiene cambios sin commitear.

| Spec | Rama | Commit de la 3.ª pasada | Commit actual | Estado declarado | Propietario |
|------|------|-------------------------|---------------|------------------|-------------|
| 001 Núcleo de agenda | `master` | `5ddb0c4` | `bc75022` | Aprobada; cambio del 10/11 **aprobado el 10/11/2026** | AntonioLV1999 |
| 002 Portal del paciente | `002-portal-paciente` | `c75ce4e` | `0e33760` | Borrador, con preguntas abiertas para Sara. Sara aprobó solo el cambio que cita FR-038 y FR-039 | Sara |
| 003 Recordatorios de cita | `003-recordatorios-cita` | `5f1db0f` | `965ae48` | Borrador | AntonioLV1999 |
| 004 Panel de analítica | `004-panel-analitica` | `60cfae5` | `ffa5aeb` | Borrador | AntonioLV1999 |

Las tres ramas de feature se han rebasado sobre `bc75022`, así que ya contienen la 001 aprobada. Ninguna tiene cambios fuera de `specs/`. Desde `5ddb0c4`, `master` no ha cambiado nada en `src/` ni en `tests/`. Las referencias a código son del tronco.

## Resumen

En esta pasada **la 001 ha hecho su parte y las features la han recogido**. La 001 ha añadido FR-038 y FR-039, ha calculado los resúmenes de FR-030 con D4, ha renombrado el porcentaje y está aprobada. La 002, la 003 y la 004 ya citan los dos requisitos nuevos por su identificador.

- **Resueltos en esta pasada**: S-05, S-06, S-08 y la parte de aprobación de S-18. De S-22 se cierran `MAPA.md` y la cifra de la 004.
- **No queda ningún bloqueante.**
- **Quedan 11 abiertos**: 3 altos, 4 medios y 4 bajos. Siete dependen de la 001, tres de Sara (D3, D6 y D7) y el resto de la 003 y la 004.

Lo más urgente:

1. **El cambio aprobado de la 001 está sin implementar, y la suite de `master` sigue en rojo** (S-18, que baja a alto). Ahora faltan tests para 16 identificadores, y `aplicarAccion` sigue sin canal y rechaza una cita ya cancelada. Las tres ramas se han rebasado sobre ese rojo, aunque el historial de la 001 dice que se rebasarían sobre la implementación.
2. **La 002 contradice dos requisitos de la 001 ya aprobada** (S-13 y S-15, que suben a altos). Recepción gestiona el enlace personal fuera del alta, contra FR-013, y el portal muestra una etiqueta que FR-027 prohíbe. La 002 no se puede aprobar hasta que la 001 haga un segundo cambio.
3. **Dos huecos nuevos alrededor de la 001 aprobada**. La puerta FR-039 no recoge una validación que la 003 exige antes de usar datos reales (S-24). Y la forma del enlace de demostración la ha fijado la 001 en su historial, aunque FR-029 se la deja a la 002 (S-25).

### Estado de los hallazgos

| # | Hallazgo | Gravedad | Estado | Quién tiene que actuar |
|---|----------|----------|--------|------------------------|
| S-01 | Plazo de cancelación del paciente | Bloqueante | Resuelto (2.ª pasada) | — |
| S-02 | Quién canceló | Bloqueante | Resuelto (2.ª pasada) | — |
| S-03 | Resúmenes de la semilla | Bloqueante | Resuelto (los valores, en esta pasada con D4) | — |
| S-04 | Acceso del paciente | Bloqueante | Resuelto (2.ª pasada) | — |
| S-05 | Operación de cancelar | Alto | **Resuelto** (FR-038) | — |
| S-06 | Tasa de no asistencia | Bajo | **Resuelto** | — |
| S-07 | «Cancelada» cambia de significado | Alto | Resuelto (3.ª pasada) | — |
| S-08 | Uso con datos reales | Alto | **Resuelto** (FR-039) | — |
| S-09 | Ocupación | Medio | Resuelto (3.ª pasada) | — |
| S-10 | Lista de huecos liberados | Medio | Resuelto (2.ª pasada) | — |
| S-11 | Teléfono de la clínica | Medio | Resuelto (3.ª pasada) | — |
| S-12 | Envíos al paciente | Medio | Abierto: D3 planteada a Sara | Sara |
| S-13 | Ficha del paciente | **Alto** (antes medio) | Abierto: contradice la 001 aprobada | 001 |
| S-14 | Identificadores de los tests | Medio | Abierto, sin cambios | 001 |
| S-15 | Cita sin cerrar y etiquetas | **Alto** (antes medio) | Abierto: contradice la 001 aprobada; D6 sin responder | Sara y 001 |
| S-16 | Dirección pública | Bajo | Abierto, sin cambios | 001 |
| S-17 | «Ahora» en la demostración | Bajo | Abierto, sin cambios | 001 |
| S-18 | Implementación de la 001 y suite en rojo | **Alto** (antes bloqueante) | Aprobación resuelta; **falta implementar** | 001 |
| S-19 | Ramas sobre una base sin las reglas que citan | Medio | Resuelto (3.ª pasada) | — |
| S-20 | Vigencia del enlace de cancelación | Medio | Resuelto (3.ª pasada, D5) | — |
| S-21 | Enlaces de demostración | Bajo | Resuelto (3.ª pasada) | — |
| S-22 | Referencias cruzadas desfasadas | Bajo | Casi resuelto: quedan tres textos | 001, 003 y 004 |
| S-23 | Ocupación de partida sin pedir | Bajo | Abierto, sin cambios | 003 |
| S-24 | Validaciones de datos reales fuera de FR-039 | Medio | **Nuevo** | 001 y 003 |
| S-25 | Forma del enlace de demostración | Medio | **Nuevo** (D7) | Sara y 001 |

### Un propietario por concepto

| Concepto | Propietario | Estado |
|----------|-------------|--------|
| Plazo de cancelación del paciente | 001 (RN8) | Hecho. Las tres features citan RN8 |
| Operación de cancelar y su resultado | 001 (FR-038) | Hecho en la spec. 002 RP4, FR-015 y FR-017, y 003 RR4 y FR-014, la citan. **Falta en el código** (S-18) |
| Origen y momento de la cancelación; etiqueta | 001 (FR-036, FR-027) | Hecho |
| Semilla y sus resúmenes | 001 (FR-029, FR-030) | Hecho. Los resúmenes están escritos (D4) |
| Teléfono de la clínica | 001 (FR-029) | Hecho |
| Forma del enlace personal | 002 (según FR-029 de la 001) | **Fijada por la 001 en su historial** (S-25) |
| Ficha del paciente: quién la modifica | 001 | Pendiente (S-13) |
| Puerta de uso con datos reales | 001 (FR-039) | Hecho. La citan 002/FR-006, 003/FR-018 y la 004. Falta una validación de la 003 (S-24) |
| Cita sin cerrar y sus etiquetas | 001 | Pendiente (S-15) |
| «Ahora» y dirección pública del producto | 001 | Pendiente (S-16, S-17) |
| Convención de identificadores de los tests | 001 | Pendiente (S-14) |
| Modelo de acceso del paciente | 002 (RP6, RP7, FR-003 a FR-005, FR-025, FR-026) | Hecho |
| Alcance y vigencia del enlace de cancelación | 003 (RR6) | Hecho (D5) |
| Huecos liberados por pacientes | 002 (FR-019) | Hecho; la 003 HU4 lo cita |
| Envíos al paciente | 003 | Pendiente de D3 (S-12) |
| Eficacia de los recordatorios | 003 (SC-001) | Hecho; falta la ocupación de partida (S-23) |
| Tasa de no asistencia | 004 (RA3) | Hecho. La 003 la cita, y FR-030 de la 001 remite a ella |
| Ocupación de un profesional | 004 (RA4) | Hecho |

### Decisiones que tienen que tomar personas

| # | Decisión | Quién decide | Estado o recomendación |
|---|----------|--------------|------------------------|
| D1 | Valor único del plazo de cancelación (S-01) | Sara, con AntonioLV1999 | **Tomada**: 2 horas en todos los canales |
| D2 | ¿Dos credenciales de paciente o una? (S-04) | Sara, con AntonioLV1999 | **Tomada**: dos, con un solo modelo de acceso |
| D3 | ¿El recordatorio lleva el enlace personal del portal? (S-12) | Sara, con AntonioLV1999 | Pendiente, planteada en la 002. Se recomienda **no en esta versión** |
| D4 | Cómo se obtienen los resúmenes nuevos sin implementar antes de aprobar (S-18) | AntonioLV1999 | **Tomada**: calculados en un worktree desechable y escritos en FR-030 |
| D5 | Hasta cuándo vale un enlace de cancelación (S-20) | AntonioLV1999, con Sara | **Tomada**: hasta el inicio de la cita (003 RR6) |
| D6 | Etiquetas que ve el paciente (S-15) | Sara, y la 001 lo recoge | Pendiente, planteada en la 002. Se recomienda **admitir «Pendiente de confirmar por la clínica» en FR-027** y que el paciente vea la misma etiqueta que la agenda |
| D7 | ¿La 002 adopta la forma de enlace que usó D4? (S-25) | Sara | **Nueva**. Se recomienda **sí**: 32 caracteres hexadecimales, la misma forma para los enlaces reales y los de demostración |

### Quién escribe qué

| Objeto | 001 | 002 | 003 | 004 |
|--------|-----|-----|-----|-----|
| `cita.estado`: reservada → cancelada | Define FR-038: recepción sin plazo, paciente con RN8. **Sin implementar** | Llama a FR-038, canal «portal» | Llama a FR-038, canal «correo» | Lee |
| `cita`: origen y momento de la cancelación | Define (FR-036); FR-038 los escribe | Los escribe vía FR-038 | Los escribe vía FR-038 | No lo usa |
| `clinica`: teléfono | Define y siembra (FR-029) | Lo muestra | Lo muestra fuera de plazo | — |
| `paciente`: enlace personal | Siembra el de demostración (FR-029), con la forma de D4 | Define y gestiona (FR-002), **contra FR-013** (S-13) | Lo usa para anular (RP7) | Excluido (FR-012) |
| Enlace de cancelación | Excepción en FR-001 | Modelo común (RP6) | Genera; alcance y vigencia (RR6) | — |
| `paciente`: correo | Solo en el alta | No lo edita | Depende de él | — |
| `sesion` | Recepción; aísla la de paciente (FR-037) | Sesión de paciente, aparte | Hereda la de la 002 | La de recepción |
| Recordatorio | — | — | Nuevo | — |
| Semilla y resúmenes | Propietaria | No la altera | Protege las cifras | Protege las cifras |
| Uso con datos reales | Puerta única (FR-039) | La cita (FR-006) | La cita (FR-018); solo modo simulado | La cita (supuestos) |

---

## Resueltos

### En esta pasada

- **S-05. Operación única de cancelar.**
  - La 001 añade FR-038: un canal de entrada, RN4 y RN8 con el «ahora» del sistema, y FR-036 en una sola operación indivisible.
  - FR-038 devuelve cuatro resultados, que se comprueban en orden: «ya estaba cancelada» (con el origen y el momento previos), «no cancelable» (con el estado), «fuera de plazo» (con el límite) y «cancelada ahora».
  - FR-020 admite al paciente dentro de RN8. HU3-E5 se mantiene para recepción. Se añaden HU6-E9 (portal y correo a la vez) y SC-013.
  - La 002 cita FR-038 en RP4, FR-015, FR-017 y HU3-E6 y E7, y los cuatro casos de FR-017 corresponden a los cuatro resultados. La 003 lo cita en RR4, FR-014, dos casos límite y Dependencias.
- **S-06. Tasa de no asistencia.** FR-030 y HU5-E3 de la 001 hablan de «porcentajes de composición de la semilla» y remiten a 004/RA3.
- **S-08. Puerta de uso con datos reales.**
  - La 001 añade FR-039 con tres condiciones: conexión cifrada con las cookies limitadas a ella, revisión de protección de datos que incluye el riesgo del enlace sin caducidad, y responsable (AntonioLV1999) y fecha. La fecha está pendiente, así que la puerta no se cumple.
  - La citan 002/FR-006, 003/FR-018, HU3-E4 y el supuesto «Datos reales», y el supuesto «Misma clave, mismas cifras» de la 004.
- **S-18, aprobación.** Con D4 se rompió el círculo: los resúmenes se calcularon en un worktree desechable, sin que cambiaran las cifras de citas (463 = 380 + 46 + 37, y 57 futuras), y con el mismo resultado en dos ejecuciones. La 001 quedó aprobada el 10/11/2026. Lo que queda de S-18 sigue abajo, como alto.
- **S-22, en parte.** `MAPA.md` recoge la aprobación en `master` y en las tres ramas. El aviso de lectura de RA3 de la 004 cita RN8 sin repetir la cifra.

### En pasadas anteriores

- **S-01** (plazo, RN8), **S-02** (origen y etiqueta, FR-036 y FR-027), **S-03** (semilla, FR-029 y FR-030), **S-04** (modelo de acceso, RP6, RP7, FR-001 y FR-037), **S-07** (SC-001 con doble condición), **S-09** (RA4), **S-10** (lista de huecos, 002/FR-019), **S-11** (teléfono), **S-19** (base de las ramas), **S-20** (vigencia, D5), **S-21** (enlaces de demostración) y el hallazgo colateral (`src/datos/` versionado). El detalle está en el historial de cambios de cada spec.

---

## Bloqueantes

No queda ninguno.

---

## Altos

### S-18. El cambio aprobado de la 001 está sin implementar, y la suite de `master` está en rojo

**Specs**: 001, y por arrastre 002, 003 y 004. **Baja de bloqueante a alto**: la 001 ya está aprobada, y la decisión sobre el rojo (opción c) está escrita.

> **[master · Historial de cambios]** **Suite en rojo (S-18, opción c [...])**: el cambio se implementa nada más aprobarlo, con sus tests, para que la suite vuelva a verde.

> **[master · Historial de cambios]** **Cuándo acaba**: con la implementación de este cambio, que no se integra hasta que la suite esté en verde. Las ramas de la 002, la 003 y la 004 se rebasan sobre ella, no sobre el rojo.

> **[master · Historial de cambios, S-05 y S-08]** la cancelación de recepción, que hoy responde con un rechazo a una cita ya cancelada y no recibe canal, pasará por FR-038

> **[master · src/servicios/cambio-estado.js:19]** `` mensaje: `Esta cita ya está ${actual} y no se puede cambiar.` ``

**Por qué chocarán**

- **En código**: [trazabilidad.test.js](../tests/unit/trazabilidad.test.js) falla en `master` con dos tests.
  - El recuento fijo no espera RN8.
  - Faltan tests para **16 identificadores**, dos más que en la pasada anterior: `RN8`, `H4-E5`, `H5-E4`, `H6-E1` a `H6-E9`, y `SC-010` a `SC-013`.
  - [cambio-estado.js](../src/servicios/cambio-estado.js) sigue sin FR-038. `aplicarAccion` no recibe canal, no aplica RN8, no escribe origen ni momento, y responde a una cita ya cancelada con un rechazo, no con «ya estaba cancelada».
  - La semilla tampoco tiene todavía el teléfono, los enlaces ni el origen, así que `npm run semilla` no reproduce los resúmenes de FR-030.
- **Entre ramas**: las tres ramas se han rebasado sobre `bc75022`, es decir, sobre el rojo, aunque el historial de la 001 dice lo contrario. Hoy no hace daño, porque solo tocan `specs/`. Pero ninguna feature dice que no debe planificar ni implementar hasta que la 001 esté implementada. Si la 002 o la 003 empiezan su plan ahora, encontrarán una cancelación sin canal, y volverá el riesgo de S-05: que cada feature escriba la suya.

**Resolución**: **propietario 001**.
- Implementar en `master` el cambio aprobado, con sus tests:
  - FR-038 sobre `aplicarAccion`, o en su lugar, con el canal y los cuatro resultados;
  - FR-036, FR-037 y RN8;
  - la semilla de FR-029, que debe reproducir los dos resúmenes de FR-030;
  - tests para los 16 identificadores, y el recuento de trazabilidad actualizado.
- No relajar el test de trazabilidad (principio VI).
- Recordar que `CREATE TABLE IF NOT EXISTS` no altera una base existente, así que hay que regenerarla.
- Matizar la frase del historial: las ramas pueden rebasarse para leer la spec, pero no planifican ni tocan `src/` hasta que `master` esté en verde, y entonces se rebasan otra vez.

---

### S-13. Ficha del paciente: la 002 contradice FR-013 de la 001 aprobada

**Specs**: 001, 002 y 003. **Sube de medio a alto**: con la 001 aprobada sin este cambio, FR-013 está en vigor y la 002 no se puede aprobar.

> **[master · FR-013]** Fuera del alta de cita no se gestionan pacientes.

> **[002-portal-paciente · FR-002]** Desde una cita de la agenda, recepción DEBE poder copiarlo y DEBE poder anularlo. Anularlo crea uno nuevo y aplica RP7.

> **[002-portal-paciente · Cambios que se piden a la 001]** FR-013 [...] Exceptuar el enlace personal (002/FR-002) [...] Pendiente

> **[002-portal-paciente · Cambios que se piden a la 001]** Deben estar aprobados antes de aprobar esta spec.

> **[003-recordatorios-cita · FR-022]** De las 57 reservas futuras, 43 son de pacientes con correo y 14 de pacientes sin él.

**Por qué chocarán**

- **En spec**: anular el enlace personal cambia la ficha del paciente fuera del alta, y eso lo prohíbe un requisito aprobado. Es la única fila de la tabla de la 002 que sigue «Pendiente», y la propia 002 condiciona su aprobación a ella.
- **Para la 003**: una ficha sin correo sigue sin poder completarse. 14 de 57 citas (24,6 %) nunca tendrían recordatorio, y eso pesa directamente en SC-001 de la 003.
- **En datos**: crear una ficha nueva para añadir el correo duplica a la persona, con otro enlace personal, y deja vivos los enlaces de la antigua.

**Resolución**: **propietario 001**, en un segundo cambio de la 001.
- FR-013 admite dos excepciones fuera del alta: que recepción gestione el enlace personal (002/FR-002 y RP7) y que añada o corrija el correo de la ficha.
- La 002 pasa la fila a «Recogido».

---

### S-15. Cita sin cerrar y etiquetas: la 002 contradice FR-027 de la 001 aprobada (D6)

**Specs**: 001, 002 y 004. **Sube de medio a alto**, por la misma razón que S-13. Las dos preguntas siguen sin respuesta en la 002.

> **[master · FR-027]** Ninguna otra spec añade etiquetas de estado sin cambiar antes este requisito.

> **[002-portal-paciente · FR-009]** Una cita reservada ya empezada DEBE mostrarse como «Pendiente de confirmar por la clínica» (pendiente de la pregunta S-15).

> **[002-portal-paciente · HU3, escenario 2]** pasa al historial como «Cancelada» (etiqueta pendiente de la pregunta S-15)

> **[002-portal-paciente · Cambios que se piden a la 001]** FR-027 [...] Por decidir: ver la pregunta S-15 para Sara [...] Sin pedir

**Por qué chocarán**

- **En spec**: la 002 exige con un DEBE una etiqueta que un requisito aprobado prohíbe. Mientras D6 no se responda, la 002 tampoco sabe qué pedir a la 001, y la fila sigue «Sin pedir».
- «Cita sin cerrar» sigue teniendo tres textos: «ha llegado su hora» (001), «posterior» (002) y «ya ha pasado» (004).
- **En código**: si la 002 se implementa así, el test de etiquetas de la 001 (FR-027) y el del portal (002/FR-009) exigirán cosas distintas para la misma cita.

**Resolución**:
- **Sara responde D6.** Se recomienda admitir «Pendiente de confirmar por la clínica», y que el paciente vea en su historial la misma etiqueta que la agenda: «Cancelada por el paciente el dd/mm/aaaa a las hh:mm».
- La 001 lo recoge en FR-027, en el mismo segundo cambio que S-13, y define «cita sin cerrar» con la frontera `cita.inicio <= ahora`. La 002 y la 004 la citan.

---

## Medios

### S-12. Envíos al paciente (D3)

**Specs**: 002 y 003. **Sin cambios**: D3 sigue planteada a Sara.

> **[002-portal-paciente · Supuestos]** **Entrega manual del enlace**: [...] aceptado a cambio de no depender de un proveedor externo ni de coste por envío.

> **[002-portal-paciente · Preguntas abiertas para Sara]** **D3 (S-12)**: ¿el recordatorio de la 003 debe incluir el enlace personal del portal, además del enlace de cancelación? **Recomendación: no en esta versión.**

**Por qué chocarán**: el motivo del supuesto de la 002 deja de valer cuando la 003 envíe correos. Hasta que Sara responda, la 003 no sabe si su FR-007 debe incluir un segundo enlace.

**Resolución**: Sara responde D3. Si es «no», la 002 cambia el motivo del supuesto («para que un correo reenviado solo dé acceso a una cita, RP6») y la 003 no cambia.

---

### S-14. Identificadores de los tests: `FR-001` significa cuatro cosas

**Specs**: las cuatro. **Sin cambios**, pero ahora corre más prisa: la implementación de S-18 va a tocar el mismo test.

> **[002-portal-paciente · Reglas de negocio]** Como la 001 usa la misma numeración de FR, los requisitos de esta spec se citan como `002/FR-nnn`.

> **[003-recordatorios-cita · FR-023]** Cada regla RR y cada criterio de aceptación DEBE tener un test que lo referencie

> **[004-panel-analitica · Reglas de negocio]** Se llaman RA para no confundirlos con las RN de la 001.

**Por qué chocarán** (en código, [trazabilidad.test.js](../tests/unit/trazabilidad.test.js)):

- «Todos los tests empiezan por lo que comprueban» solo admite `RN`, `FR-`, `SC-`, `H…-E…` y `CL`. Un test que empiece por `RP1`, `RR1`, `RA1` o `002/FR-001` **hará fallar la suite**.
- La cobertura de la 001 se comprueba por nombre en todos los tests. La 001 llega ahora a `SC-013`, y la 002 tiene `SC-001` a `SC-010`, la 003 `SC-001` a `SC-007` y la 004 `SC-001` a `SC-008`. Un test de una feature llamado `SC-010` o `H2-E1` **contará falsamente como cobertura de la 001**.

**Resolución**: **propietario 001**. Se adopta la convención de la 002 para todo identificador que se repita (`NNN/FR-nnn`, `NNN/SC-nnn`, `NNN/Hx-Ey`), y el test se amplía a RP, RR y RA. Primero cambia la spec (principio VI), y tiene que estar aprobada antes de que ninguna feature escriba tests. Lo ideal es aprobarla antes de implementar S-18, para tocar el test una sola vez.

---

### S-24. FR-039 no recoge todas las validaciones que las features piden antes de usar datos reales

**Specs**: 001, 002 y 003. **Nuevo**, nacido de la resolución de S-08.

> **[master · FR-039]** **Revisión de protección de datos**: está hecha, e incluye de forma expresa el riesgo aceptado del enlace personal sin caducidad de la 002.

> **[master · FR-039]** Es la única puerta de uso con datos reales: ninguna otra spec fija otra condición ni la relaja

> **[003-recordatorios-cita · Supuestos]** **Sin darse de baja**: [...] Debe validarse con quien asesore en protección de datos antes de usar datos reales, porque el servicio de la cita puede revelar información de salud.

> **[002-portal-paciente · Supuestos]** **Datos de salud**: el servicio y la especialidad revelan información de salud. Antes de usar el portal con datos reales, la clínica necesita la revisión de protección de datos

**Por qué chocarán**: FR-039 dice que es la única condición, pero la 003 fija otra en un supuesto: validar que el recordatorio no ofrezca la baja y que incluya el servicio. La segunda condición de FR-039 solo nombra expresamente el riesgo del enlace de la 002. El responsable podría dar la puerta por cumplida sin revisar el correo, y la 003 empezaría a enviar correos reales con datos de salud y sin baja.

**Resolución**: **propietario 001**, en el segundo cambio.
- La condición 2 de FR-039 enumera todo lo que la revisión debe cubrir de forma expresa:
  - el enlace sin caducidad (002);
  - los datos de salud en el portal (002);
  - el correo sin baja y con el servicio (003).
- La 003 cambia su supuesto para citar esa condición, en lugar de fijar la suya.

---

### S-25. La forma del enlace de demostración la ha fijado la 001, y FR-029 se la deja a la 002 (D7)

**Specs**: 001 y 002. **Nuevo**, nacido de D4.

> **[master · FR-029]** un enlace personal de demostración para cada uno de los 40 pacientes, con la forma que fije el modelo de acceso de la 002.

> **[master · Historial de cambios, D4]** la 002 no fija una forma concreta (002/FR-025 solo exige que los de la semilla sean deterministas). Se usó esta: [...] los 32 primeros caracteres hexadecimales del SHA-256 del texto `citaclara-enlace-<semilla>-<n>` [...] Cualquier otra forma de token sí los cambiaría.

> **[master · Historial de cambios, D4]** La implementación DEBE reproducir esos dos valores: si da otros, el defecto está en la implementación, no en FR-030.

> **[002-portal-paciente · FR-025]** Ningún enlace de paciente, de ninguno de los dos tipos, DEBE poder adivinarse [...] La única excepción son los enlaces personales de demostración de la semilla (FR-029 de la 001).

**Por qué chocarán**

- **En spec**: un concepto de la 002 lo ha fijado la 001, en su historial y no en un requisito. La 002 no lo ha recogido: su cambio aprobado por Sara no lo menciona.
- **En la planificación de la 002**: si la 002 elige otra forma para sus enlaces reales (otra longitud, otro alfabeto o un prefijo), tiene dos opciones, y ninguna buena:
  - los enlaces de demostración y los reales tienen formas distintas, y las rutas y la validación deben aceptar las dos;
  - o los resúmenes de FR-030 cambian, y la 001 necesita otro cambio y otra aprobación.
- **En código**: quien implemente la 001 leerá FR-029 («la forma que fije la 002») y no encontrará esa forma en la 002, sino en el historial de la 001.

**Resolución**:
- **Decisión D7 para Sara**: ¿adopta la 002 la forma de D4? Se recomienda **sí**, con la misma forma para los enlaces reales, generados al azar, y 128 bits que cumplen 002/FR-025.
- La 002 lo escribe en FR-025.
- La 001, en el segundo cambio, pasa la forma del historial a FR-029 y cita 002/FR-025.

---

## Bajos

### S-16. Dirección pública del producto

**Specs**: 002 y 003. **Sin cambios.**

> **[002-portal-paciente · Supuestos]** **Portal por clínica**: cada clínica tiene su dirección de portal

> **[003-recordatorios-cita · Supuestos]** **Dirección del producto**: el enlace necesita una dirección pública del producto, que forma parte de la configuración.

**Por qué chocarán**: habrá dos ajustes para lo mismo, y el proceso de recordatorios no tiene petición web de la que deducir la dirección.

**Resolución**: **propietario 001**. Un único ajuste de configuración, que usan la 002 y la 003.

---

### S-17. «Ahora» en la demostración

**Specs**: las cuatro. **Sin cambios.**

> **[003-recordatorios-cita · FR-003]** El proceso DEBE poder ejecutarse indicando el momento que toma como «ahora»

> **[002-portal-paciente · Datos de los ejemplos]** con el reloj fijado en el **miércoles 04/11/2026 a las 12:00**, hora peninsular.

**Por qué chocarán**: `crearServidor` recibe `ahora`, pero `src/` no ofrece forma de fijarlo al arrancar. Un enlace generado con «ahora» el 02/11 y abierto contra un servidor en la fecha real está caducado (RR6), y da la respuesta uniforme de enlace no válido, sin ninguna pista. Ahora FR-038 aplica RN8 con el «ahora» del sistema, así que el reloj del servidor decide también el resultado de cancelar. Los momentos de referencia siguen siendo distintos en cada spec.

**Resolución**: **propietario 001**. Una única forma de fijar «ahora» en la demostración, para el servidor y para los procesos. Conviene decidirla antes de implementar FR-038.

---

### S-22. Referencias cruzadas desfasadas o inexactas (resto)

**Specs**: 001, 003 y 004.

> **[004-panel-analitica · Notas de cambios]** Falta que la 003 cite RA3 en SC-001, cambio que corresponde a su propietario.

> **[004-panel-analitica · Notas de cambios]** Falta la doble condición de SC-001 en la 003, que es la propietaria de esa medida.

> **[003-recordatorios-cita · Casos límite]** La segunda pulsación ve el mensaje de cita ya cancelada, sin error, como en el portal (002/FR-017).

> **[002-portal-paciente · FR-017]** **Cancelada ahora**, o **ya estaba cancelada** con un origen previo del paciente [...]: la confirmación de FR-016, como hecha y sin ningún error.

> **[master · Historial de cambios]** **Fuera de este cambio**: los demás hallazgos que el informe asigna a la 001 (S-13 a S-17) y el hallazgo colateral de `src/datos/`.

- **004**: las dos frases de «Falta...» ya no son ciertas. La 003 cita RA3 y tiene la doble condición desde la pasada anterior.
- **003**: el portal no muestra «ya cancelada» en una doble pulsación, sino la confirmación como hecha. Los dos canales eligen textos distintos, que FR-038 permite, pero «como en el portal» es inexacto.
- **001**: el hallazgo colateral ya estaba resuelto en `5ddb0c4`.

**Resolución**: cada propietario lo corrige en su próximo cambio. En la 003 basta con quitar «como en el portal».

---

### S-23. SC-001 compara la ocupación con un periodo de partida que nadie aporta

**Specs**: 003 y 004. **Sin cambios.**

> **[003-recordatorios-cita · SC-001]** La ocupación, calculada según RA4 de la 004, no baja respecto al mismo periodo de partida.

> **[003-recordatorios-cita · Supuestos]** **Objetivo del 30 %**: [...] La clínica debe aportar su tasa de partida calculada con la fórmula de RA3 de la 004

**Por qué chocarán**: el supuesto solo pide a la clínica la tasa de partida, no la ocupación. Sin ocupación de partida, la segunda condición de SC-001 no se puede comprobar, y el criterio vuelve a depender solo de la tasa, que es lo que S-07 quería evitar.

**Resolución**: **propietario 003**. El supuesto pide también la ocupación de partida, calculada con RA4 y el horario de FR-012. Otra opción es medir sobre el primer mes de uso como referencia y los dos siguientes como comparación.

---

## Orden de resolución propuesto

1. **AntonioLV1999, en la 001: implementar el cambio aprobado** (S-18), con la suite en verde.
   - Antes, si es posible, aprobar el cambio de spec de S-14, para tocar el test de trazabilidad una sola vez.
   - Decidir S-17 antes de implementar FR-038.
2. **Sara** responde D3, D6 y D7 en la 002.
3. **AntonioLV1999, segundo cambio de la 001**: S-13 (FR-013), S-15 (FR-027, tras D6), S-24 (FR-039), S-25 (forma del enlace en FR-029, tras D7), S-16 y el resto de S-22. Aprobarlo e implementar lo que toque código.
4. **Las tres ramas se rebasan sobre `master` en verde**. Hasta entonces no planifican ni tocan `src/`.
5. **La 002** recoge S-13, S-15 y S-25 y puede aprobarse. **La 003** recoge S-23, S-24 y su parte de S-22. **La 004**, su parte de S-22.
6. Integración en orden 001 → 002 → 003 → 004.

## Notas de integración

- Las tres ramas añaden una fila en el mismo punto de `specs/MAPA.md`, y darán un conflicto de merge sencillo. La fila de la 001 ya es igual en las cuatro.
- Siguen existiendo las ramas `001-nucleo-agenda`, `main02`, `main03` y `main04`, todas en `110b41c` y sin trabajo propio. Ya no las cita ninguna spec, y se pueden borrar.
- La implementación de la 001 modificará `src/datos/esquema.sql` (teléfono, enlace, origen y momento), `src/semilla/` y `src/servicios/cambio-estado.js`. Después llegarán la 002 (enlaces y rutas públicas) y la 003 (recordatorios). Tened en cuenta:
  - `CREATE TABLE IF NOT EXISTS` no altera una base existente.
  - El disparador `cita_rn4` obliga a escribir el origen en el mismo `UPDATE` que cancela, y en el mismo `INSERT` en la semilla.
  - El teléfono de la clínica no puede ser obligatorio sin tocar los tests que crean otras clínicas.
- `src/web/vistas/agenda.js` recibirá cambios de la 001 (etiqueta «Cancelada por el paciente»), la 002 (lista de huecos y enlace personal) y la 003. La cabecera de `src/web/plantilla.js` recibirá el menú «Analítica» de la 004.
- El test «FR-001 solo la pantalla de acceso es pública» ([rutas-acceso.test.js:83](../tests/integracion/rutas-acceso.test.js#L83)) no cambia con la implementación de la 001. Lo cambia la 002, en el mismo cambio que crea las rutas públicas (FR-001 de la 001).

## Revisado y sin conflicto

- **Resultados de FR-038 y mensajes de los canales**: los cuatro casos de 002/FR-017 corresponden uno a uno a los cuatro resultados. La 003 da mensaje a tres. «No cancelable» no puede darse por el correo, porque una cita solo se completa o se marca como no asistida desde su inicio (RN5), y desde ese momento el enlace está caducado (RR6).
- **Orden de comprobación de FR-038**: una cita cancelada por recepción y ya fuera de plazo devuelve «ya estaba cancelada», no «fuera de plazo». Encaja con 002 HU3-E6 y con 003 HU2-E4.
- **Cancelaciones simultáneas**: 001 HU6-E9 y SC-013, 002 HU3-E7 y los casos límite de la 003 describen lo mismo: un solo «cancelada ahora», con un solo origen y un solo momento.
- **FR-039 en las features**: las tres citan la puerta, ninguna la relaja, y la 003 queda en modo simulado mientras falte la fecha. Los criterios que miden el uso real (002 SC-008 y SC-009, y 003 SC-001) solo pueden empezar a medirse cuando la puerta se cumpla, y ninguna spec dice lo contrario.
- **Resúmenes de FR-030**: la 003 y la 004 protegen las cifras de citas y no copian los resúmenes, así que los valores nuevos no les afectan.
- **Aprobación parcial de la 002**: Sara aprobó solo el cambio que cita FR-038 y FR-039, y la spec sigue en borrador. Es coherente con su tabla de cambios pedidos.
- **Mover citas**: 001 y 003 RR5 coinciden: cancelar y crear otra. La 002 lo deja fuera.
- **Citas canceladas y recordatorios**: RR2 de la 003 cumple lo que la 002 le pide.
- **Formatos de fecha, hora e importe**: la 002, la 003 y la 004 remiten a FR-023 a FR-026 de la 001.
- **Precio histórico**: la 001 y la 004 coinciden en que lo resolverá la spec que permita cambiar precios.
- **RN1**: la cancelación solo libera tramos. 002/FR-024 y 003/FR-024 prueban el solape contra reservas simultáneas.
- **Correo tras cancelar**: la 002 y la 003 coinciden en que no se envía.
- **Analítica y datos nuevos de la semilla**: ninguna cifra de la 004 depende del teléfono, los enlaces ni el origen.
- **Cambio de hora en RN8**: el cálculo de la 001 es coherente con el horario de FR-012 y con los ejemplos de la 002 y la 003.
- **Mensajes fuera de plazo**: el portal muestra la hora límite que devuelve FR-038 y el teléfono (002/FR-017), y el correo solo el teléfono (003/FR-014). Es una diferencia de texto que cada canal elige, no una contradicción de reglas.
- **Lista de huecos y correo**: 003 HU4 cita 002/FR-019, que incluye los huecos cancelados desde el correo.
