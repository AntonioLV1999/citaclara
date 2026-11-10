# Revisión cruzada de specs: solapamientos entre 001, 002, 003 y 004

**Fecha**: 09/11/2026

**Para**: propietarios de las specs (AntonioLV1999: 001, 003 y 004; Sara: 002)

**Motivo**: constitución, «Cuando dos specs entren en conflicto, sus propietarios lo resuelven antes de seguir, y la decisión queda escrita en las specs afectadas».

Este informe no modifica ninguna spec. Las resoluciones son propuestas, y cada propietario decide sobre la suya.

## Versiones analizadas

Cada spec se ha leído con `git show REF:RUTA`, desde la punta de su rama y sin checkout. Ninguna de las ramas tiene cambios sin commitear.

| Spec | Rama | Commit | Estado declarado | Propietario |
|------|------|--------|------------------|-------------|
| 001 Núcleo de agenda | `master` | `110b41c` | Aprobada | AntonioLV1999 |
| 002 Portal del paciente | `002-portal-paciente` | `2ce3736` | Borrador | Sara |
| 003 Recordatorios de cita | `003-recordatorios-cita` | `db9bbc6` | Borrador | AntonioLV1999 |
| 004 Panel de analítica | `004-panel-analitica` | `36242b6` | Borrador | AntonioLV1999 |

El tronco de este repositorio se llama `master`, no `main`. Las ramas 002 y 003 se llaman como indica la tabla, no `002-portal-del-paciente` ni `003-recordatorios`. Ninguna de las tres ramas tiene aún cambios fuera de `specs/`, así que todos los choques se pueden evitar antes de implementar.

Las referencias a código son del tronco. Indican dónde chocarán las features, porque las specs por sí solas no lo muestran.

## Resumen

Hay 17 solapamientos: 4 bloqueantes, 4 altos, 6 medios y 3 bajos. Lo más urgente:

1. **El mismo paciente tiene dos plazos para cancelar la misma cita**: 24 horas en el portal y 2 horas en el correo (S-01). Sara respondió a las dos preguntas por separado.
2. **El portal y el correo añaden a `cita` el mismo dato**, con valores y etiquetas distintos (S-02).
3. **La 002 cambia los resúmenes de la semilla que la 003 y la 004 dan por fijos** (S-03).
4. **Anular el enlace de un paciente no anula los enlaces de sus correos** (S-04).

Además, **`src/datos/` no está en git** (ver [Hallazgo colateral](#hallazgo-colateral-el-esquema-no-está-versionado)). Ahí viven el esquema y el disparador de RN1, y es justo lo que las tres features deben tocar.

### Un propietario por concepto

| Concepto | Propietario propuesto | Quién deja de definirlo |
|----------|-----------------------|-------------------------|
| Plazo de cancelación del paciente | 001 (regla nueva) | 002 RP3, 003 RR4 |
| Operación de cancelar y su resultado | 001 | 002 RP4 y FR-017, 003 RR4 |
| Origen y momento de la cancelación; etiqueta | 001 | 002 FR-019, 003 FR-016 |
| Semilla y sus resúmenes | 001 | 002, 003 FR-021, 004 FR-018 |
| Teléfono de la clínica | 001 | 002, 003 |
| Ficha del paciente: quién la modifica | 001 | 002, 003 |
| Puerta de uso con datos reales | 001 | 002 FR-006, 003, 004 |
| Cita sin cerrar | 001 | 002 FR-009, 004 RA6 |
| «Ahora» y dirección pública del producto | 001 | 002, 003 |
| Convención de identificadores de los tests | 001 | 002, 003, 004 |
| Acceso del paciente sin clave | 002 | 003 RR6 y FR-011 |
| Huecos liberados por pacientes | 002 | 003 HU4 |
| Envíos al paciente | 003 | 002 |
| Eficacia de los recordatorios | 003 | — |
| Tasa de no asistencia | 004 | 001 FR-030 (solo el nombre), 003 SC-001 |
| Ocupación de un profesional | 004 | — |

### Decisiones que tienen que tomar personas

| # | Decisión | Quién decide | Recomendación |
|---|----------|--------------|---------------|
| D1 | Valor único del plazo de cancelación (S-01) | Sara, con AntonioLV1999 | **2 horas**, en todos los canales |
| D2 | ¿Dos credenciales de paciente o una? (S-04) | Sara, con AntonioLV1999 | **Dos**, con un solo modelo de acceso |
| D3 | ¿El recordatorio lleva el enlace personal del portal? (S-12) | Sara, con AntonioLV1999 | **No en esta versión** |

### Quién escribe qué

| Objeto | 001 | 002 | 003 | 004 |
|--------|-----|-----|-----|-----|
| `cita.estado`: reservada → cancelada | Recepción | Paciente, portal | Paciente, correo | Lee |
| `cita`: quién canceló y cuándo | — | Añade | Añade (sin «cuándo») | Podría leer |
| `clinica`: teléfono | — | Añade | Da por hecho que no existe | — |
| `paciente`: enlace personal | — | Añade | — | Excluido (FR-012) |
| `paciente`: correo | Solo en el alta | No lo edita | Depende de él | — |
| `sesion` | Recepción | Sesión de paciente, aparte | — | La reutiliza |
| Recordatorio y enlace de cancelación | — | — | Nuevos | — |
| Semilla y resúmenes | Propietaria | Los cambia | «NO DEBE alterar» | Cita el resumen |

---

## Bloqueantes

### S-01. Plazo de cancelación del paciente: 24 horas frente a 2 horas

**Specs**: 002, 003, y 001 como referencia común.

> **[002-portal-paciente · RP3]** un paciente solo cancela citas futuras, y hasta 24 horas antes de su inicio. Una cancelación justo en el minuto límite se acepta. Pasado el límite, cancela recepción: RN5 de la 001 no cambia, y recepción puede cancelar en cualquier momento.

> **[002-portal-paciente · FR-015]** El sistema DEBE aplicar RP1 a RP3 y RN4 en el momento de registrar la cancelación, por cualquier vía

> **[002-portal-paciente · HU3, escenario 5]** **Dada** una cita fuera de plazo, **cuando** se intenta cancelar por una vía distinta de la pantalla, **entonces** se rechaza y la cita no cambia.

> **[002-portal-paciente · Supuestos]** **Hueco a menos de 24 horas**: el paciente no los libera desde el portal, así que la lista solo contiene huecos con al menos un día de margen en el momento de cancelar.

> **[003-recordatorios-cita · RR4]** al confirmar desde el correo, la cita queda cancelada al momento y su tramo libre, sin intervención de recepción. El paciente puede hacerlo hasta 2 horas antes del inicio, incluido ese minuto exacto. Pasado ese plazo, solo recepción puede cancelarla (RN5 de la 001).

> **[003-recordatorios-cita · RR3]** Con la ejecución de las 08:00 y el horario de 09:00 a 20:00, el aviso llega entre 25 y 36 horas antes.

> **[003-recordatorios-cita · Dependencias]** **002-portal-paciente**: si el portal permite cancelar o mover citas, RR4 y RR5 deben coincidir con sus reglas. Sus propietarios lo resuelven antes de aprobar.

> **[master · RN5]** Se puede cancelar en cualquier momento mientras siga reservada.

**Por qué chocarán**

- **En spec**: es una contradicción directa. El enlace del correo es «una vía distinta de la pantalla», así que 002 exige rechazar lo que 003 exige aceptar. Las dos citan RN5, pero RN5 no fija ningún plazo de paciente.
- **En producción**: David Gil, que tiene correo, tiene cita el 09/11/2026 a las 18:00. El recordatorio sale el domingo 08/11 a las 08:00. Desde las 18:00 de ese domingo hasta las 16:00 del lunes, el portal le dice que ya no puede cancelar y que llame, mientras el correo que tiene abierto le deja hacerlo.
- **En diseño**: el recordatorio llega entre 25 y 36 horas antes. Con 24 horas, el paciente con cita a las 09:00 tiene solo 1 hora de margen tras recibir el aviso.
- **En código**: `accionesPermitidas` ([estados.js](../src/dominio/estados.js)) ofrece cancelar siempre, sin plazo ni actor. Cada feature añadiría su plazo en su propia ruta.

**Resolución**

- **Propietario: 001.** Una regla nueva, junto a RN5, fija un único plazo para cualquier canal del paciente y su cálculo los días de cambio de hora. Recepción sigue sin plazo.
- 002 RP3 y 003 RR4 retiran la cifra y citan esa regla.
- **Decisión D1. Se recomiendan 2 horas**: el objetivo declarado es «mejor un hueco libre que un no-show», y con 24 horas el recordatorio casi no deja margen. A cambio, recepción tendrá huecos con menos antelación para ocuparlos.
- Si se eligen 2 horas, la 002 debe revisar el supuesto «Hueco a menos de 24 horas», el recuento de «36 se pueden cancelar en el portal y 6 ya están a menos de 24 horas» y el ejemplo de Isabel Serrano.

---

### S-02. Quién canceló: el mismo dato, añadido dos veces y con dos etiquetas

**Specs**: 002, 003 y 001.

> **[002-portal-paciente · Entidades]** **Cita** (001): no cambia de estados. Además guarda quién la canceló y cuándo.

> **[002-portal-paciente · FR-019]** La agenda DEBE mostrar las citas canceladas desde el portal como «Cancelada por el paciente», con la fecha y la hora de la cancelación.

> **[002-portal-paciente · Cambios a la 001]** Añadir el origen y el momento de la cancelación, la etiqueta y la lista (002/FR-019). Las 37 canceladas de la historia cuentan como canceladas por recepción

> **[003-recordatorios-cita · Entidades]** **Cita** (ampliada, 001): añade quién la canceló, para distinguir al paciente desde el correo.

> **[003-recordatorios-cita · FR-016]** La cancelación DEBE registrar que la hizo el paciente desde el correo, y la agenda DEBE mostrarlo junto al estado «Cancelada».

> **[master · FR-027]** Los estados se muestran como «Reservada», «Completada», «Cancelada» y «No asistida».

**Por qué chocarán**

- **En spec**: el mismo hecho se muestra de dos formas, y una sola de ellas guarda el momento. La 003 tampoco pide a la 001 este cambio, aunque modifica la entidad Cita y la agenda.
- **En código**:
  - Las dos features añaden columnas a la misma tabla en el mismo fichero, y `CREATE TABLE IF NOT EXISTS` no altera una base que ya existe.
  - `cambiarEstado(bd, id, estado)` no recibe actor.
  - El disparador `cita_rn4` aborta todo `UPDATE` que no sea una salida de `reservada`, de modo que el origen debe escribirse en ese mismo `UPDATE`. Las 37 canceladas históricas no se pueden rellenar después con un `UPDATE`.
- **En producción**: recepción ve «Cancelada por el paciente» con hora en unas citas y «Cancelada» con una nota en otras, sin que la diferencia signifique nada para su trabajo.

**Resolución**

- **Propietario: 001.** La entidad Cita añade el origen (`recepción`, `portal` o `correo`) y el momento de la cancelación, y FR-027 admite una única etiqueta: «Cancelada por el paciente», con fecha y hora, para los dos canales.
- 002 FR-019 y 003 FR-016 citan esa definición. Las 37 canceladas de la semilla nacen con origen `recepción`.

---

### S-03. Los resúmenes de la semilla: uno los cambia y dos los dan por fijos

**Specs**: 001, 002, 003 y 004.

> **[002-portal-paciente · Cambios a la 001]** Los dos resúmenes de contenido incluyen los datos de la clínica y de los pacientes, así que el teléfono y los enlaces los cambian. Las cifras de citas no cambian

> **[002-portal-paciente · Cambios a la 001]** Generar enlaces deterministas, ficticios y públicos, como la clave `eleva-demo`, y que no se usen con datos reales

> **[003-recordatorios-cita · FR-021]** La semilla actual ya las cubre, porque 10 de sus 40 pacientes no tienen correo, y esta feature NO DEBE alterar sus cifras ni sus resúmenes de contenido (FR-030 de la 001).

> **[004-panel-analitica · FR-018]** Esta feature NO DEBE añadir ni modificar datos, tablas o semilla, de modo que los resúmenes de contenido de FR-030 de la 001 sigan siendo los mismos.

> **[004-panel-analitica · Cifras de referencia]** Resumen de contenido de la semilla: `f1d7a17b9fa57c74ae6b40814b7f41eacfd084559e412f8a0106857d142b74e8`.

> **[master · FR-030]** Resumen de contenido: `f1d7a17b9fa57c74ae6b40814b7f41eacfd084559e412f8a0106857d142b74e8`.

**Por qué chocarán**

- **En spec**: cada frase habla de «esta feature», pero 003 y 004 suponen un valor que 002 va a cambiar. En cuanto se integre 002, el resumen citado en 004 será falso. Eso incumple el principio V.
- **En código**:
  - `resumen()` ([carga.js](../src/semilla/carga.js)) calcula el hash de todo el objeto de la semilla, así que cualquier dato nuevo lo cambia.
  - Ningún test contiene el valor del resumen, de modo que **el desfase no hará fallar nada**.
  - `borrarClinica` borra una lista fija de tablas y hay claves foráneas activas. Cualquier tabla nueva que apunte a `cita` o `paciente` hará abortar la regeneración si no se añade antes. Las 002 y 003 tocan esa lista.

**Resolución**

- **Propietario: 001.** Un único cambio en la 001 añade el teléfono, los enlaces y el origen, y actualiza los resúmenes una sola vez.
- 003 FR-021 y 004 FR-018 pasan a proteger las **cifras de citas**, que no cambian, y no el hash.
- 004 deja de copiar el resumen y remite a FR-030 de la 001.

---

### S-04. Acceso del paciente: dos credenciales sin un modelo común

**Specs**: 001, 002, 003 y 004.

> **[master · FR-001]** El sistema DEBE exigir la clave de la clínica para cualquier consulta u operación, por cualquier vía, y no solo ocultarlas en pantalla.

> **[master · Entidades]** **Paciente**: ficha de una persona atendida, sin acceso al producto.

> **[002-portal-paciente · FR-001]** El paciente DEBE entrar con un enlace personal de su ficha, sin cuenta ni contraseña. Cada ficha tiene un único enlace vigente, que no se puede adivinar ni deducir de los datos del paciente. El enlace NO DEBE caducar: sigue válido hasta que recepción lo anule.

> **[002-portal-paciente · FR-003]** Un enlace inventado y uno anulado DEBEN dar la misma respuesta, sin revelar si corresponden a un paciente de la clínica.

> **[002-portal-paciente · FR-004]** El sistema DEBE limitar los intentos con enlaces no válidos, y el paciente DEBE poder salir. La sesión DEBE cerrarse tras 30 minutos sin actividad.

> **[002-portal-paciente · Casos límite]** **Enlace reenviado**: quien tenga el enlace ve y cancela las citas de esa ficha, porque el enlace es la única credencial. Por eso recepción puede anularlo.

> **[003-recordatorios-cita · RR6]** un enlace de cancelación solo da acceso a la cita para la que se generó, no se puede deducir a partir de otro y nunca cancela sin confirmación expresa.

> **[003-recordatorios-cita · FR-011]** El enlace DEBE funcionar sin clave de clínica y dar acceso solo a la pantalla de cancelación de esa cita (RR6).

> **[003-recordatorios-cita · Entidades]** **Enlace de cancelación**: acceso no adivinable a una sola cita, generado con su recordatorio. Sirve sin clave de clínica y deja de permitir acciones cuando la cita no puede cancelarse.

> **[004-panel-analitica · FR-001]** El panel DEBE exigir la misma sesión que la agenda (FR-001 de la 001) para cualquier consulta, por cualquier vía.

**Por qué chocarán**

- **En spec**: FR-001 de la 001 recibe dos peticiones de excepción, cada una con su texto. «Única credencial» deja de ser cierto cuando exista el enlace del correo. La 003 no tiene límite de intentos, ni respuesta uniforme, ni forma de revocar.
- **En producción**: un enlace se filtra y recepción lo anula, como prevé la 002. Los enlaces de cancelación de esa ficha siguen vivos, y quien tenga el correo puede cancelar sus citas.
- **En código**:
  - El test «FR-001 solo la pantalla de acceso es pública» ([rutas-acceso.test.js:83](../tests/integracion/rutas-acceso.test.js#L83)) exige exactamente `GET` y `POST /acceso`. Las 002 y 003 lo romperán cada una por su lado. El principio VI obliga a corregir antes la spec.
  - `atender` ([servidor.js](../src/web/servidor.js)) saca la clínica de la cookie `sesion`, y esa tabla solo guarda `token_hash` y `clinica_id`. **Una sesión de paciente guardada ahí abriría la agenda y los ingresos del panel.** La 002 la declara independiente, pero nada lo garantiza todavía.

**Resolución**

- **Propietario: 002**, del modelo completo: tipos de enlace, no adivinable, respuesta uniforme, límite de intentos y revocación.
- 001 FR-001 admite **una sola** excepción, que remite a ese modelo.
- 003 RR6 y FR-011 definen solo el alcance (una cita), y heredan el resto.
- Anular el enlace personal también invalida los enlaces de cancelación de esa ficha.
- Las sesiones de paciente usan almacén y cookie propios.
- **Decisión D2. Se recomienda mantener dos credenciales**: un correo puede reenviarse, y es mejor que solo dé acceso a una cita y no a todo el historial de la ficha.

---

## Altos

### S-05. La operación de cancelar: tres respuestas al mismo hecho

**Specs**: 001, 002 y 003.

> **[master · RN4]** Las únicas transiciones son reservada → completada, reservada → cancelada y reservada → no asistida.

> **[master · FR-020]** Recepción DEBE poder marcar una cita reservada como completada, cancelada o no asistida, según RN4 y RN5. El sistema DEBE rechazar cualquier otra transición.

> **[master · HU3, escenario 5]** **Dada** una cita completada, cancelada o no asistida, **cuando** se intenta cambiar su estado, **entonces** se rechaza con un mensaje que indica el estado en que ya está.

> **[002-portal-paciente · RP4]** cancelar desde el portal es la misma transición reservada → cancelada de RN4: es definitiva y libera el tramo en ese mismo instante, sin ningún paso de recepción.

> **[002-portal-paciente · FR-017]** Repetir una cancelación ya hecha NO DEBE producir un error ni cambiar nada.

> **[002-portal-paciente · HU3, escenario 7]** **entonces** la cita se cancela una sola vez y el paciente ve la cancelación como hecha, no como un error.

> **[003-recordatorios-cita · Casos límite]** **Doble pulsación al confirmar**: la cita se cancela una vez y la segunda pulsación ve el mensaje de cita ya cancelada.

> **[003-recordatorios-cita · Dependencias]** **FR-020 de la 001** reserva a recepción los cambios de estado. Debe admitir la cancelación del paciente.

**Por qué chocarán**

- **En spec**: una doble cancelación es un rechazo en la 001, un no-error en la 002 y un mensaje de «ya cancelada» en la 003. Solo la 003 pide cambiar FR-020, aunque la 002 también lo necesita.
- **En código**: `aplicarAccion` ([cambio-estado.js](../src/servicios/cambio-estado.js)) es la única vía, y responde con rechazo y 409 a una cita ya cancelada. Si cada feature escribe su propia cancelación, se pierde la transacción `BEGIN IMMEDIATE` que protege RN1 y RN4.
- **En pruebas**: la 002 y la 003 prueban cada una su canal contra recepción. Nadie prueba portal contra correo a la vez, ni qué origen queda registrado.

**Resolución**

- **Propietario: 001.** Una sola operación de cancelar, que recibe el actor y el canal, aplica el plazo de S-01 y distingue «cancelada ahora» de «ya estaba cancelada». FR-020 admite al paciente.
- 002 y 003 son llamantes y solo eligen el mensaje. Para el paciente se recomienda el comportamiento de la 002, sin error.
- Se añade una prueba de cancelación simultánea entre portal y correo.

---

### S-06. Tasa de no asistencia: dos fórmulas y un objetivo sin fórmula

**Specs**: 001, 003 y 004.

> **[master · FR-030]** de las que entre el 9 % y el 11 % sean no asistidas, entre el 7 % y el 9 % canceladas y el resto completadas, calculado sobre el total de citas de la historia.

> **[004-panel-analitica · RA3]** la tasa es no asistidas ÷ (completadas + no asistidas). Las canceladas no cuentan, porque el paciente avisó y el hueco quedó libre. La cifra difiere a propósito del 9,9 % de FR-030 de la 001, que mide la composición de la semilla sobre todas las citas de la historia, canceladas incluidas.

> **[003-recordatorios-cita · SC-001]** La tasa de no asistencia de la clínica piloto baja al menos un 30 % respecto a la suya previa, medida durante los 3 primeros meses de uso.

> **[003-recordatorios-cita · Supuestos]** **Objetivo del 30 %**: es una propuesta para SC-001, porque el encargo no fija cifra y no conocemos la tasa real del piloto. La clínica debe aportar esa tasa de partida.

**Por qué chocarán**

- **En spec**: la 004 ya explica su diferencia con la 001, pero la 003 fija un objetivo sobre una tasa que no define.
- **En producción**: con los mismos datos, 46 ÷ 463 = 9,9 % y 46 ÷ 426 = 10,8 %. Si la clínica aporta su tasa de partida sobre el total y luego se compara con el panel, verá un **empeoramiento aparente de un 9 %** sin que haya cambiado nada. Y justo se usa esta cifra en las renovaciones.

**Resolución**

- **Propietario: 004**, con RA3 como única definición de «tasa de no asistencia».
- 001 FR-030 sigue igual, pero lo llama «porcentaje de composición de la semilla».
- 003 SC-001 cita RA3, y la tasa de partida se pide con esa fórmula. Con los datos de la semilla, un 30 % menos desde 10,8 % sería 7,6 %.

---

### S-07. «Cancelada» cambia de significado y la tasa mejora sola

**Specs**: 001, 003 y 004.

> **[master · Casos límite]** **Cancelación registrada tarde**: si el paciente avisó y recepción lo anota después de la hora, se marca como cancelada, no como no asistida, porque «no asistida» significa exclusivamente que no se presentó.

> **[004-panel-analitica · RA3]** Las canceladas no cuentan, porque el paciente avisó y el hueco quedó libre.

> **[004-panel-analitica · Supuestos]** **Dependencia**: requiere la 001 (agenda, acceso, semilla y formatos). No depende de las features 002 ni 003.

> **[003-recordatorios-cita · HU2]** **Por qué esta prioridad**: convierte una no asistencia en un hueco aprovechable, que es el objetivo de la feature.

> **[003-recordatorios-cita · Dependencias]** **Analítica (rama `main04`)**: el dato de quién canceló (FR-016) puede interesarle; aquí solo se justifica por la agenda.

**Por qué chocarán**

- **En spec**: «el hueco quedó libre» no se cumple en una cancelación anotada tarde. La 004 dice no depender de 002 ni 003, pero ambas cambian qué significa una cancelada.
- **En producción**: una cancelación 2 horas antes saca la cita del numerador y del denominador. Si 10 de las 46 no asistidas de la semilla pasaran a canceladas, la tasa bajaría de 10,8 % a 8,7 %, **un 20 % menos con ninguna cita más atendida y sin que se ocupe ningún hueco**. El SC-001 de la 003 se podría cumplir solo por este cambio de clasificación.

**Resolución**

- **Propietario: 003**, de cómo se mide su eficacia. SC-001 se acompaña de una segunda condición: que la ocupación (RA4) no baje en el mismo periodo.
- 004 corrige la justificación de RA3 («el paciente avisó») y retira «No depende». RA8 sigue vigente: no necesita guardar nada.

---

### S-08. Uso con datos reales: un canal bloqueado y otro sin bloquear

**Specs**: 001, 002, 003 y 004.

> **[master · Supuestos]** **Conexión sin cifrar (deuda consciente)**: la 001 no cifra la conexión, y la clave y los datos viajan en claro entre el navegador y el servidor.

> **[002-portal-paciente · FR-006]** El portal NO DEBE abrirse con datos reales de pacientes mientras la conexión no vaya cifrada

> **[002-portal-paciente · Cambios a la 001]** Fijar quién resuelve la deuda y cuándo. Bloquea el uso real del portal (002/FR-006)

> **[002-portal-paciente · Supuestos]** **Datos de salud**: el servicio y la especialidad revelan información de salud. Antes de usar el portal con datos reales, la clínica necesita la revisión de protección de datos, que queda fuera de esta spec.

> **[003-recordatorios-cita · FR-018]** Si hay un servidor de correo configurado, el sistema DEBE enviar los recordatorios a través de él.

> **[003-recordatorios-cita · Supuestos]** **Datos reales (deuda de la 001)**: la conexión sin cifrar de la 001 también afecta a los enlaces de cancelación. Enviar correo real a pacientes reales exige resolver antes esa deuda.

> **[003-recordatorios-cita · FR-007]** El recordatorio DEBE incluir el nombre de la clínica, el del paciente, el profesional, el servicio, la fecha con su día de la semana, la hora de inicio y el enlace de cancelación.

> **[004-panel-analitica · Supuestos]** **Misma clave, mismas cifras**: quien tenga la clave de la clínica verá también los ingresos y las cifras por profesional. Es lo pedido, y hereda la deuda de autenticación de la 001, incluida la conexión sin cifrar.

**Por qué chocarán**

- **En spec**: la 002 lo hace un requisito. En la 003 es un supuesto, mientras FR-018 obliga a enviar.
- **En producción**: basta configurar el servidor de correo para que salgan a pacientes reales enlaces sin cifrar, con el servicio de salud en el texto, aunque el portal siga bloqueado.

**Resolución**

- **Propietario: 001**, donde nació la deuda. Un requisito único define la puerta de uso con datos reales: conexión cifrada, revisión de protección de datos y responsable con fecha.
- 002 FR-006, 003 FR-018 y el supuesto de la 004 lo citan. La 003 lo aplica como condición para el envío real.

---

## Medios

### S-09. «Ocupación» no significa lo mismo que «ocupado»

**Specs**: 001 y 004.

> **[master · FR-016]** Un hueco libre DEBE ser cualquier tramo continuo dentro del horario que no esté ocupado por una cita reservada o completada.

> **[master · Casos límite]** **Cita reservada ya pasada sin cerrar**: sigue reservada y ocupando su tramo.

> **[004-panel-analitica · RA4]** la ocupación es el tiempo de las citas completadas dividido entre la capacidad. Las no asistidas y las canceladas no cuentan, igual que no ocupan el hueco en la agenda (RN1 de la 001).

> **[004-panel-analitica · Casos límite]** Con la semilla por defecto y el reloj en la semana del 09/11/2026, la semana del 02/11/2026 entra en el periodo y el aviso indica 31 citas sin cerrar. Esa semana tiene 0 completadas, 0,00 € y «Sin datos» de no asistencia.

> **[004-panel-analitica · HU3, escenario 2]** **entonces** la capacidad es de 55 horas: 11 horas al día, de lunes a viernes (FR-012 de la 001).

> **[master · FR-012]** que en la 001 es único y fijo para todos: de lunes a viernes, de 09:00 a 20:00

**Por qué chocarán**

- **En spec**: «igual que» es cierto para canceladas y no asistidas, pero en la agenda también ocupa la reservada.
- **En producción**: esta misma semana, con la semilla por defecto, la agenda muestra llena la semana del 02/11 y el panel le da una ocupación de 0,0 %.
- **En código**: si otra spec cambia el horario, las 55 horas escritas como cifra quedarán desfasadas sin que nada lo avise.

**Resolución**

- **Propietario: 004** para «ocupación», y **001** para «tramo ocupado».
- RA4 retira el «igual que» y dice expresamente que las reservadas no cuentan. La capacidad se deriva de FR-012, sin copiar el número.

---

### S-10. Huecos liberados: la lista no sabe qué hacer con el correo

**Specs**: 002 y 003.

> **[002-portal-paciente · FR-019]** Al abrir la agenda, recepción DEBE ver, para cualquier profesional y día, la lista de huecos liberados por pacientes, del más cercano al más lejano, con fecha, horas y profesional, y cada uno DEBE llevar a su agenda.

> **[002-portal-paciente · HU4, escenario 8]** **Dada** una cita que cancela recepción, **cuando** se muestra, **entonces** aparece como «Cancelada» y no entra en la lista.

> **[003-recordatorios-cita · HU4]** Recepción abre la agenda y distingue las citas que el paciente canceló desde el correo de las demás cancelaciones, para poder ofrecer el hueco.

**Por qué chocarán**

- **En spec**: la frase de FR-019 habla de «desde el portal» y luego de «por pacientes». La 003 no menciona la lista.
- **En producción**: los huecos cancelados desde el correo son los más urgentes, porque llegan con menos antelación. Son justo los que se quedarían fuera.

**Resolución**: **propietario 002**. La lista incluye toda cancelación con origen de paciente (S-02). La 003 cita FR-019 en su HU4.

---

### S-11. Teléfono de la clínica: uno lo añade y otro razona que no existe

**Specs**: 001, 002 y 003.

> **[master · Entidades]** **Clínica**: la consulta que usa el producto. Tiene nombre, clave de acceso y zona horaria.

> **[002-portal-paciente · Entidades]** **Clínica** (001): añade el teléfono que se muestra a los pacientes.

> **[002-portal-paciente · HU3, escenario 4]** **entonces** no ofrece cancelar, explica hasta cuándo se podía y ofrece el teléfono de la clínica.

> **[003-recordatorios-cita · Supuestos]** **Sin teléfono de la clínica**: la 001 no lo guarda y añadirlo alteraría la semilla, así que el mensaje de fuera de plazo dice «contacta con la clínica» sin dar un número.

**Por qué chocarán**: al paciente que no llega a tiempo, el portal le da un número que puede pulsar y la pantalla del correo solo le dice que contacte con la clínica, aunque el dato ya exista. Es peor en el canal que usará más cerca de la cita.

**Resolución**: **propietario 001**, en el cambio de S-03. La 003 retira el supuesto y muestra el teléfono en su pantalla de fuera de plazo. FR-010 de la 003 no se ve afectado, porque prohíbe los datos de la ficha del paciente y no los de la clínica.

---

### S-12. Envíos al paciente: la 002 justifica no enviar lo que la 003 envía

**Specs**: 002 y 003.

> **[002-portal-paciente · FR-002]** Recepción lo entrega por el canal que ya use con ese paciente: el sistema no envía nada.

> **[002-portal-paciente · Supuestos]** **Entrega manual del enlace**: el sistema no envía nada, así que recepción entrega cada enlace una vez, por ejemplo al confirmar una cita. Es trabajo nuevo para Sonia, aceptado a cambio de no depender de un proveedor externo ni de coste por envío.

> **[002-portal-paciente · Supuestos]** **Sin avisos al paciente tras cancelar**: la confirmación es solo en pantalla. Los envíos corresponden a la feature de recordatorios, que además debe dejar de avisar de las citas canceladas.

> **[003-recordatorios-cita · Supuestos]** **Un único correo**: no hay confirmación de asistencia, ni segundo aviso, ni correo de confirmación tras cancelar. La pantalla de confirmación es el acuse.

**Por qué chocarán**: no es una contradicción de reglas. El motivo por el que Sonia entrega los enlaces a mano («no depender de un proveedor externo») deja de valer cuando la 003 configure un servidor de correo, y la cuestión quedará sin decidir.

**Resolución**: **propietario 003** de todo envío al paciente. **Decisión D3**. Se recomienda no incluir el enlace personal en esta versión, para no ampliar lo que da acceso un correo reenviado (S-04), y actualizar el motivo escrito en la 002.

---

### S-13. Ficha del paciente: nadie puede completar el correo que falta

**Specs**: 001, 002 y 003.

> **[master · FR-013]** Fuera del alta de cita no se gestionan pacientes.

> **[002-portal-paciente · Supuestos]** **Sin edición de la ficha**: el paciente no cambia su teléfono ni su correo desde el portal.

> **[002-portal-paciente · Cambios a la 001]** Exceptuar el enlace personal (002/FR-002)

> **[003-recordatorios-cita · Supuestos]** **Sin correo no hay aviso**: recepción no recibe una lista para llamar a esos pacientes; el resumen solo los cuenta. El correo sigue siendo opcional en la ficha.

> **[003-recordatorios-cita · FR-022]** De las 57 reservas futuras, 43 son de pacientes con correo y 14 de pacientes sin él.

**Por qué chocarán**: una ficha sin correo no se puede completar por ninguna vía. Con la semilla, 14 de 57 citas (24,6 %) nunca tendrían recordatorio, en la feature que ataca «el dolor número uno». La salida natural es crear una ficha nueva, que duplica a la persona y le da otro enlace personal.

**Resolución**: **propietario 001**. Se decide en un solo sitio qué se puede cambiar de una ficha y quién. Se propone permitir a recepción añadir o corregir el correo, y unir esa excepción a la del enlace personal.

---

### S-14. Identificadores de los tests: `FR-001` significa cuatro cosas

**Specs**: las cuatro.

> **[002-portal-paciente · Reglas de negocio]** Como la 001 usa la misma numeración de FR, los requisitos de esta spec se citan como `002/FR-nnn`.

> **[003-recordatorios-cita · FR-023]** Cada regla RR y cada criterio de aceptación DEBE tener un test que lo referencie

> **[004-panel-analitica · Reglas de negocio]** Se llaman RA para no confundirlos con las RN de la 001.

> **[master · FR-035]** Cada regla de negocio y cada criterio de aceptación DEBE tener un test que lo referencie

**Por qué chocarán** (en código, [trazabilidad.test.js](../tests/unit/trazabilidad.test.js)):

- «Todos los tests empiezan por lo que comprueban» solo admite `RN`, `FR-`, `SC-`, `H…-E…` y `CL`. Cualquier test que empiece por `RP1`, `RR1`, `RA1` o `002/FR-001` **hará fallar la suite**.
- La cobertura de la 001 se comprueba por nombre en todos los tests. Un test de la 003 llamado `H1-E1` o `SC-001` **contará falsamente como cobertura de la 001**.

**Resolución**: **propietario 001**, que tiene el test guardián. Se adopta la convención de la 002 para todo identificador que se repita (`NNN/FR-nnn`, `NNN/SC-nnn`, `NNN/Hx-Ey`), y el test se amplía a RP, RR y RA, con el cambio de spec primero (principio VI).

---

## Bajos

### S-15. Cita empezada y sin cerrar: tres nombres y dos fronteras

**Specs**: 001, 002 y 004.

> **[master · RN5]** una cita solo se marca como completada o no asistida cuando ha llegado su hora de inicio.

> **[002-portal-paciente · RP2]** una cita es futura si está reservada y su inicio es posterior al momento actual, según la hora local de la clínica. Cualquier otra cita pertenece al historial.

> **[002-portal-paciente · FR-009]** Una cita reservada ya empezada DEBE mostrarse como «Pendiente de confirmar por la clínica».

> **[004-panel-analitica · RA6]** una cita reservada cuyo inicio ya ha pasado no cuenta en ningún numerador ni denominador.

**Por qué chocarán**: «ha llegado» y «posterior» incluyen el minuto exacto, y «ya ha pasado» no lo aclara. El efecto hoy es casi nulo, porque RA6 solo mira semanas ya terminadas. Pero son tres textos para el mismo estado derivado, y «Pendiente de confirmar» es una quinta etiqueta fuera de FR-027.

**Resolución**: **propietario 001**. Define «cita sin cerrar», con la frontera que ya implementa `cita.inicio <= ahora`, y la etiqueta. 002 y 004 la citan.

---

### S-16. Dirección pública del producto

**Specs**: 002 y 003.

> **[002-portal-paciente · Supuestos]** **Portal por clínica**: cada clínica tiene su dirección de portal, y un paciente de dos clínicas entra en cada una por separado. Hoy solo existe Eleva.

> **[003-recordatorios-cita · Supuestos]** **Dirección del producto**: el enlace necesita una dirección pública del producto, que forma parte de la configuración.

**Por qué chocarán**: habrá dos ajustes para lo mismo, y un proceso que corre sin petición web no puede deducir la dirección. La 003 solo habla de una por producto y la 002 de una por clínica.

**Resolución**: **propietario 001**. Un único ajuste de configuración, que las 002 y 003 usan.

---

### S-17. «Ahora» en la demostración

**Specs**: 001, 002, 003 y 004.

> **[003-recordatorios-cita · FR-003]** El proceso DEBE poder ejecutarse indicando el momento que toma como «ahora», para que la demostración no dependa del reloj (constitución, principio V).

> **[003-recordatorios-cita · HU3, escenario 3]** **entonces** tiene destinatario, asunto, los datos de la cita y un enlace de cancelación que funciona contra el producto en marcha.

> **[002-portal-paciente · Datos de los ejemplos]** con el reloj fijado en el **miércoles 04/11/2026 a las 12:00**, hora peninsular.

> **[004-panel-analitica · Cifras de referencia]** Se reproducen con `npm run semilla` y el reloj en la semana del 02/11/2026 al 08/11/2026 (constitución, principio V).

**Por qué chocarán**: `crearServidor` recibe `ahora`, pero `src/` no ofrece ninguna forma de fijarlo al arrancar. El proceso de la 003 podrá simular el 02/11, pero el producto en marcha seguirá en la fecha real, y el enlace se abrirá ya fuera de plazo. Con eso falla la demostración. Cada spec fija además un momento de referencia distinto.

**Resolución**: **propietario 001**. Una única forma de fijar «ahora» en la demostración, para el servidor y para los procesos.

---

## Hallazgo colateral: el esquema no está versionado

`.gitignore` contiene `datos/`, sin anclar. Esa línea ignora la carpeta de la base de datos, y también **`src/datos/`**:

- `git ls-files src/datos` no devuelve nada, y esa ruta no aparece en ningún commit de ninguna rama.
- Ahí están `esquema.sql` (con los disparadores de RN1 y RN4), `bd.js`, `citas.js`, `pacientes.js`, `sesiones.js` y `catalogo.js`.
- Los worktrees de 002, 003 y 004 **no tienen esa carpeta**. Un clon nuevo no arranca, porque `src/servicios/` importa de ella.

Las tres features deben tocar `esquema.sql`, y la garantía del principio III vive ahí, sin historial ni revisión posible. Se propone cambiar la regla a `/datos/`, que además sigue cubriendo los `.eml` de `datos/salida-correo/` de la 003, y commitear `src/datos/` antes de empezar ningún plan.

No se ha cambiado nada: queda para decisión del propietario de la 001.

## Orden de resolución propuesto

1. Versionar `src/datos/` (hallazgo colateral).
2. Sara y AntonioLV1999 toman D1, D2 y D3.
3. Un solo cambio aprobado en la 001 recoge lo que le corresponde: plazo y operación de cancelar, origen, excepción a FR-001, teléfono, ficha, semilla y resúmenes, puerta de datos reales, cita sin cerrar, «ahora», dirección y convención de identificadores.
4. La 002 ajusta su modelo de acceso y deja de definir lo que pasa a la 001.
5. La 003 pasa a consumir ese modelo, y la 004 corrige RA3, RA4 y la referencia al resumen.
6. Integración en orden 001 → 002 → 003 → 004, porque 003 depende del modelo de acceso de 002.

## Notas de integración

No son solapes de dominio, pero conviene tenerlas presentes:

- Las tres ramas añaden una fila en el mismo punto de `specs/MAPA.md`, y darán un conflicto de merge sencillo.
- La 003 remite a la analítica como «rama `main04`». Esa rama está en el commit del tronco y no contiene la spec: la correcta es `004-panel-analitica`.
- `src/web/vistas/agenda.js` recibirá cambios de 002 y 003, y la cabecera de `src/web/plantilla.js` el menú «Analítica» de 004.

## Revisado y sin conflicto

- **Mover citas**: 001 y 003 RR5 coinciden, cancelar y crear otra. 002 lo deja fuera.
- **Citas canceladas y recordatorios**: 003 RR2 cumple lo que la 002 le pide.
- **Formatos de fecha, hora e importe**: 002, 003 y 004 remiten a FR-023 a FR-026 de la 001.
- **Precio histórico**: 001 y 004 coinciden en que lo resolverá la spec que permita cambiar precios.
- **RN1**: la cancelación solo libera tramos, y 002 FR-024 y 003 FR-024 prueban el solape contra reservas simultáneas.
- **Correo tras cancelar**: 002 y 003 coinciden en que no se envía.
