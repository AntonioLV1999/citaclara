# Especificación de feature: Núcleo de agenda

**Rama de la feature**: `001-nucleo-agenda`

**Creada**: 05/11/2026

**Estado**: Borrador

**Propietario**: AntonioLV1999 (registrado en `specs/MAPA.md`)

**Entrada**: descripción de la persona usuaria: «Núcleo de agenda de CitaClara. Clínicas pequeñas (2-5 profesionales); la recepción gestiona la agenda; los pacientes, de momento, solo existen como fichas. Entidades, citas y sus estados, RN1 y RN2, interfaz de recepción, acceso con clave de clínica y semilla determinista de Clínica Eleva. Fuera de alcance: acceso del paciente, recordatorios, analítica y pagos online».

## Aclaraciones

### Sesión del 05/11/2026

- P: ¿Cómo se fijan las fechas de la semilla? → R: lunes de referencia fijo como parte de la semilla, con desplazamiento explícito por semanas completas (FR-032).
- P: ¿Puede recepción crear fichas de pacientes en la 001? → R: sí, un alta mínima dentro del alta de cita, con correo opcional (FR-013).
- P: ¿Qué horario aplica? → R: horario único de clínica, de lunes a viernes de 09:00 a 20:00 (FR-012).
- P: ¿Quién es el propietario de la spec? → R: AntonioLV1999.

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
5. **Dada** una cita completada, cancelada o no asistida, **cuando** se intenta cambiar su estado, **entonces** se rechaza con un mensaje que indica el estado en que ya está.
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

---

### Historia de usuario 5 - Disponer de datos de demostración reproducibles (Prioridad: P2)

Cualquier persona del equipo genera los datos ficticios de Clínica Eleva y obtiene exactamente la misma historia, para demostrar el producto y citar números verificables.

**Por qué esta prioridad**: lo exige la constitución (principio V) y es la base de prueba de las demás historias.

**Prueba independiente**: generar los datos dos veces, en máquinas y momentos distintos, y comparar el resultado.

**Escenarios de aceptación**:

1. **Dados** los mismos parámetros de semilla, **cuando** se generan los datos dos veces, **entonces** el resultado es idéntico, sin duplicados.
2. **Dados** los datos generados, **cuando** se revisa cada profesional, **entonces** ninguna cita reservada o completada solapa otra.
3. **Dados** los datos generados, **cuando** se cuentan las citas de la historia, **entonces** los porcentajes de no asistencia y de cancelación están dentro de los márgenes de FR-030.

---

### Casos límite

- **Agenda desactualizada**: recepción tiene abierta una agenda antigua y reserva un hueco que otra persona acaba de ocupar. El sistema rechaza la reserva y recepción ve la agenda al día.
- **Doble pulsación o reintento**: la misma alta llega dos veces. Solo queda una cita, y la segunda petición se rechaza como cualquier solape.
- **Dos acciones de estado a la vez** sobre la misma cita (por ejemplo, cancelar y completar): solo una prospera; la otra recibe un mensaje con el estado resultante.
- **El servicio no cabe en el hueco**: una cita de 60 minutos en un hueco libre de 45 se rechaza por solapar la siguiente o por salirse del horario.
- **Cita reservada ya pasada sin cerrar**: sigue reservada y ocupando su tramo. El sistema nunca cambia estados por su cuenta; recepción la cierra cuando pueda.
- **Cancelación registrada tarde**: si el paciente avisó y recepción lo anota después de la hora, se marca como cancelada, no como no asistida, porque «no asistida» significa exclusivamente que no se presentó.
- **Hueco liberado y vuelto a ocupar**: la agenda muestra en el mismo tramo la cita cancelada y la nueva sin confundirlas.
- **Mismo paciente, dos profesionales a la misma hora**: no se impide en esta feature; RN1 protege al profesional.
- **Reloj del dispositivo equivocado o en otra zona horaria**: no afecta. «Ahora» y «hoy» los fija el sistema en la hora local de la clínica.
- **Datos de otra clínica**: una cita no puede combinar profesional, servicio o paciente de clínicas distintas, y ninguna clínica ve datos de otra.

## Requisitos *(obligatorio)*

### Reglas de negocio

Los tests de esta feature referencian estos identificadores (constitución, principio VI).

- **RN1 (capital)**: dos citas del mismo profesional se solapan si cada una empieza antes de que acabe la otra. No puede crearse una cita que solape otra reservada o completada del mismo profesional, sea cual sea su origen y aunque las peticiones lleguen a la vez: exactamente una prospera. La garantía la da el sistema y no depende de la interfaz. Las citas canceladas y no asistidas no ocupan el hueco.
- **RN2**: no se crean citas cuyo inicio sea anterior al momento actual, según la hora local de la clínica. Una cita que empiece en ese mismo minuto se acepta. Los datos de demostración son la única excepción.
- **RN3**: el fin de una cita es siempre su inicio más la duración del servicio, y no se introduce a mano.
- **RN4**: una cita nace reservada. Las únicas transiciones son reservada → completada, reservada → cancelada y reservada → no asistida. Los tres estados de llegada son definitivos.
- **RN5**: una cita solo se marca como completada o no asistida cuando ha llegado su hora de inicio. Se puede cancelar en cualquier momento mientras siga reservada.
- **RN6**: «no asistida» significa exclusivamente que el paciente no se presentó a una cita que seguía reservada.
- **RN7**: un profesional solo atiende servicios de su especialidad.

### Requisitos funcionales

**Acceso**

- **FR-001**: El sistema DEBE exigir la clave de la clínica para cualquier consulta u operación, por cualquier vía, y no solo ocultarlas en pantalla.
- **FR-002**: Cada clínica DEBE tener una única clave, que NO DEBE mostrarse nunca en pantalla ni guardarse de forma legible.
- **FR-003**: Recepción DEBE poder salir, tras lo cual hará falta de nuevo la clave.
- **FR-004**: El sistema DEBE limitar cada sesión a los datos de su clínica.

**Alta de cita**

- **FR-005**: Recepción DEBE poder crear una cita eligiendo profesional, servicio, paciente, día y hora de inicio.
- **FR-006**: El alta DEBE poder iniciarse desde un hueco libre de la agenda, con profesional, día y hora ya rellenados.
- **FR-007**: El sistema DEBE permitir localizar al paciente escribiendo parte de su nombre o de su teléfono.
- **FR-008**: El alta DEBE ofrecer solo servicios de la especialidad del profesional, y el sistema DEBE rechazar cualquier combinación incompatible (RN7).
- **FR-009**: El alta DEBE mostrar la duración, el precio y la hora de fin resultante antes de confirmar.
- **FR-010**: El sistema DEBE aplicar RN1, RN2 y RN3 en el momento de registrar la cita, y si la rechaza, DEBE dejar la agenda intacta.
- **FR-011**: Las horas de inicio DEBEN caer en múltiplos de 15 minutos.
- **FR-012**: Una cita DEBE empezar y terminar dentro del horario de la clínica, que en la 001 es único y fijo para todos: de lunes a viernes, de 09:00 a 20:00, en hora local de la clínica.
- **FR-013**: Durante el alta de una cita, recepción DEBE poder crear la ficha de un paciente nuevo con nombre y teléfono obligatorios y correo electrónico opcional. La ficha y la cita se registran juntas: si la cita se rechaza, no queda ficha y el formulario conserva lo escrito. Fuera del alta de cita no se gestionan pacientes.

**Agenda del día**

- **FR-014**: Recepción DEBE poder ver la agenda de un profesional para cualquier día, pasado o futuro, y la vista DEBE abrirse en el día de hoy.
- **FR-015**: La agenda DEBE mostrar en orden horario las citas del día con inicio, fin, paciente, servicio y estado, y los huecos libres con su inicio y su fin.
- **FR-016**: Un hueco libre DEBE ser cualquier tramo continuo dentro del horario que no esté ocupado por una cita reservada o completada.
- **FR-017**: Las citas canceladas y no asistidas DEBEN seguir visibles y distinguirse de las que ocupan hueco. El estado NO DEBE comunicarse solo por el color.
- **FR-018**: La agenda NO DEBE ofrecer reservar en tramos ya pasados.
- **FR-019**: Tras un rechazo por solape, recepción DEBE ver la agenda actualizada.

**Estados**

- **FR-020**: Recepción DEBE poder marcar una cita reservada como completada, cancelada o no asistida, según RN4 y RN5. El sistema DEBE rechazar cualquier otra transición.
- **FR-021**: Cada acción de estado DEBE pedir confirmación y avisar de que no se puede deshacer.
- **FR-022**: El sistema NO DEBE cambiar el estado de ninguna cita por su cuenta.

**Fechas, horas e importes** (constitución, principio II)

- **FR-023**: Cada clínica DEBE tener su zona horaria (península o Canarias), y toda hora DEBE mostrarse en la hora local de la clínica, igual desde cualquier dispositivo. La agenda DEBE indicar a qué hora local se refieren sus horas.
- **FR-024**: Las fechas DEBEN mostrarse como día, mes y año (`dd/mm/aaaa`) y las horas en formato de 24 horas.
- **FR-025**: **Días de cambio de hora**: una cita conserva su hora local a ambos lados del cambio, de modo que las 10:00 siguen siendo las 10:00. Ninguna cita puede empezar, terminar ni atravesar la hora que no existe o que se repite ese día, y el sistema rechaza el intento con un mensaje claro. Esa hora es de 02:00 a 03:00 en la península y de 01:00 a 02:00 en Canarias.
- **FR-026**: Los precios DEBEN ser exactos al céntimo y mostrarse con el formato español (`40,00 €`).

**Mensajes e interfaz** (constitución, principios VII y VIII)

- **FR-027**: Todos los textos DEBEN estar en español de España, sin jerga técnica, y cada error DEBE decir qué ha pasado y qué puede hacer la persona. Los estados se muestran como «Reservada», «Completada», «Cancelada» y «No asistida».
- **FR-028**: La interfaz DEBE funcionar desde 360 píxeles de ancho hasta el portátil de recepción, sin desplazamiento horizontal, con contraste de al menos 4,5:1 en texto normal, y con controles táctiles de al menos 44 × 44 píxeles.

**Datos de demostración** (constitución, principio V)

- **FR-029**: La semilla DEBE generar: Clínica Eleva; 3 profesionales (María y Jorge, fisioterapia; Lucía, nutrición); 40 pacientes ficticios; y estos 4 servicios:

  | Servicio | Especialidad | Duración | Precio |
  |----------|--------------|----------|--------|
  | Sesión de fisioterapia | Fisioterapia | 45 min | 40,00 € |
  | Primera visita de fisioterapia | Fisioterapia | 60 min | 50,00 € |
  | Consulta de nutrición | Nutrición | 30 min | 35,00 € |
  | Primera consulta de nutrición | Nutrición | 45 min | 45,00 € |

- **FR-030**: La semilla DEBE generar 8 semanas de historia en estados definitivos, de las que entre el 9 % y el 11 % sean no asistidas, entre el 7 % y el 9 % canceladas y el resto completadas, calculado sobre el total de citas de la historia. Las cifras exactas resultantes se anotarán en esta spec.
- **FR-031**: La semilla DEBE generar 2 semanas futuras solo con citas reservadas, dejando huecos libres cada día laborable.
- **FR-032**: Con los mismos parámetros, la semilla DEBE producir un resultado idéntico, sea quien sea quien la genere y sea cuando sea. Repetirla NO DEBE duplicar datos. Sus parámetros incluyen un lunes de referencia, que por defecto es el 02/11/2026 y marca el inicio de las 2 semanas futuras; las 8 semanas de historia son las anteriores. Pasar otro lunes desplaza toda la historia por semanas completas: mismas citas, horas y cifras, y solo cambian las fechas del calendario. La generación NO DEBE depender del reloj.
- **FR-033**: La semilla DEBE cumplir todas las reglas de agenda (RN1, RN3 a RN7), salvo RN2 para la historia. Un paciente NO DEBE tener más de una primera visita completada de la misma especialidad.
- **FR-034**: Todos los datos DEBEN ser ficticios y en español de España, con teléfonos y correos que no correspondan a personas reales.

**Pruebas** (constitución, principios III y VI)

- **FR-035**: Cada regla de negocio y cada criterio de aceptación DEBE tener un test que lo referencie, incluidas pruebas que intenten provocar solapes con reservas simultáneas, tanto del hueco exacto como parciales.

### Entidades clave

- **Clínica**: la consulta que usa el producto. Tiene nombre, clave de acceso y zona horaria. Todo lo demás pertenece a una clínica.
- **Profesional**: quien atiende las citas. Tiene nombre y especialidad.
- **Servicio**: lo que se ofrece. Tiene nombre, especialidad, duración en minutos y precio en euros.
- **Paciente**: ficha de una persona atendida, sin acceso al producto. Tiene nombre, teléfono y, si lo facilita, correo electrónico.
- **Cita**: une un profesional, un servicio y un paciente de la misma clínica, con inicio, fin y estado (reservada, completada, cancelada o no asistida).

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: En 1.000 rondas de reservas simultáneas sobre tramos que se solapan, cada ronda termina con exactamente una cita registrada y un rechazo claro para las demás: cero solapes.
- **SC-002**: Una persona de recepción sin formación previa registra una cita para un paciente existente en menos de 1 minuto desde la agenda.
- **SC-003**: Al menos 9 de cada 10 personas sin formación ni manual completan a la primera las tres tareas habituales: encontrar un hueco, reservar y cancelar.
- **SC-004**: Recepción ve la agenda de un día, o cambia de profesional o de día, en menos de 1 segundo en su uso normal, con el volumen de los datos de demostración.
- **SC-005**: Dos generaciones de la semilla con los mismos parámetros, en máquinas y fechas distintas, son idénticas en el 100 % de los registros.
- **SC-006**: Los datos de demostración contienen cero solapes, y sus porcentajes cumplen FR-030.
- **SC-007**: El 100 % de las pantallas cumple los umbrales de FR-028 a 360 píxeles de ancho y en el portátil.
- **SC-008**: El 100 % de las reglas RN1 a RN7 y de los escenarios de aceptación tiene un test que los referencia, y la suite está en verde.
- **SC-009**: Una cita se ve a la misma hora local desde dispositivos en zonas horarias distintas y en semanas a ambos lados de un cambio de hora, en el 100 % de los casos comprobados.

## Supuestos

- **Una sola clave por clínica (deuda consciente)**: no hay usuarios individuales, y por tanto no se sabe qué persona hizo cada acción. Tampoco hay en esta versión cambio de clave, recuperación ni límite de intentos. Esta deuda debe resolverse antes de usar el producto con datos reales de pacientes.
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
- **Fuera de alcance de la 001** (specs propias): cualquier acceso del paciente, recordatorios, analítica y pagos online.
