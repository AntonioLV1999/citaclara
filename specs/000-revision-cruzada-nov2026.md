# Revisión cruzada de specs: solapamientos entre 001, 002, 003 y 004

**Fecha**: 10/11/2026, tercera pasada (las anteriores son del 09/11/2026 y de la mañana del 10/11/2026)

**Para**: propietarios de las specs (AntonioLV1999: 001, 003 y 004; Sara: 002)

**Motivo**: constitución, «Cuando dos specs entren en conflicto, sus propietarios lo resuelven antes de seguir, y la decisión queda escrita en las specs afectadas».

Este informe no modifica ninguna spec. Las resoluciones son propuestas, y cada propietario decide sobre la suya. Los identificadores S-01 a S-22 se mantienen de las pasadas anteriores, para que las specs que ya los citan sigan siendo válidas. El hallazgo nuevo de esta pasada es S-23.

## Versiones analizadas

Cada spec se ha leído con `git show REF:RUTA`, desde la punta de su rama y sin checkout. Ninguna de las ramas tiene cambios sin commitear.

| Spec | Rama | Commit de la 2.ª pasada | Commit actual | Estado declarado | Propietario |
|------|------|-------------------------|---------------|------------------|-------------|
| 001 Núcleo de agenda | `master` | `ff243b6` | `5ddb0c4` (la spec no cambia desde `ff243b6`) | Aprobada; cambio del 10/11 **pendiente de aprobación** | AntonioLV1999 |
| 002 Portal del paciente | `002-portal-paciente` | `4893c7b` | `c75ce4e` | Borrador, con preguntas abiertas para Sara | Sara |
| 003 Recordatorios de cita | `003-recordatorios-cita` | `7908c87` | `5f1db0f` | Borrador | AntonioLV1999 |
| 004 Panel de analítica | `004-panel-analitica` | `ae4025c` | `60cfae5` | Borrador | AntonioLV1999 |

Las tres ramas de feature se han rebasado sobre `5ddb0c4`, así que ya contienen el cambio de la 001 y `src/datos/`. Ninguna tiene cambios fuera de `specs/`. Las referencias a código son del tronco.

## Resumen

En esta pasada **las tres features han hecho su parte**. La 001 solo ha versionado `src/datos/` y su spec no ha cambiado. Por eso casi todo lo que queda abierto está en la 001.

- **Resueltos en esta pasada**: S-07, S-09, S-11, S-19, S-20 (con D5), S-21 y el hallazgo colateral. S-06 y S-22 quedan con un resto menor.
- **Quedan 12 abiertos**: 1 bloqueante, 2 altos, 4 medios y 5 bajos. **Diez dependen de la 001**, uno de Sara (D3) y uno de la 003 (S-23, nuevo).

Lo más urgente:

1. **S-18 sigue igual**: la 001 no se puede aprobar sin los resúmenes de FR-030, y la suite de `master` sigue en rojo con los mismos 14 identificadores sin test. Ahora que `src/datos/` está versionado, D4 ya se puede ejecutar.
2. **Las features citan dos requisitos de la 001 que no existen** (S-05 y S-08): la «operación única de cancelar» y la «puerta de uso con datos reales». La 002 los cita en 5 sitios, la 003 en 6 y la 004 en 1, y las dos primeras ya marcan la petición como pendiente.
3. **Sara tiene tres preguntas abiertas** en la 002: D3 y las dos de S-15.

### Estado de los hallazgos

| # | Hallazgo | Gravedad | Estado | Quién tiene que actuar |
|---|----------|----------|--------|------------------------|
| S-01 | Plazo de cancelación del paciente | Bloqueante | Resuelto (2.ª pasada) | — |
| S-02 | Quién canceló | Bloqueante | Resuelto (2.ª pasada) | — |
| S-03 | Resúmenes de la semilla | Bloqueante | Resuelto en las specs (2.ª pasada); los valores siguen en S-18 | — |
| S-04 | Acceso del paciente | Bloqueante | Resuelto (2.ª pasada) | — |
| S-05 | Operación de cancelar | Alto | **Abierto**: las features ya la citan, falta definirla en la 001 | 001 |
| S-06 | Tasa de no asistencia | Bajo (antes alto) | Casi resuelto: falta renombrar el porcentaje en FR-030 | 001 |
| S-07 | «Cancelada» cambia de significado | Alto | **Resuelto** | — |
| S-08 | Uso con datos reales | Alto | **Abierto**: las features ya la citan, falta definirla en la 001 | 001 |
| S-09 | Ocupación | Medio | **Resuelto** | — |
| S-10 | Lista de huecos liberados | Medio | Resuelto (2.ª pasada) | — |
| S-11 | Teléfono de la clínica | Medio | **Resuelto** | — |
| S-12 | Envíos al paciente | Medio | Abierto: D3 planteada a Sara | Sara |
| S-13 | Ficha del paciente | Medio | Abierto, sin cambios | 001 |
| S-14 | Identificadores de los tests | Medio | Abierto, sin cambios | 001 |
| S-15 | Cita sin cerrar y etiquetas | Medio | Abierto: dos preguntas planteadas a Sara | Sara y 001 |
| S-16 | Dirección pública | Bajo | Abierto, sin cambios | 001 |
| S-17 | «Ahora» en la demostración | Bajo | Abierto, sin cambios | 001 |
| S-18 | Aprobación de la 001 y suite en rojo | **Bloqueante** | **Abierto, sin cambios** | 001 |
| S-19 | Ramas sobre una base sin las reglas que citan | Medio | **Resuelto** | — |
| S-20 | Vigencia del enlace de cancelación | Medio | **Resuelto** (D5) | — |
| S-21 | Enlaces de demostración | Bajo | **Resuelto** | — |
| S-22 | Referencias cruzadas desfasadas | Bajo | Casi resuelto: quedan `MAPA.md` y una cifra en la 004 | 001 y 004 |
| S-23 | Ocupación de partida sin pedir | Bajo | **Nuevo** | 003 |
| Colateral | `src/datos/` sin versionar | — | **Resuelto** (`5ddb0c4`) | — |

### Un propietario por concepto

| Concepto | Propietario | Estado |
|----------|-------------|--------|
| Plazo de cancelación del paciente | 001 (RN8) | Hecho. Las tres features citan RN8; la 004 aún repite «2 horas» (S-22) |
| Operación de cancelar y su resultado | 001 | **Falta en la 001** (S-05). 002 RP4, FR-015 y FR-017, y 003 RR4 y FR-014, ya la citan |
| Origen y momento de la cancelación; etiqueta | 001 (FR-036, FR-027) | Hecho |
| Semilla y sus resúmenes | 001 (FR-029, FR-030) | Hecho; faltan los valores (S-18) |
| Teléfono de la clínica | 001 (FR-029) | Hecho |
| Ficha del paciente: quién la modifica | 001 | Pendiente (S-13) |
| Puerta de uso con datos reales | 001 | **Falta en la 001** (S-08). 002 FR-006, 003 FR-018 y el supuesto de la 004 ya la citan |
| Cita sin cerrar y sus etiquetas | 001 | Pendiente (S-15) |
| «Ahora» y dirección pública del producto | 001 | Pendiente (S-16, S-17) |
| Convención de identificadores de los tests | 001 | Pendiente (S-14) |
| Modelo de acceso del paciente | 002 (RP6, RP7, FR-003 a FR-005, FR-025, FR-026) | Hecho |
| Alcance y vigencia del enlace de cancelación | 003 (RR6) | Hecho (D5) |
| Huecos liberados por pacientes | 002 (FR-019) | Hecho; la 003 HU4 lo cita |
| Envíos al paciente | 003 | Pendiente de D3 (S-12) |
| Eficacia de los recordatorios | 003 (SC-001) | Hecho; falta la ocupación de partida (S-23) |
| Tasa de no asistencia | 004 (RA3) | Hecho; la 003 la cita. Falta el nombre en FR-030 de la 001 (S-06) |
| Ocupación de un profesional | 004 (RA4) | Hecho |

### Decisiones que tienen que tomar personas

| # | Decisión | Quién decide | Estado o recomendación |
|---|----------|--------------|------------------------|
| D1 | Valor único del plazo de cancelación (S-01) | Sara, con AntonioLV1999 | **Tomada**: 2 horas en todos los canales |
| D2 | ¿Dos credenciales de paciente o una? (S-04) | Sara, con AntonioLV1999 | **Tomada**: dos, con un solo modelo de acceso |
| D3 | ¿El recordatorio lleva el enlace personal del portal? (S-12) | Sara, con AntonioLV1999 | Pendiente, planteada en la 002. Se recomienda **no en esta versión** |
| D4 | Cómo se obtienen los resúmenes nuevos sin implementar antes de aprobar (S-18) | AntonioLV1999 | Pendiente. Se recomienda **calcularlos en un worktree desechable**, que ya es posible con `src/datos/` versionado |
| D5 | Hasta cuándo vale un enlace de cancelación (S-20) | AntonioLV1999, con Sara | **Tomada**: hasta el inicio de la cita (003 RR6) |
| D6 | Etiquetas que ve el paciente (S-15) | Sara, y la 001 lo recoge | Pendiente, planteada en la 002. Se recomienda **admitir «Pendiente de confirmar por la clínica» en FR-027** y que el paciente vea la misma etiqueta que la agenda |

### Quién escribe qué

| Objeto | 001 | 002 | 003 | 004 |
|--------|-----|-----|-----|-----|
| `cita.estado`: reservada → cancelada | Recepción, sin plazo; paciente con RN8; **operación única pendiente** | Llama a la operación única, canal «portal» | Llama a la operación única, canal «correo» | Lee |
| `cita`: origen y momento de la cancelación | Define (FR-036) | Escribe «portal» | Escribe «correo» | No lo usa |
| `clinica`: teléfono | Define y siembra (FR-029) | Lo muestra | Lo muestra fuera de plazo | — |
| `paciente`: enlace personal | Siembra el de demostración (FR-029) | Define y gestiona | Lo usa para anular (RP7) | Excluido (FR-012) |
| Enlace de cancelación | Excepción en FR-001 | Modelo común (RP6) | Genera; alcance y vigencia (RR6) | — |
| `paciente`: correo | Solo en el alta | No lo edita | Depende de él | — |
| `sesion` | Recepción; aísla la de paciente (FR-037) | Sesión de paciente, aparte | Hereda la de la 002 | La de recepción |
| Recordatorio | — | — | Nuevo | — |
| Semilla y resúmenes | Propietaria | No la altera | Protege las cifras | Protege las cifras |

---

## Resueltos

### En esta pasada

- **S-07. «Cancelada» cambia de significado.** SC-001 de la 003 exige dos condiciones a la vez: que la tasa de RA3 baje un 30 % y que la ocupación de RA4 no baje. Además propone informar aparte de las cancelaciones con origen «correo» y «portal». La 004 justifica RA3 por definición («solo cuentan las citas que debían atenderse»), añade un aviso de lectura y sustituye «No depende de las features 002 ni 003» por sus dependencias reales.
- **S-09. Ocupación.** RA4 de la 004 excluye expresamente las reservadas, explica que «ocupación» mide tiempo atendido y no tramos de la agenda, y deriva la capacidad de FR-012 de la 001. Las cifras de referencia no cambian.
- **S-11. Teléfono de la clínica.** La 003 retira el supuesto «Sin teléfono de la clínica», y HU2-E6 y FR-014 ofrecen el teléfono de FR-029 de la 001.
- **S-19. Ramas sobre una base antigua.** Las tres ramas parten de `5ddb0c4`, y la 003 y la 004 añaden el aviso de que citan un cambio de la 001 pendiente de aprobación, igual que la 002.
- **S-20. Vigencia del enlace de cancelación (D5).** RR6 de la 003 fija que el enlace vale hasta la hora de inicio de la cita y que después da la respuesta uniforme de 002/FR-003. HU2-E5 pasa a ser un caso de enlace caducado, y se añade el caso límite «Pantalla abierta hasta el inicio». Encaja con RP6 y FR-003 de la 002, que delegaban la vigencia en la 003.
- **S-21. Enlaces de demostración.** 002/FR-025 admite la excepción de los enlaces de FR-029 de la 001 y exige que sus tests usen enlaces generados fuera de la semilla.
- **Hallazgo colateral.** `.gitignore` pasa de `datos/` a `/datos/`, y `src/datos/` está commiteado en `5ddb0c4`. `datos/salida-correo/` de la 003 sigue ignorado.

### En pasadas anteriores

- **S-01** (plazo, RN8), **S-02** (origen y etiqueta, FR-036 y FR-027), **S-03** (semilla, FR-029 y FR-030), **S-04** (modelo de acceso, RP6, RP7, FR-001 y FR-037) y **S-10** (lista de huecos, 002/FR-019). El detalle está en el historial de cambios de cada spec.

---

## Bloqueantes

### S-18. El cambio de la 001 no se puede aprobar, y la suite de `master` está en rojo

**Specs**: 001, y por arrastre 002 y 003. **Sin cambios desde la segunda pasada.**

> **[master · FR-030]** Resumen de contenido: [NEEDS CLARIFICATION: valor nuevo; solo se puede calcular generando la semilla con el teléfono, los enlaces y el origen, es decir, al implementar este cambio.

> **[master · Historial de cambios]** Este cambio queda **pendiente de aprobación** por su propietario, y no se implementa hasta entonces (principio I).

> **[master · Historial de cambios]** La aprobación espera a ese commit, para aprobar la spec ya completa.

> **[002-portal-paciente · Cambios que se piden a la 001]** Deben estar aprobados antes de aprobar esta spec.

**Por qué chocarán**

- **En spec**: sigue siendo un círculo. No se implementa sin aprobar, y no se aprueba sin los resúmenes, que solo salen de implementar. Ahora pesa más, porque las tres features ya están a la espera de la 001. La 002 y la 003 citan además dos requisitos que la 001 aún no tiene (S-05 y S-08), y que deberían entrar en el mismo cambio antes de aprobarlo.
- **En código**: [trazabilidad.test.js](../tests/unit/trazabilidad.test.js) sigue fallando en `master` con los mismos 14 identificadores sin test: `RN8`, `H4-E5`, `H5-E4`, `H6-E1` a `H6-E8`, `SC-010`, `SC-011` y `SC-012`. Las tres ramas, al rebasarse, han heredado la suite en rojo.

**Resolución**

- **Decisión D4.** Se recomienda calcular los resúmenes en un worktree desechable: aplicar solo los datos nuevos de FR-029, ejecutar `npm run semilla`, comprobar que las cifras de citas no cambian, copiar los dos valores a FR-030 y descartar el código. Con `src/datos/` versionado, el worktree ya arranca.
- En el mismo cambio, antes de aprobar, recoger S-05 y S-08, que las features ya citan.
- Mientras no se apruebe, decidir si el test de trazabilidad deja de exigir lo pendiente o si el cambio sale del tronco. Lo decide el propietario de la 001.

---

## Altos

### S-05. La operación única de cancelar: las features la citan y la 001 no la define

**Specs**: 001, 002 y 003. **Las features han hecho su parte; falta la 001.**

> **[master · FR-020]** Recepción DEBE poder marcar una cita reservada como completada, cancelada o no asistida, según RN4 y RN5. El sistema DEBE rechazar cualquier otra transición.

> **[master · HU3, escenario 5]** **Dada** una cita completada, cancelada o no asistida, **cuando** se intenta cambiar su estado, **entonces** se rechaza con un mensaje que indica el estado en que ya está.

> **[002-portal-paciente · RP4]** Registra toda cancelación con la operación única de cancelar de la 001, indicando el canal «portal» [...] Mientras la 001 no defina esa operación, la referencia queda pedida

> **[002-portal-paciente · FR-017]** **Cancelada ahora**, o **ya estaba cancelada con origen de paciente**, como en una doble pulsación: la confirmación de FR-016, como hecha y sin ningún error. **Ya estaba cancelada con origen «recepción»**: un mensaje que dice que la cita «ya está cancelada»

> **[003-recordatorios-cita · RR4]** mediante la operación única de cancelar de la 001 (S-05, pendiente de recoger allí). Esa operación aplica el plazo de RN8, registra el origen «correo» (FR-036) y distingue «cancelada ahora» de «ya estaba cancelada».

> **[003-recordatorios-cita · Casos límite]** **Portal y correo cancelan a la vez**: la operación única de cancelar de la 001 deja la cita cancelada una vez y con un solo origen (FR-036 de la 001).

**Por qué chocarán**

- **En spec**: la 002 y la 003 ya coinciden. Ninguna define cómo se cancela, las dos se apoyan en la misma operación y las dos tratan la repetición sin error. Pero esa operación no existe: FR-020 sigue hablando solo de recepción, y HU3-E5 de la 001 rechaza cualquier cambio sobre una cita cancelada. Hay **11 referencias a un requisito inexistente**: RP4, FR-015, FR-017 y HU3-E6 y E7 en la 002; RR4, FR-014 y dos casos límite en la 003; y las tablas de dependencias de las dos.
- **En código**: `aplicarAccion` ([cambio-estado.js](../src/servicios/cambio-estado.js)) responde con 409 a una cita ya cancelada y no recibe canal. Si la 002 se planifica antes de que la 001 defina la operación, cada feature tenderá a escribir su propia cancelación.
- **Matiz**: 002/FR-017 distingue si la cancelación previa fue del paciente o de recepción. La operación de la 001 debe devolver el origen previo para que el portal pueda elegir el mensaje.

**Resolución**: **propietario 001**, en el cambio pendiente de S-18.
- FR-020 admite al paciente dentro de RN8.
- Un requisito nuevo define la operación única: recibe el canal, aplica RN4, RN8 y FR-036 en una sola transacción y devuelve «cancelada ahora», «ya estaba cancelada» (con su origen) o el motivo del rechazo.
- HU3-E5 se mantiene para recepción.
- Se añade el escenario de cancelación simultánea entre portal y correo.

---

### S-08. Puerta de uso con datos reales: las features la citan y la 001 no la define

**Specs**: 001, 002, 003 y 004. **Las features han hecho su parte; falta la 001.**

> **[002-portal-paciente · FR-006]** El portal NO DEBE abrirse con datos reales de pacientes mientras no se cumpla la puerta de uso con datos reales de la 001.

> **[003-recordatorios-cita · FR-018]** Mientras esa puerta no exista o no se cumpla, el modo DEBE ser siempre el simulado de FR-019, aunque haya servidor configurado.

> **[004-panel-analitica · Supuestos]** Hoy esa puerta es el supuesto «Conexión sin cifrar (deuda consciente)» de la 001, porque aún no tiene requisito propio (S-08).

> **[master · Supuestos]** **Conexión sin cifrar (deuda consciente)**: [...] antes de usar datos reales de pacientes, la conexión debe ir cifrada y la cookie de sesión debe limitarse a ella.

**Por qué chocarán**

- **En spec**: el riesgo de producción de la segunda pasada ha desaparecido. La 003 ya no envía correo real sin la puerta, y la puerta no existe, así que hoy nada sale. Pero cada feature describe la puerta a su manera: la 003 dice «no exista o no se cumpla», la 002 solo «no se cumpla», y la 004 la iguala a un supuesto. Ninguna puede probarse contra una condición que no está escrita.
- **En producción**: la revisión de protección de datos que pide la 002 en sus supuestos y la deuda de la 001 siguen sin responsable ni fecha.

**Resolución**: **propietario 001**, en el cambio pendiente de S-18. Un requisito único, con identificador propio, define la puerta: conexión cifrada, cookie limitada a ella, revisión de protección de datos y responsable con fecha. Las tres features sustituyen «la puerta de uso con datos reales» por ese identificador.

---

## Medios

### S-12. Envíos al paciente (D3)

**Specs**: 002 y 003. **D3 ya está planteada a Sara** en «Preguntas abiertas para Sara» de la 002.

> **[002-portal-paciente · Supuestos]** **Entrega manual del enlace**: [...] aceptado a cambio de no depender de un proveedor externo ni de coste por envío.

> **[002-portal-paciente · Preguntas abiertas para Sara]** **D3 (S-12)**: ¿el recordatorio de la 003 debe incluir el enlace personal del portal, además del enlace de cancelación? **Recomendación: no en esta versión.**

**Por qué chocarán**: el motivo del supuesto de la 002 deja de valer cuando la 003 envíe correos. Hasta que Sara responda, la 003 no sabe si su FR-007 debe incluir un segundo enlace.

**Resolución**: Sara responde D3. Si es «no», la 002 cambia el motivo del supuesto («para que un correo reenviado solo dé acceso a una cita, RP6») y la 003 no cambia.

---

### S-13. Ficha del paciente: nadie puede completar el correo que falta

**Specs**: 001, 002 y 003. **Sin cambios.**

> **[master · FR-013]** Fuera del alta de cita no se gestionan pacientes.

> **[002-portal-paciente · Cambios que se piden a la 001]** FR-013 [...] Exceptuar el enlace personal (002/FR-002) [...] Pendiente

> **[003-recordatorios-cita · FR-022]** De las 57 reservas futuras, 43 son de pacientes con correo y 14 de pacientes sin él.

**Por qué chocarán**: una ficha sin correo no se puede completar por ninguna vía, así que 14 de 57 citas (24,6 %) nunca tendrían recordatorio. Ahora que SC-001 de la 003 exige resultados medibles, ese 24,6 % pesa directamente en la tasa. Y crear una ficha nueva duplica a la persona, con otro enlace personal, y deja vivos los enlaces de la antigua.

**Resolución**: **propietario 001**. Permitir a recepción añadir o corregir el correo, y unir esa excepción a FR-013 con la del enlace personal que pide la 002.

---

### S-14. Identificadores de los tests: `FR-001` significa cuatro cosas

**Specs**: las cuatro. **Sin cambios.**

> **[002-portal-paciente · Reglas de negocio]** Como la 001 usa la misma numeración de FR, los requisitos de esta spec se citan como `002/FR-nnn`.

> **[003-recordatorios-cita · FR-023]** Cada regla RR y cada criterio de aceptación DEBE tener un test que lo referencie

> **[004-panel-analitica · Reglas de negocio]** Se llaman RA para no confundirlos con las RN de la 001.

**Por qué chocarán** (en código, [trazabilidad.test.js](../tests/unit/trazabilidad.test.js)):

- «Todos los tests empiezan por lo que comprueban» solo admite `RN`, `FR-`, `SC-`, `H…-E…` y `CL`. Un test que empiece por `RP1`, `RR1`, `RA1` o `002/FR-001` **hará fallar la suite**.
- La cobertura de la 001 se comprueba por nombre en todos los tests. Un test de la 003 llamado `H2-E1` o `SC-010` **contará falsamente como cobertura de la 001**, que tiene ahora `SC-010` a `SC-012`.
- La 003 ha renumerado HU3 (el antiguo E4 es ahora E5). No hay tests todavía, pero cada renumeración sin convención aumenta el riesgo de colisión.

**Resolución**: **propietario 001**, junto con S-18, porque es el mismo test. Se adopta la convención de la 002 para todo identificador que se repita (`NNN/FR-nnn`, `NNN/SC-nnn`, `NNN/Hx-Ey`), y el test se amplía a RP, RR y RA, con el cambio de spec primero (principio VI).

---

### S-15. Cita sin cerrar y etiquetas (D6)

**Specs**: 001, 002 y 004. **Dos preguntas planteadas a Sara**, y la 002 marca FR-009 y HU3-E2 como pendientes de su respuesta.

> **[master · FR-027]** Ninguna otra spec añade etiquetas de estado sin cambiar antes este requisito.

> **[002-portal-paciente · FR-009]** Una cita reservada ya empezada DEBE mostrarse como «Pendiente de confirmar por la clínica» (pendiente de la pregunta S-15).

> **[002-portal-paciente · HU3, escenario 2]** pasa al historial como «Cancelada» (etiqueta pendiente de la pregunta S-15)

> **[002-portal-paciente · Cambios que se piden a la 001]** FR-027 [...] Por decidir: ver la pregunta S-15 para Sara [...] Sin pedir

**Por qué chocarán**: la 002 ha hecho visible la contradicción, pero sigue ahí. Mientras no se responda, la 002 exige una etiqueta que la 001 prohíbe. «Cita sin cerrar» sigue teniendo tres textos: «ha llegado su hora» (001), «posterior» (002) y «ya ha pasado» (004).

**Resolución**:
- **Decisión D6** para Sara. Se recomienda admitir «Pendiente de confirmar por la clínica» y que el paciente vea en su historial la misma etiqueta que la agenda, «Cancelada por el paciente el dd/mm/aaaa a las hh:mm».
- La 001 lo recoge en FR-027 y define «cita sin cerrar» con la frontera `cita.inicio <= ahora`. La 002 y la 004 la citan.

---

## Bajos

### S-06. Tasa de no asistencia: falta el nombre en la 001

**Specs**: 001. **Baja de alto a bajo**: la 003 y la 004 ya están alineadas.

> **[004-panel-analitica · RA3]** es la única definición de «tasa de no asistencia» del producto. [...] ese porcentaje es el de composición de la semilla

> **[master · FR-030]** de las que entre el 9 % y el 11 % sean no asistidas, [...] calculado sobre el total de citas de la historia.

**Por qué chocarán**: RA3 es ya la única definición, y SC-001 de la 003 la cita. Solo queda que FR-030 de la 001 llame a su cifra «porcentaje de composición de la semilla», para que nadie lea el 9,9 % como una tasa de no asistencia.

**Resolución**: **propietario 001**, en el cambio pendiente.

---

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

**Por qué chocarán**: `crearServidor` recibe `ahora`, pero `src/` no ofrece forma de fijarlo al arrancar. Con D5 el problema crece: un enlace generado con «ahora» el 02/11 y abierto contra un servidor en la fecha real no solo estará fuera de RN8, sino **caducado**, y dará la respuesta uniforme de enlace no válido. La demostración de la 003 falla sin ninguna pista. Los momentos de referencia siguen siendo distintos en cada spec.

**Resolución**: **propietario 001**. Una única forma de fijar «ahora» en la demostración, para el servidor y para los procesos.

---

### S-22. Referencias cruzadas desfasadas (resto)

**Specs**: 001 y 004. Lo de la 002 y la 003 ya está corregido.

- **`specs/MAPA.md`**, en `master` y en las tres ramas, sigue diciendo «Aprobada» para la 001, sin mencionar el cambio pendiente.
- **004 RA3, «Aviso de lectura»**, repite «hasta 2 horas antes». RN8 es el único plazo, y basta con citarla.

**Resolución**: cada propietario lo corrige en su próximo cambio.

---

### S-23. SC-001 compara la ocupación con un periodo de partida que nadie aporta

**Specs**: 003 y 004. Nuevo, nacido de la resolución de S-07.

> **[003-recordatorios-cita · SC-001]** La ocupación, calculada según RA4 de la 004, no baja respecto al mismo periodo de partida.

> **[003-recordatorios-cita · Supuestos]** **Objetivo del 30 %**: [...] La clínica debe aportar su tasa de partida calculada con la fórmula de RA3 de la 004

> **[004-panel-analitica · Supuestos]** **Capacidad teórica**: [...] Si una clínica real trabaja menos horas, su ocupación saldrá baja.

**Por qué chocarán**: el supuesto solo pide a la clínica la tasa de partida, no la ocupación. Antes de usar el producto, la clínica no tiene ni el dato ni la capacidad de RA4 para calcularla, que depende del horario de FR-012. Sin ocupación de partida, la segunda condición de SC-001 no se puede comprobar, y el criterio vuelve a depender solo de la tasa, que es lo que S-07 quería evitar.

**Resolución**: **propietario 003**. El supuesto pide también la ocupación de partida, calculada con RA4 y el horario de FR-012. Otra opción es medir la condición sobre el primer mes de uso como referencia y los dos siguientes como comparación.

---

## Orden de resolución propuesto

1. **AntonioLV1999, en la 001** (un solo cambio, antes de aprobar):
   - S-18: ejecutar D4 y escribir los resúmenes en FR-030.
   - S-05: añadir la operación única de cancelar y ajustar FR-020.
   - S-08: añadir la puerta de uso con datos reales.
   - S-06: renombrar el porcentaje de FR-030.
   - S-14: convención de identificadores y test de trazabilidad.
   - Si da tiempo: S-13, S-15 (tras D6), S-16 y S-17.
   - Actualizar `MAPA.md` (S-22) y decidir qué hacer con la suite en rojo.
2. **Sara** responde D3 y D6 en la 002.
3. **Aprobar la 001.**
4. Las tres ramas se rebasan sobre la 001 aprobada y sustituyen «la operación única de cancelar» y «la puerta de uso con datos reales» por sus identificadores.
5. **La 003** recoge S-23, y **la 004** el resto de S-22.
6. Integración en orden 001 → 002 → 003 → 004.

## Notas de integración

- Las tres ramas añaden una fila en el mismo punto de `specs/MAPA.md`, y darán un conflicto de merge sencillo.
- Siguen existiendo las ramas `001-nucleo-agenda`, `main02`, `main03` y `main04`, todas en `110b41c` y sin trabajo propio. Ya no las cita ninguna spec, y se pueden borrar.
- `src/web/vistas/agenda.js` recibirá cambios de 002 (lista de huecos y enlace personal) y de 003 (etiqueta), y la cabecera de `src/web/plantilla.js` el menú «Analítica» de 004.
- Los tests «FR-001 solo la pantalla de acceso es pública» ([rutas-acceso.test.js:83](../tests/integracion/rutas-acceso.test.js#L83)) y el de trazabilidad los tocarán la 001, la 002 y la 003.
- `src/datos/esquema.sql` ya está versionado. Lo modificarán la 001 (FR-036 y FR-037), la 002 (enlaces) y la 003 (recordatorios). Recordad que `CREATE TABLE IF NOT EXISTS` no altera una base existente, y que el disparador `cita_rn4` obliga a escribir el origen en el mismo `UPDATE` que cancela.

## Revisado y sin conflicto

- **Mover citas**: 001 y 003 RR5 coinciden, cancelar y crear otra. 002 lo deja fuera.
- **Citas canceladas y recordatorios**: 003 RR2 cumple lo que la 002 le pide.
- **Formatos de fecha, hora e importe**: 002, 003 y 004 remiten a FR-023 a FR-026 de la 001.
- **Precio histórico**: 001 y 004 coinciden en que lo resolverá la spec que permita cambiar precios.
- **RN1**: la cancelación solo libera tramos, y 002 FR-024 y 003 FR-024 prueban el solape contra reservas simultáneas.
- **Correo tras cancelar**: 002 y 003 coinciden en que no se envía.
- **Analítica y datos nuevos de la semilla**: ninguna cifra de la 004 depende del teléfono, los enlaces ni el origen.
- **Cambio de hora en RN8**: el cálculo de la 001 es coherente con el horario de FR-012 y con los ejemplos de la 002 y la 003.
- **Vigencia del enlace y doble pulsación**: con D5, la reapertura de una cita ya cancelada antes de su inicio muestra «ya está cancelada» (003 HU2-E4), y desde el inicio da la respuesta uniforme (003 HU2-E5). Encaja con 002/FR-003 y FR-017.
- **Mensajes fuera de plazo**: el portal muestra la hora límite y el teléfono (002/FR-017), y el correo solo el teléfono (003 FR-014). Es una diferencia de texto que cada canal elige, no una contradicción de reglas.
- **Lista de huecos y correo**: 003 HU4 cita 002/FR-019, que incluye los huecos cancelados desde el correo.
