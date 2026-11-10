# Especificación de feature: Núcleo de agenda

**Rama de la feature**: `001-nucleo-agenda`

**Creada**: 05/11/2026

**Estado**: Aprobada por su propietario el 06/11/2026. El cambio del 10/11/2026 (S-01 a S-06, S-08 y S-18; ver [Historial de cambios](#historial-de-cambios)) lo aprobó también su propietario el 10/11/2026, y esta es la versión vigente.

**Propietario**: AntonioLV1999 (registrado en `specs/MAPA.md`)

**Entrada**: descripción de la persona usuaria: «Núcleo de agenda de CitaClara. Clínicas pequeñas (2-5 profesionales); la recepción gestiona la agenda; los pacientes, de momento, solo existen como fichas. Entidades, citas y sus estados, RN1 y RN2, interfaz de recepción, acceso con clave de clínica y semilla determinista de Clínica Eleva. Fuera de alcance: acceso del paciente, recordatorios, analítica y pagos online».

## Aclaraciones

### Sesión del 05/11/2026

- P: ¿Cómo se fijan las fechas de la semilla? → R: lunes de referencia fijo como parte de la semilla, con desplazamiento explícito por semanas completas (FR-032).
- P: ¿Puede recepción crear fichas de pacientes en la 001? → R: sí, un alta mínima dentro del alta de cita, con correo opcional (FR-013).
- P: ¿Qué horario aplica? → R: horario único de clínica, de lunes a viernes de 09:00 a 20:00 (FR-012).
- P: ¿Quién es el propietario de la spec? → R: AntonioLV1999.

### Sesión del 10/11/2026 (revisión cruzada, `specs/000-revision-cruzada-nov2026.md`)

- P: ¿Qué plazo tiene el paciente para cancelar? (D1, S-01) → R: hasta 2 horas antes del inicio, minuto límite incluido, igual en todos los canales del paciente (RN8). Recepción sigue sin plazo (RN5).
- P: ¿Una credencial de paciente o dos? (D2, S-04) → R: dos, el enlace personal del portal y el enlace de cancelación del correo, con un único modelo de acceso que define la 002. La 001 solo admite esa excepción a la clave (FR-001) y aísla las sesiones de paciente (FR-037).

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Reservar una cita sin solapes (Prioridad: P1)

Recepción atiende una llamada, elige profesional, servicio, paciente, día y hora, y registra la cita. El sistema calcula el fin a partir de la duración del servicio y garantiza que ese profesional no queda con dos citas a la vez.

**Por qué esta prioridad**: es la razón de ser del producto, y el solape es el fallo capital de la constitución (principio III).

**Prueba independiente**: con los datos de demostración, crear una cita en un hueco libre e intentar crear otras que la solapen, de una en una y a la vez. Aporta valor por sí sola: la clínica ya puede registrar reservas con garantía.

**Escenarios de aceptación**:

1. **Dado** un profesional con un hueco libre de 10:00 a 11:00, **cuando** recepción reserva una sesión de fisioterapia de 45 minutos a las 10:00, **entonces** queda una cita reservada de 10:00 a 10:45.
2. **Dada** una cita reservada de 10:00 a 10:45, **cuando** recepción intenta reservar al mismo profesional a las 10:30, **entonces** se rechaza con un mensaje que dice qué cita lo impide y que invita a elegir otra hora, y la agenda no cambia.
3. **Dada** una cita completada de 10:00 a 10:45, **cuando** recepción intenta reservar al mismo profesional a las 10:15, **entonces** se rechaza igual que si estuviera reservada.
4. **Dada** una cita de 10:00 a 10:45, **cuando** recepción reserva al mismo profesional a las 10:45, **entonces** se acepta: que una cita empiece justo cuando acaba otra no es un solape.
5. **Dada** una cita cancelada de 10:00 a 10:45 en un día futuro, **cuando** recepción reserva ese tramo, **entonces** se acepta: las citas canceladas no ocupan el hueco.
6. **Dada** una cita de hoy de 10:00 a 11:00 marcada como no asistida a las 10:10, **cuando** recepción reserva a las 10:15 una cita que cabe antes de las 11:00, **entonces** se acepta: las citas no asistidas tampoco ocupan el hueco, y el tramo aún por llegar se puede aprovechar.
7. **Dadas** dos peticiones simultáneas que se solapan, sean del mismo hueco exacto o solo en parte, **cuando** el sistema las procesa, **entonces** exactamente una queda registrada y la otra recibe un rechazo claro.
8. **Dado** que son las 12:00, **cuando** recepción intenta reservar hoy a las 11:30 o cualquier día anterior, **entonces** se rechaza con un mensaje que explica que no se pueden crear citas en el pasado.
9. **Dada** una profesional de nutrición, **cuando** recepción prepara una cita con ella, **entonces** solo puede elegir servicios de nutrición.
10. **Dado** un paciente sin ficha, **cuando** recepción reserva su primera visita con nombre y teléfono, **entonces** quedan registradas la ficha y la cita.
11. **Dado** un paciente nuevo cuya cita se rechaza por solape, **cuando** se muestra el rechazo, **entonces** no queda ficha creada y el formulario conserva lo escrito.

---

### Historia de usuario 2 - Ver la agenda del día de un profesional (Prioridad: P1)

Recepción abre la agenda, elige profesional y día, y ve de un vistazo qué tramos están ocupados y cuáles libres, con el paciente, el servicio y el estado de cada cita. Desde un hueco libre puede empezar el alta de una cita.

**Por qué esta prioridad**: sin esta vista recepción no puede responder a la pregunta de cada llamada: «¿qué hueco tienes?».

**Prueba independiente**: con los datos de demostración, abrir la agenda de cada profesional en días con citas y comprobar que lo mostrado coincide con las citas de ese día. Aporta valor por sí sola como consulta.

**Escenarios de aceptación**:

1. **Dada** la agenda de hoy, **cuando** recepción cambia de profesional o de día, **entonces** ve la agenda elegida, y al abrir la agenda se muestra el día de hoy según la hora local de la clínica.
2. **Dado** un día con citas, **cuando** se muestra la agenda, **entonces** cada cita indica hora de inicio y de fin, paciente, servicio y estado, y los huecos libres indican su hora de inicio y de fin.
3. **Dada** una cita cancelada o no asistida, **cuando** se muestra la agenda, **entonces** sigue visible, se distingue de las que ocupan el hueco, y su tramo cuenta como libre.
4. **Dado** un día ya pasado o el tramo pasado de hoy, **cuando** se muestra la agenda, **entonces** no se ofrece reservar en ese tiempo.
5. **Dado** un móvil con pantalla de 360 píxeles de ancho, **cuando** se abre la agenda, **entonces** se lee y se maneja sin desplazamiento horizontal.

---

### Historia de usuario 3 - Registrar qué pasó con la cita (Prioridad: P2)

Recepción marca cada cita reservada como completada, cancelada o no asistida, para que la agenda refleje lo ocurrido.

**Por qué esta prioridad**: cancelar libera huecos y es parte del día a día, pero la agenda ya es útil sin esta historia.

**Prueba independiente**: sobre citas reservadas de los datos de demostración, aplicar cada acción y comprobar el nuevo estado, los rechazos y el efecto sobre los huecos.

**Escenarios de aceptación**:

1. **Dada** una cita reservada cuya hora de inicio ya ha llegado, **cuando** recepción la marca como completada, **entonces** queda completada y sigue ocupando su tramo.
2. **Dada** una cita reservada cuya hora de inicio ya ha llegado, **cuando** recepción la marca como no asistida, **entonces** queda no asistida y deja de ocupar su tramo.
3. **Dada** una cita reservada que aún no ha empezado, **cuando** recepción consulta sus acciones, **entonces** solo puede cancelarla; marcarla como completada o no asistida se rechaza aunque se intente fuera de la interfaz.
4. **Dada** una cita reservada, **cuando** recepción la cancela, **entonces** queda cancelada y su tramo vuelve a estar libre.
5. **Dada** una cita completada, cancelada o no asistida, **cuando** recepción intenta cambiar su estado, **entonces** se rechaza con un mensaje que indica el estado en que ya está. Si lo que intenta es cancelar, es el mensaje que recepción elige ante los resultados «ya estaba cancelada» y «no cancelable» de la operación única de cancelar (FR-038). Los canales del paciente tratan «ya estaba cancelada» sin error, con el mensaje que elige cada uno (002/FR-017 y 003/FR-014).
6. **Dada** cualquier acción de estado, **cuando** recepción la pulsa, **entonces** se le pide confirmación avisando de que no se puede deshacer.

---

### Historia de usuario 4 - Entrar con la clave de la clínica (Prioridad: P2)

Recepción introduce la clave de la clínica y accede a la agenda. Sin la clave no se ve ningún dato.

**Por qué esta prioridad**: la agenda contiene datos de pacientes y no puede estar abierta, aunque la autenticación de esta versión sea simplificada.

**Prueba independiente**: intentar ver la agenda y hacer operaciones sin clave, con una clave incorrecta y con la correcta.

**Escenarios de aceptación**:

1. **Dada** la pantalla de acceso, **cuando** recepción introduce la clave correcta, **entonces** entra en la agenda de su clínica.
2. **Dada** la pantalla de acceso, **cuando** se introduce una clave incorrecta, **entonces** un mensaje llano dice que la clave no es correcta y no se revela ningún dato.
3. **Dado** alguien sin acceso, **cuando** intenta consultar o modificar datos por cualquier vía, **entonces** se rechaza.
4. **Dada** una sesión abierta, **cuando** recepción sale, **entonces** vuelve a necesitar la clave.
5. **Dada** una sesión de paciente válida, abierta con cualquiera de las credenciales del modelo de acceso de la 002, **cuando** intenta abrir la agenda, cualquier otra ruta de recepción o el panel de analítica, por cualquier vía y aunque presente esa sesión en lugar de la de recepción, **entonces** se rechaza igual que sin sesión y no se revela ningún dato (FR-037).

---

### Historia de usuario 5 - Disponer de datos de demostración reproducibles (Prioridad: P2)

Cualquier persona del equipo genera los datos ficticios de Clínica Eleva y obtiene exactamente la misma historia, para demostrar el producto y citar números verificables.

**Por qué esta prioridad**: lo exige la constitución (principio V) y es la base de prueba de las demás historias.

**Prueba independiente**: generar los datos dos veces, en máquinas y momentos distintos, y comparar el resultado.

**Escenarios de aceptación**:

1. **Dados** los mismos parámetros de semilla, **cuando** se generan los datos dos veces, **entonces** el resultado es idéntico, sin duplicados.
2. **Dados** los datos generados, **cuando** se revisa cada profesional, **entonces** ninguna cita reservada o completada solapa otra.
3. **Dados** los datos generados, **cuando** se cuentan las citas de la historia, **entonces** los porcentajes de composición de no asistidas y de canceladas están dentro de los márgenes de FR-030.
4. **Dados** los datos generados, **cuando** se revisan, **entonces** la clínica tiene teléfono, cada uno de los 40 pacientes tiene su enlace personal de demostración, y las 37 canceladas de la historia tienen origen «recepción» (FR-029).

---

### Historia de usuario 6 - Cancelación por el paciente: plazo, origen y etiqueta (Prioridad: P2)

El paciente cancela una cita por cualquiera de sus canales (el portal de la 002 o el enlace del correo de la 003) solo dentro del mismo plazo, y recepción ve en la agenda qué citas canceló el paciente y cuándo, para poder ofrecer ese hueco.

**Por qué esta prioridad**: la 001 no abre ningún canal del paciente, pero fija las reglas comunes para que el portal y el correo no se contradigan ante el mismo paciente y la misma cita.

**Prueba independiente**: sobre citas reservadas de los datos de demostración, con el reloj fijado, aplicar la operación única de cancelar (FR-038) antes, en y después del minuto límite, indicando el canal, y comprobar el resultado, el origen registrado y lo que muestra la agenda. Las pantallas de cada canal las prueban la 002 y la 003, citando estos escenarios.

**Escenarios de aceptación**:

1. **Dada** una cita reservada que empieza a las 18:00, **cuando** el paciente la cancela a las 15:59, por el portal o por el correo, **entonces** se acepta: queda cancelada, su tramo vuelve a estar libre y se registran el origen del canal y el momento.
2. **Dada** una cita reservada que empieza a las 18:00, **cuando** el paciente la cancela a las 16:00, por cualquier canal y en cualquier segundo de ese minuto, **entonces** se acepta: el minuto límite está incluido.
3. **Dada** una cita reservada que empieza a las 18:00, **cuando** el paciente intenta cancelarla a las 16:01 o más tarde, por el portal, por el correo o por cualquier otra vía que no sea la pantalla, **entonces** se rechaza, la cita sigue reservada y no se registra origen ni momento.
4. **Dada** una cita reservada que empieza a las 18:00, **cuando** recepción la cancela a las 17:59 o ya empezada, **entonces** se acepta, porque recepción no tiene plazo (RN5).
5. **Dada** una cita reservada el lunes 29/03/2027 a las 09:00, día siguiente al cambio de hora de primavera, **cuando** el paciente la cancela ese lunes a las 07:00 hora peninsular, **entonces** se acepta, y a las 07:01 se rechaza: el límite se cuenta en hora local de la clínica y no lo desplaza el cambio de hora (RN8).
6. **Dada** una cita cancelada por el paciente desde el portal o desde el correo el 08/11/2026 a las 19:30, **cuando** recepción abre la agenda, **entonces** la cita aparece como «Cancelada por el paciente» con esa fecha y esa hora, y su tramo cuenta como libre.
7. **Dada** una cita cancelada por recepción, aunque el paciente lo pidiera por teléfono, **cuando** se muestra la agenda, **entonces** aparece como «Cancelada», sin fecha ni hora.
8. **Dada** una cita que no se puede cancelar (ya cancelada, completada o no asistida, o fuera de plazo para el paciente), **cuando** se intenta cancelar, **entonces** su origen y su momento de cancelación no cambian.
9. **Dadas** dos cancelaciones simultáneas de la misma cita reservada y dentro del plazo de RN8, una por el portal y otra por el correo, **cuando** el sistema las procesa, **entonces** exactamente una obtiene «cancelada ahora» y la otra «ya estaba cancelada», con el origen de la primera, y la cita queda con un solo origen y un solo momento, los de la cancelación que prosperó (FR-038).

---

### Casos límite

- **Agenda desactualizada**: recepción tiene abierta una agenda antigua y reserva un hueco que otra persona acaba de ocupar. El sistema rechaza la reserva y recepción ve los huecos actuales de ese día.
- **Doble pulsación o reintento**: la misma alta llega dos veces. Solo queda una cita, y la segunda petición se rechaza como cualquier solape.
- **Dos acciones de estado a la vez** sobre la misma cita (por ejemplo, cancelar y completar): solo una prospera; la otra recibe un mensaje con el estado resultante. Si alguna de ellas es cancelar, sea de recepción o del paciente, pasa por la operación única de cancelar (FR-038).
- **El servicio no cabe en el hueco**: una cita de 60 minutos en un hueco libre de 45 se rechaza por solapar la siguiente o por salirse del horario.
- **Cita reservada ya pasada sin cerrar**: sigue reservada y ocupando su tramo. El sistema nunca cambia estados por su cuenta; recepción la cierra cuando pueda.
- **Cancelación registrada tarde**: si el paciente avisó y recepción lo anota después de la hora, se marca como cancelada, no como no asistida, porque «no asistida» significa exclusivamente que no se presentó.
- **Hueco liberado y vuelto a ocupar**: la agenda muestra en el mismo tramo la cita cancelada y la nueva sin confundirlas.
- **Mismo paciente, dos profesionales a la misma hora**: no se impide en esta feature; RN1 protege al profesional.
- **Reloj del dispositivo equivocado o en otra zona horaria**: no afecta. «Ahora» y «hoy» los fija el sistema en la hora local de la clínica.
- **Datos de otra clínica**: una cita no puede combinar profesional, servicio o paciente de clínicas distintas, y ninguna clínica ve datos de otra.
- **El paciente llama para cancelar**: si recepción registra la cancelación, el origen es «recepción» y la etiqueta es «Cancelada», aunque lo pidiera el paciente. El origen indica el canal que registró la cancelación, no quién la pidió.
- **Paciente fuera de plazo**: no puede cancelar por ningún canal propio, y debe llamar a la clínica, cuyo teléfono existe ya en los datos (FR-029). Cómo se le explica es cosa de cada canal (002 y 003).
- **Cita ya empezada**: siempre está fuera de plazo para el paciente, porque el límite es anterior al inicio.
- **Reloj del dispositivo del paciente**: no afecta al plazo, porque se calcula con el «ahora» del sistema en hora local de la clínica, igual que RN2.
- **Sesión de recepción y de paciente en el mismo navegador**: cada una vive aparte (FR-037); salir de una no cierra la otra, y ninguna amplía lo que permite la otra.

## Requisitos *(obligatorio)*

### Reglas de negocio

Los tests de esta feature referencian estos identificadores (constitución, principio VI).

- **RN1 (capital)**: dos citas del mismo profesional se solapan si cada una empieza antes de que acabe la otra. No puede crearse una cita que solape otra reservada o completada del mismo profesional, sea cual sea su origen y aunque las peticiones lleguen a la vez: exactamente una prospera. La garantía la da el sistema y no depende de la interfaz. Las citas canceladas y no asistidas no ocupan el hueco.
- **RN2**: no se crean citas cuyo inicio sea anterior al momento actual, según la hora local de la clínica. Una cita que empiece en ese mismo minuto se acepta. Los datos de demostración son la única excepción.
- **RN3**: el fin de una cita es siempre su inicio más la duración del servicio, y no se introduce a mano.
- **RN4**: una cita nace reservada, salvo la historia de los datos de demostración (FR-033). Las únicas transiciones son reservada → completada, reservada → cancelada y reservada → no asistida. Los tres estados de llegada son definitivos.
- **RN5**: una cita solo se marca como completada o no asistida cuando ha llegado su hora de inicio. Recepción puede cancelarla en cualquier momento mientras siga reservada, sin plazo. El paciente, por cualquiera de sus canales, solo dentro del plazo de RN8.
- **RN6**: «no asistida» significa exclusivamente que el paciente no se presentó a una cita que seguía reservada.
- **RN7**: un profesional solo atiende servicios de su especialidad.
- **RN8 (plazo de cancelación del paciente, D1)**: el paciente puede cancelar una cita reservada, por cualquiera de sus canales (portal, correo o cualquier otro que se añada), solo hasta 2 horas antes de su inicio. El límite es la hora local de inicio menos 2 horas, en la hora local de la clínica, y el minuto límite está incluido: con inicio a las 18:00 se acepta hasta las 16:00, en cualquier segundo de ese minuto, y se rechaza desde las 16:01. «Ahora» lo fija el sistema, no el dispositivo. Pasado el límite, solo recepción puede cancelarla (RN5). La regla se aplica en el momento de registrar la cancelación, por cualquier vía, y no depende de lo que muestre la pantalla. Es el único plazo del paciente: ninguna otra spec fija otro.
  - **Días de cambio de hora**: el límite se calcula sobre el reloj local de la clínica del día de la cita, no sumando ni restando horas reales a otro momento. Como las citas solo empiezan de lunes a viernes desde las 09:00 (FR-012) y los cambios de hora ocurren en domingo de madrugada (FR-025), el límite cae siempre el mismo día de la cita, entre las 07:00 y las 17:30, nunca dentro de la hora que no existe o que se repite, y coincide con 2 horas reales. Si otra spec cambia el horario de forma que el límite pudiera caer en esa hora, deberá ampliar esta regla.

### Requisitos funcionales

**Acceso**

- **FR-001**: El sistema DEBE exigir la clave de la clínica para cualquier consulta u operación, por cualquier vía, y no solo ocultarlas en pantalla. Hay **una sola excepción**: el acceso del paciente, tal como lo defina el modelo de acceso de la 002, con sus dos credenciales (el enlace personal del portal y el enlace de cancelación del correo de la 003, decisión D2). Ese acceso solo alcanza lo que el modelo de la 002 le permite, y nunca lo de FR-037. Ninguna otra spec puede añadir otra excepción sin cambiar antes este requisito. El test «FR-001 solo la pantalla de acceso es pública», que hoy admite solo la pantalla de acceso, se ampliará con las rutas públicas de ese modelo, y solo con ellas, en el mismo cambio que las cree (constitución, principio VI).
- **FR-002**: Cada clínica DEBE tener una única clave, que NO DEBE mostrarse nunca en pantalla ni guardarse de forma legible. La única excepción es la clave de los datos de demostración, ficticia y pública, que aparece en el código y en la documentación y no debe usarse con datos reales.
- **FR-003**: Recepción DEBE poder salir, tras lo cual hará falta de nuevo la clave.
- **FR-004**: El sistema DEBE limitar cada sesión a los datos de su clínica.
- **FR-037**: Las sesiones de paciente DEBEN guardarse en un almacén propio y viajar en una cookie propia, distintos de los de la sesión de recepción. Una sesión de paciente NO DEBE dar acceso a la agenda ni a ninguna ruta de recepción ni del panel de analítica (004), por ninguna vía, ni aunque se presente en lugar de la sesión de recepción: se trata igual que la ausencia de sesión. Salir de una sesión no cierra la otra.

**Uso con datos reales**

- **FR-039 (puerta de uso con datos reales, S-08)**: Ningún canal del producto (la agenda y el resto de recepción, el portal de la 002, el correo real de la 003 ni el panel de la 004) DEBE usarse con datos reales de pacientes hasta que se cumplan, a la vez, estas tres condiciones:
  1. **Conexión cifrada**: la conexión entre el navegador y el servidor va cifrada, y las cookies de sesión, de recepción y de paciente (FR-037), solo viajan por ella.
  2. **Revisión de protección de datos**: está hecha, e incluye de forma expresa el riesgo aceptado del enlace personal sin caducidad de la 002.
  3. **Responsable y fecha**: esta spec tiene escritos un responsable y la fecha en que comprobó que se cumplen las condiciones 1 y 2. Responsable: AntonioLV1999. Fecha de comprobación: pendiente. El responsable la escribe aquí el día en que lo comprueba, y mientras no esté escrita, la puerta no se cumple.

  Mientras no se cumplan las tres, el producto DEBE funcionar solo con los datos ficticios de la semilla (FR-029 a FR-034), y el correo de la 003 solo en modo simulado (003/FR-019), aunque haya servidor de correo configurado. Es la única puerta de uso con datos reales: ninguna otra spec fija otra condición ni la relaja, y las features la citan como «FR-039 de la 001».

**Alta de cita**

- **FR-005**: Recepción DEBE poder crear una cita eligiendo profesional, servicio, paciente, día y hora de inicio.
- **FR-006**: El alta DEBE poder iniciarse desde un hueco libre de la agenda, con profesional, día y hora ya rellenados. Si en un hueco no cabe ningún servicio del profesional, la agenda lo muestra como libre, pero no ofrece reservar en él.
- **FR-007**: El sistema DEBE permitir localizar al paciente escribiendo parte de su nombre o de su teléfono.
- **FR-008**: El alta DEBE ofrecer solo servicios de la especialidad del profesional, y el sistema DEBE rechazar cualquier combinación incompatible (RN7).
- **FR-009**: El alta DEBE mostrar la duración, el precio y la hora de fin resultante antes de confirmar.
- **FR-010**: El sistema DEBE aplicar RN1, RN2 y RN3 en el momento de registrar la cita, y si la rechaza, DEBE dejar la agenda intacta.
- **FR-011**: Las horas de inicio DEBEN caer en múltiplos de 15 minutos.
- **FR-012**: Una cita DEBE empezar y terminar dentro del horario de la clínica, que en la 001 es único y fijo para todos: de lunes a viernes, de 09:00 a 20:00, en hora local de la clínica.
- **FR-013**: Durante el alta de una cita, recepción DEBE poder crear la ficha de un paciente nuevo con nombre y teléfono obligatorios y correo electrónico opcional. El teléfono DEBE tener al menos 9 dígitos, y solo admite dígitos, espacios y un `+` inicial. El correo, si se escribe, DEBE tener forma de correo. La ficha y la cita se registran juntas: si la cita se rechaza, no queda ficha y el formulario conserva lo escrito. Fuera del alta de cita no se gestionan pacientes.

**Agenda del día**

- **FR-014**: Recepción DEBE poder ver la agenda de un profesional para cualquier día, pasado o futuro, y la vista DEBE abrirse en el día de hoy.
- **FR-015**: La agenda DEBE mostrar en orden horario las citas del día con inicio, fin, paciente, servicio y estado, y los huecos libres con su inicio y su fin.
- **FR-016**: Un hueco libre DEBE ser cualquier tramo continuo dentro del horario que no esté ocupado por una cita reservada o completada.
- **FR-017**: Las citas canceladas y no asistidas DEBEN seguir visibles y distinguirse de las que ocupan hueco. El estado NO DEBE comunicarse solo por el color.
- **FR-018**: La agenda NO DEBE ofrecer reservar en tramos ya pasados.
- **FR-019**: Tras un rechazo por solape, recepción DEBE ver los huecos actuales de ese día junto al formulario, con lo que había escrito. Cambiar de profesional durante el alta, tras un rechazo o no, DEBE conservar lo escrito, salvo el servicio si no es de la nueva especialidad.

**Estados**

- **FR-020**: Recepción DEBE poder marcar una cita reservada como completada, cancelada o no asistida, según RN4 y RN5. El paciente solo puede cancelar, por cualquiera de sus canales y dentro del plazo de RN8; nunca marca una cita como completada ni como no asistida. Toda cancelación, la haga quien la haga, DEBE pasar por la operación única de cancelar (FR-038). El sistema DEBE rechazar cualquier otra transición.
- **FR-021**: Cada acción de estado DEBE pedir confirmación y avisar de que no se puede deshacer.
- **FR-022**: El sistema NO DEBE cambiar el estado de ninguna cita por su cuenta.
- **FR-036**: Toda cancelación DEBE registrar su origen («recepción», «portal» o «correo») y su momento, en hora local de la clínica, en la misma operación que cambia el estado a cancelada, y como parte indivisible de ella: si la cancelación no prospera, no se registra nada. El origen y el momento NO DEBEN rellenarse ni corregirse después, y una cita que no está cancelada NO DEBE tener origen ni momento de cancelación. El origen es el canal que registró la cancelación: lo que recepción cancela es siempre «recepción», y «portal» y «correo» son los dos orígenes del paciente.
- **FR-038 (operación única de cancelar, S-05)**: Toda cancelación DEBE registrarse mediante una única operación, la misma para todos los canales. Ninguna pantalla, vía ni spec DEBE cancelar una cita de otra forma.
  - **Entrada**: la cita y el canal que registra la cancelación: «recepción», «portal» o «correo». El canal es el origen de FR-036.
  - **Reglas**: aplica siempre RN4 y, si el canal es del paciente («portal» o «correo»), también RN8, con el «ahora» del sistema en el momento de registrar y no el de la pantalla. Con el canal «recepción» no hay plazo (RN5).
  - **Indivisible**: comprobar el estado y el plazo, cambiar la cita a cancelada y registrar el origen y el momento (FR-036) son una sola operación indivisible. Si llegan a la vez varias cancelaciones de la misma cita, por el mismo canal o por canales distintos, exactamente una la cancela, y las demás obtienen «ya estaba cancelada».
  - **Resultado**: devuelve siempre uno de estos cuatro, que se comprueban en este orden:

    | Resultado | Cuándo | Devuelve además | Efecto sobre la cita |
    |-----------|--------|-----------------|----------------------|
    | **Ya estaba cancelada** | La cita ya está cancelada | El origen y el momento previos, que la 002 necesita para elegir su mensaje (002/FR-017) | Ninguno |
    | **No cancelable** | La cita está completada o no asistida | Su estado | Ninguno |
    | **Fuera de plazo** | Canal del paciente, cita reservada y pasado el límite de RN8 | La fecha y la hora del límite de RN8, en hora local de la clínica | Ninguno |
    | **Cancelada ahora** | Cita reservada y, si el canal es del paciente, dentro de RN8 | El origen y el momento recién registrados | Queda cancelada y su tramo, libre |

  - **Resultado y mensaje**: la 001 define el resultado, no el texto. Cada canal elige el mensaje que ve la persona según el resultado: recepción en la agenda (HU3, escenario 5, y FR-027), el portal según 002/FR-017 y el correo según 003/FR-014. Ningún resultado distinto de «cancelada ahora» cambia la cita, su origen ni su momento (HU6, escenario 8).

**Fechas, horas e importes** (constitución, principio II)

- **FR-023**: Cada clínica DEBE tener su zona horaria (península o Canarias), y toda hora DEBE mostrarse en la hora local de la clínica, igual desde cualquier dispositivo. Toda pantalla que muestre horas de citas DEBE indicar a qué hora local se refieren.
- **FR-024**: Las fechas DEBEN mostrarse como día, mes y año (`dd/mm/aaaa`) y las horas en formato de 24 horas, también en los campos donde se escriben, sea cual sea el idioma del navegador.
- **FR-025**: **Días de cambio de hora**: una cita conserva su hora local a ambos lados del cambio, de modo que las 10:00 siguen siendo las 10:00. Ninguna cita puede empezar, terminar ni atravesar la hora que no existe o que se repite ese día, y el sistema rechaza el intento con un mensaje claro. Esa hora es de 02:00 a 03:00 en la península y de 01:00 a 02:00 en Canarias.
- **FR-026**: Los precios DEBEN ser exactos al céntimo y mostrarse con el formato español (`40,00 €`).

**Mensajes e interfaz** (constitución, principios VII y VIII)

- **FR-027**: Todos los textos DEBEN estar en español de España, sin jerga técnica, y cada error DEBE decir qué ha pasado y qué puede hacer la persona. Esto incluye los avisos de validación de los formularios, que NO DEBEN depender del idioma del navegador. Los estados se muestran como «Reservada», «Completada», «Cancelada» y «No asistida». Hay una única etiqueta más: una cita cancelada con origen «portal» o «correo» (FR-036) se muestra como «Cancelada por el paciente», con la fecha y la hora de la cancelación en los formatos de FR-023 y FR-024 (por ejemplo, «Cancelada por el paciente el 08/11/2026 a las 19:30»), sin distinguir entre los dos canales. Las canceladas con origen «recepción» siguen mostrándose como «Cancelada». Ninguna otra spec añade etiquetas de estado sin cambiar antes este requisito.
- **FR-028**: La interfaz DEBE funcionar desde 360 píxeles de ancho hasta el portátil de recepción, sin desplazamiento horizontal, con contraste de al menos 4,5:1 en texto normal, y con controles táctiles de al menos 44 × 44 píxeles.

**Datos de demostración** (constitución, principio V)

- **FR-029**: La semilla DEBE generar: Clínica Eleva; 3 profesionales (María y Jorge, fisioterapia; Lucía, nutrición); 40 pacientes ficticios; y estos 4 servicios:

  | Servicio | Especialidad | Duración | Precio |
  |----------|--------------|----------|--------|
  | Sesión de fisioterapia | Fisioterapia | 45 min | 40,00 € |
  | Primera visita de fisioterapia | Fisioterapia | 60 min | 50,00 € |
  | Consulta de nutrición | Nutrición | 30 min | 35,00 € |
  | Primera consulta de nutrición | Nutrición | 45 min | 45,00 € |

  Además, la semilla DEBE generar el teléfono de la clínica, ficticio (`000 200 000`), y un enlace personal de demostración para cada uno de los 40 pacientes, con la forma que fije el modelo de acceso de la 002. Esos enlaces DEBEN ser deterministas (mismos parámetros, mismos enlaces) y son, como la clave `eleva-demo` (FR-002), ficticios y públicos: pueden aparecer en el código y en la documentación, y NO DEBEN usarse con datos reales. Las 37 citas canceladas de la historia DEBEN nacer con origen «recepción» y con el inicio de la cita como momento de la cancelación (FR-036), de modo que se muestran como «Cancelada».

- **FR-030**: La semilla DEBE generar 8 semanas de historia en estados definitivos, de las que entre el 9 % y el 11 % sean no asistidas, entre el 7 % y el 9 % canceladas y el resto completadas, calculado sobre el total de citas de la historia. Son **porcentajes de composición de la semilla**, no tasas: dicen cómo se reparte la historia generada, y nadie debe leer el de no asistidas como una «tasa de no asistencia», cuya única definición en el producto es 004/RA3 (S-06). Cifras exactas con el lunes por defecto, reproducibles con `npm run semilla`: 40 pacientes; 463 citas de historia, de las que 380 son completadas (82,1 %), 46 no asistidas (9,9 %) y 37 canceladas (8,0 %); y 57 reservas futuras.
  - **Cifras de citas**: el cambio del 10/11/2026 (teléfono, enlaces y origen, FR-029) no altera ninguna de esas cifras. Son estas cifras, y no los resúmenes, lo que las demás specs DEBEN proteger cuando digan que no alteran la semilla.
  - **Resúmenes de contenido**: identifican el contenido exacto de la semilla, incluidos los datos de la clínica y de los pacientes, así que el cambio del 10/11/2026 los cambia una sola vez. Resumen de contenido: `ae3ce97082c1ccf185b546cb8665f7267d56768f330d5f23a92ed5492e30334f`. Resumen sin fechas: `0937418925ee10348d05a9541c24107a5098ea82a585ce8c57f5f6b5b85a3329`. Los de la versión `110b41c` eran `f1d7a17b9fa57c74ae6b40814b7f41eacfd084559e412f8a0106857d142b74e8` y `fc363c0bc66969d7090dac873ba44d69a64482470f5d8f7d0d9dee54fd273d40`, y dejan de ser válidos. Cómo se calcularon y qué debe reproducir la implementación está en el [Historial de cambios](#historial-de-cambios) (decisión D4).
  - **Única fuente**: este requisito es la única fuente de los resúmenes. Ninguna otra spec los copia: los citan como «resumen de contenido de FR-030 de la 001».
- **FR-031**: La semilla DEBE generar 2 semanas futuras solo con citas reservadas, dejando huecos libres cada día laborable. «Futuras» se mide desde el lunes de referencia, no desde el reloj: si ese lunes ya ha pasado, parte de esas citas queda en el pasado y sigue reservada, sin cerrar.
- **FR-032**: Con los mismos parámetros, la semilla DEBE producir un resultado idéntico, sea quien sea quien la genere y sea cuando sea. Repetirla NO DEBE duplicar datos. Sus parámetros incluyen un lunes de referencia, que por defecto es el 02/11/2026 y marca el inicio de las 2 semanas futuras; las 8 semanas de historia son las anteriores. Pasar otro lunes desplaza toda la historia por semanas completas: mismas citas, horas y cifras, y solo cambian las fechas del calendario. La generación NO DEBE depender del reloj.
- **FR-033**: La semilla DEBE cumplir todas las reglas de agenda (RN1, RN3 a RN7), con dos excepciones: no aplica RN2, y la historia se carga directamente en su estado definitivo, porque registra lo que ya ocurrió. Un paciente NO DEBE tener más de una primera visita completada de la misma especialidad.
- **FR-034**: Todos los datos DEBEN ser ficticios y en español de España, con teléfonos y correos que no correspondan a personas reales.

**Pruebas** (constitución, principios III y VI)

- **FR-035**: Cada regla de negocio y cada criterio de aceptación DEBE tener un test que lo referencie, incluidas pruebas que intenten provocar solapes con reservas simultáneas, tanto del hueco exacto como parciales.

### Entidades clave

- **Clínica**: la consulta que usa el producto. Tiene nombre, clave de acceso, zona horaria y teléfono, que es el que se da a los pacientes. Todo lo demás pertenece a una clínica.
- **Profesional**: quien atiende las citas. Tiene nombre y especialidad.
- **Servicio**: lo que se ofrece. Tiene nombre, especialidad, duración en minutos y precio en euros.
- **Paciente**: ficha de una persona atendida. Tiene nombre, teléfono y, si lo facilita, correo electrónico. Accede a sus citas solo a través del modelo de acceso de la 002 (FR-001), nunca a la agenda ni a nada de recepción (FR-037).
- **Cita**: une un profesional, un servicio y un paciente de la misma clínica, con inicio, fin y estado (reservada, completada, cancelada o no asistida). Si está cancelada, guarda además el origen de la cancelación («recepción», «portal» o «correo») y su momento (FR-036).
- **Sesión**: lo que permite seguir usando el producto tras identificarse. Hay dos clases, separadas: la de recepción, que se abre con la clave de la clínica, y la de paciente, que se abre con una credencial del modelo de acceso de la 002 (FR-037).

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: En 1.000 rondas de reservas simultáneas sobre tramos que se solapan, cada ronda termina con exactamente una cita registrada y un rechazo claro para las demás: cero solapes.
- **SC-002**: Al menos 9 de cada 10 personas de recepción sin formación previa registran una cita para un paciente existente en menos de 1 minuto desde la agenda.
- **SC-003**: Al menos 9 de cada 10 personas sin formación ni manual completan a la primera las tres tareas habituales: encontrar un hueco, reservar y cancelar.
- **SC-004**: Recepción ve la agenda de un día, o cambia de profesional o de día, en menos de 1 segundo en su uso normal, con el volumen de los datos de demostración.
- **SC-005**: Dos generaciones de la semilla con los mismos parámetros, en máquinas y fechas distintas, son idénticas en el 100 % de los registros.
- **SC-006**: Los datos de demostración contienen cero solapes, y sus porcentajes cumplen FR-030.
- **SC-007**: El 100 % de las pantallas cumple los umbrales de FR-028 a 360 píxeles de ancho y en el portátil.
- **SC-008**: El 100 % de las reglas RN1 a RN8 y de los escenarios de aceptación tiene un test que los referencia, y la suite está en verde. SC-002 y SC-003 no tienen test automático, porque miden el uso real de personas sin formación y un test no puede medirlo: se comprueban a mano con el protocolo de `checklists/entrega.md` (constitución, principio VI).
- **SC-009**: Una cita se ve a la misma hora local desde dispositivos en zonas horarias distintas y en semanas a ambos lados de un cambio de hora, en el 100 % de los casos comprobados.
- **SC-010**: El 100 % de los intentos de cancelación del paciente se resuelve igual por el portal y por el correo: se aceptan hasta el minuto límite de RN8 incluido y se rechazan desde el minuto siguiente, también en semanas a ambos lados de un cambio de hora.
- **SC-011**: El 100 % de las cancelaciones muestra el origen y la etiqueta correctos (FR-027 y FR-036), y ninguna cita cancelada queda sin origen ni momento.
- **SC-012**: Cero consultas u operaciones de recepción o del panel de analítica prosperan con una sesión de paciente, en el 100 % de las rutas comprobadas.
- **SC-013**: El 100 % de las cancelaciones, por cualquier canal, se registra mediante la operación única de cancelar (FR-038): ninguna vía cancela una cita sin pasar por ella. En 1.000 rondas de cancelaciones simultáneas de la misma cita por canales distintos, cada ronda termina con exactamente un «cancelada ahora», un solo origen y un solo momento.

## Supuestos

- **Una sola clave por clínica (deuda consciente)**: no hay usuarios individuales, y por tanto no se sabe qué persona hizo cada acción. Tampoco hay en esta versión cambio de clave, recuperación ni límite de intentos. La entrada se decide solo por la clave, así que dos clínicas no deben compartirla: en la 001 no puede ocurrir, porque solo se carga una clínica y no hay pantallas para crear otras, y la spec que lo permita deberá impedirlo. Esta deuda debe resolverse antes de usar el producto con datos reales de pacientes.
- **Los servicios tienen especialidad**: el encargo no lo cita, pero sin ello se podría reservar una consulta de nutrición con un fisioterapeuta. Es lo mínimo para que RN7 sea posible.
- **Configuración fija**: en la 001 no hay pantallas para gestionar la clínica, los profesionales ni los servicios. Se cargan con la semilla.
- **Sin editar citas**: mover o reprogramar queda fuera de esta feature. Para cambiar una cita se cancela y se crea otra. Las transiciones definitivas tampoco tienen deshacer; por eso se pide confirmación.
- **Marcar a partir de la hora de inicio**: el encargo solo lo implica para «no asistida». Se aplica también a «completada» para evitar cierres anticipados por error.
- **Horas en múltiplos de 15 minutos**: encaja con las duraciones de los 4 servicios (30, 45 y 60 minutos).
- **Clínica Eleva está en la península**.
- **Festivos y ausencias fuera de alcance**: la agenda no los modela, y la semilla trata todos los días laborables por igual.
- **Precio por servicio**: como los servicios no se editan en la 001, la cita toma el precio del servicio. Guardar el precio histórico corresponderá a la spec que permita cambiarlo.
- **Sin detección de fichas duplicadas**: un teléfono puede repetirse, porque una familia puede compartirlo.
- **Sin caducidad de sesión**: la sesión dura hasta salir o cerrar el navegador. Forma parte de la deuda de autenticación.
- **Conexión sin cifrar (deuda consciente)**: la 001 no cifra la conexión, y la clave y los datos viajan en claro entre el navegador y el servidor. Sirve para demostraciones con datos ficticios. Forma parte de la deuda de autenticación: antes de usar datos reales de pacientes, la conexión debe ir cifrada y la cookie de sesión debe limitarse a ella. Es la primera condición de la puerta de uso con datos reales (FR-039), que fija además las otras dos.
- **Teléfono de la clínica en la semilla**: `000 200 000`, de la misma familia ficticia que los teléfonos de los pacientes, para cumplir FR-034.
- **Momento de las canceladas de la semilla**: la historia no registra cuándo se canceló cada cita, así que se toma su inicio. Es determinista y se desplaza con el lunes de referencia (FR-032), y no se muestra, porque las canceladas por recepción no llevan fecha en la etiqueta.
- **El plazo se prueba como regla**: la 001 no abre ningún canal del paciente. RN8 y la historia 6 se prueban en la 001 como reglas, indicando el canal y el momento, y la 002 y la 003 prueban además sus pantallas citando estos identificadores.
- **Fuera de alcance de la 001** (specs propias): las pantallas y el modelo de acceso del paciente (002), los recordatorios (003), la analítica (004) y los pagos online. La 001 solo fija la excepción a la clave (FR-001), la separación de sesiones (FR-037), el plazo (RN8), el origen y la etiqueta de las cancelaciones (FR-027 y FR-036), la operación única de cancelar (FR-038), la puerta de uso con datos reales (FR-039) y los datos de semilla que esas features necesitan (FR-029).

## Historial de cambios

### 10/11/2026: resolución de los bloqueantes de la revisión cruzada (aprobado el 10/11/2026)

Aplica, en un único cambio, lo que el informe `specs/000-revision-cruzada-nov2026.md` asigna a la 001 en sus cuatro bloqueantes, con las decisiones tomadas por Sara (002) y AntonioLV1999 (001, 003 y 004). La 001 pasa a ser la propietaria de estos conceptos, y las demás specs los citan en lugar de definirlos (constitución: «la decisión queda escrita en las specs afectadas»).

| Hallazgo | Decisión | Cambios en esta spec |
|----------|----------|----------------------|
| **S-01** Plazo de cancelación del paciente | **D1**: 2 horas antes del inicio, en todos los canales | RN8 (nueva), RN5 (recepción sin plazo; el paciente remite a RN8), HU6 escenarios 1 a 5, SC-010 |
| **S-02** Origen y momento de la cancelación | — | FR-036 (nuevo), FR-027 (etiqueta «Cancelada por el paciente»), entidad Cita, HU6 escenarios 6 a 8, SC-011 |
| **S-03** Semilla y resúmenes | — | FR-029 (teléfono, enlaces y origen), FR-030 (cifras protegidas, resúmenes nuevos y única fuente), HU5 escenario 4, entidad Clínica |
| **S-04** Acceso del paciente | **D2**: dos credenciales, un único modelo de acceso definido por la 002 | FR-001 (única excepción), FR-037 (nuevo), HU4 escenario 5, entidades Paciente y Sesión, SC-012 |

- **Estado**: la spec estaba aprobada el 06/11/2026. Este cambio, con las secciones siguientes (S-05, S-08, S-18 y S-06), lo **aprobó su propietario, AntonioLV1999, el 10/11/2026**, y ya se puede implementar (principio I).
- **Suite en rojo (S-18, opción c, decisión del propietario del 10/11/2026)**: el cambio se implementa nada más aprobarlo, con sus tests, para que la suite vuelva a verde. Mientras dura la implementación, el test de trazabilidad sigue en rojo, y es un rojo esperado y acotado:
  - **Lo que falla**: los identificadores de este cambio que aún no tienen test: RN8, HU4 escenario 5, HU5 escenario 4, HU6 escenarios 1 a 9, y SC-010 a SC-013. Falla también el recuento fijo de reglas, escenarios y criterios del propio test.
  - **Lo que no se hace**: el test no se relaja ni se desactiva (principio VI). Solo se actualiza su recuento para que coincida con esta spec.
  - **Cualquier otro fallo** es una regresión y se trata como tal.
  - **Cuándo acaba**: con la implementación de este cambio, que no se integra hasta que la suite esté en verde. Las ramas de la 002, la 003 y la 004 se rebasan sobre ella, no sobre el rojo.
- **Resúmenes de FR-030 (decisión D4, S-18)**: se calcularon antes de aprobar, sin implementar en el tronco. Así se rompe el círculo de S-18, en el que no se implementaba sin aprobar ni se aprobaba sin los resúmenes. El procedimiento fue este:
  - En un worktree desechable sacado de `master` (`bdc7c26`), se aplicaron solo los datos nuevos de FR-029, con los cambios mínimos de esquema y semilla.
  - Se ejecutó `npm run semilla`, y los resúmenes salieron de la misma función `resumen()` de `src/semilla/carga.js`.
  - Las cifras de citas no cambiaron: 40 pacientes; 463 de historia, con 380 completadas, 46 no asistidas y 37 canceladas; y 57 futuras.
  - Dos ejecuciones dieron los mismos resúmenes (FR-032). Con otro lunes (04/01/2027), el resumen sin fechas fue el mismo.
  - En la base, las 37 canceladas quedaron con origen «recepción» y momento igual al inicio, y los 40 enlaces resultaron distintos.
  - Después se descartaron el worktree y su código.
- **La implementación DEBE reproducir esos dos valores**: si da otros, el defecto está en la implementación, no en FR-030. Los resúmenes son el SHA-256 del JSON del objeto que genera la semilla, así que dependen de los valores, de los nombres de los campos y de su orden:
  - **Clínica**: `nombre`, `zona_horaria`, `telefono` (`000 200 000`), `clave_hash` y `clave_sal`, en ese orden.
  - **Paciente**: `nombre`, `telefono`, `email` y `enlace`, en ese orden.
  - **Cita cancelada de la historia**: tras `inicio` y `fin`, `origen_cancelacion` (`recepcion`) y `momento_cancelacion`, igual a `inicio` y con su mismo formato. Las citas que no están canceladas no llevan esos dos campos, ni siquiera vacíos (FR-036).
  - **Resumen sin fechas**: además de `inicio` y `fin`, quita `momento_cancelacion`, porque también es una fecha. Si no lo quitara, cambiaría con el lunes de referencia, y FR-032 exige que no cambie.
- **Forma del enlace personal de demostración**: la 002 no fija una forma concreta (002/FR-025 solo exige que los de la semilla sean deterministas). Se usó esta:
  - Solo el token, sin ruta ni dominio: los 32 primeros caracteres hexadecimales del SHA-256 del texto `citaclara-enlace-<semilla>-<n>`. La semilla es la de `src/semilla/datos-base.js` (`20261102`), y `<n>` es el número del paciente en el orden de la semilla, de 1 a 40.
  - Por ejemplo, el primer paciente, David Gil, tiene `c73f5e835397826416bda7b3e5323d02`.
  - Guardar solo el token permite que la 002 fije la ruta del portal sin cambiar los resúmenes. Cualquier otra forma de token sí los cambiaría.
- **Notas para la implementación**, que no afectan a los resúmenes porque se calculan sobre el objeto generado y no sobre la base:
  - El disparador `cita_rn4` rechaza cualquier UPDATE de una cita que ya no está reservada, así que el origen y el momento de las canceladas de la semilla se escriben en el mismo INSERT.
  - Algunos tests crean otras clínicas sin teléfono, así que la columna del teléfono de la clínica no pudo ser obligatoria sin tocarlos.
  - El diff aplicado se guardó como referencia fuera del repositorio.
- **Tests que cambiarán** (principio VI, primero la spec): «FR-001 solo la pantalla de acceso es pública» admitirá las rutas públicas del modelo de acceso de la 002, y los de trazabilidad pasarán a exigir RN8.
- **Fuera de este cambio**: los demás hallazgos que el informe asigna a la 001 (S-13 a S-17) y el hallazgo colateral de `src/datos/`. S-05 y S-08 entran en este mismo cambio (ver la sección siguiente).

#### S-05 y S-08: operación única de cancelar y puerta de uso con datos reales (mismo cambio)

La 002, la 003 y la 004 ya citaban estos dos conceptos, y la 001 no los definía (informe, S-05 y S-08). Entran en el mismo cambio del 10/11/2026, antes de aprobarlo, como pide la resolución de S-18. No cambian la semilla ni sus cifras.

| Hallazgo | Cambios en esta spec |
|----------|----------------------|
| **S-05** Operación única de cancelar | FR-038 (nuevo): canal de entrada, RN4 y RN8, FR-036 en una sola operación indivisible, y cuatro resultados («cancelada ahora», «ya estaba cancelada» con su origen, «fuera de plazo» con el límite y «no cancelable» con el estado). FR-020 (el paciente cancela dentro de RN8, y toda cancelación pasa por FR-038). HU3 escenario 5 (se mantiene para recepción; el paciente trata «ya estaba cancelada» sin error). HU6 escenario 9 (nuevo: portal y correo a la vez). SC-013 (nuevo). Caso límite «Dos acciones de estado a la vez» |
| **S-08** Puerta de uso con datos reales | FR-039 (nuevo): conexión cifrada con la cookie limitada a ella, revisión de protección de datos con el riesgo del enlace sin caducidad de la 002, y responsable y fecha. Supuesto «Conexión sin cifrar (deuda consciente)», que pasa a citar FR-039 |

- **Responsable y fecha de FR-039** (decisión del propietario, 10/11/2026): el responsable es AntonioLV1999, y la fecha es la de la comprobación de las condiciones, que se escribirá cuando ocurra. Que falte no impide aprobar: significa que la puerta aún no se cumple, que es el estado actual.
- **Tests que cambiarán** (principio VI, primero la spec): la cancelación de recepción, que hoy responde con un rechazo a una cita ya cancelada y no recibe canal, pasará por FR-038, y los de trazabilidad exigirán HU6 escenario 9 y SC-013.
- **Lo que harán las features** al rebasarse sobre la 001 aprobada: sustituir «la operación única de cancelar» por FR-038 (002: RP4, FR-015, FR-017 y HU3 escenarios 6 y 7; 003: RR4, FR-014, casos límite y Dependencias) y «la puerta de uso con datos reales» por FR-039 (002/FR-006, 003/FR-018 y el supuesto «Misma clave, mismas cifras» de la 004). Lo aplica cada propietario en su spec.

#### S-06: nombre del porcentaje de FR-030 (mismo cambio)

- FR-030 llama a sus cifras «porcentajes de composición de la semilla» y remite a 004/RA3 como única definición de la tasa de no asistencia. HU5 escenario 3 usa el mismo nombre. No cambian los márgenes, las cifras ni los resúmenes.
