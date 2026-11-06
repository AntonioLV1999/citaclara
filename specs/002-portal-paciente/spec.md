# Especificación de feature: Portal del paciente

**Rama de la feature**: `002-portal-paciente`

**Creada**: 06/11/2026

**Estado**: Borrador

**Propietario**: Sara (registrada en `specs/MAPA.md`)

**Entrada**: descripción de la persona usuaria: «Portal del paciente. Los pacientes de la clínica quieren ver sus citas y cancelarlas sin llamar por teléfono (Sonia, recepción de Eleva, dedica "la mitad de la mañana" a esto). Alcance: un paciente accede a una página personal moderna donde ve sus citas futuras y pasadas y puede cancelar una cita futura. Interfaz limpia y responsive, pensada para móvil. Preguntas que la spec debe dejar decididas (formúlalas cerradas, para Sara): cómo accede el paciente sin crear cuentas ni contraseñas (las clínicas pequeñas no van a gestionar altas), hasta cuándo puede cancelar, y qué pasa con el hueco liberado. Datos: cita casos reales de la semilla en los ejemplos. Fuera de alcance v1: reservar o mover citas online, pagos».

## Aclaraciones

### Sesión del 06/11/2026

- P: ¿Cómo debe entrar el paciente en el portal sin cuenta ni contraseña? → R: con un enlace personal por ficha, que recepción entrega al paciente (FR-001).
- P: ¿Hasta cuándo puede cancelar el paciente una cita desde el portal? → R: hasta 24 horas antes del inicio (RP3).
- P: ¿Cómo debe enterarse recepción de que un paciente ha liberado un hueco? → R: la cita aparece «Cancelada por el paciente», con fecha y hora, y al abrir la agenda se ve una lista de los huecos liberados por pacientes (FR-019).
- P: ¿Debe caducar el enlace personal del paciente? → R: no, sigue válido hasta que recepción lo anule (FR-001).
- P: ¿Quién es el propietario de esta spec? → R: Sara.

## Escenarios de usuario y pruebas *(obligatorio)*

### Datos de los ejemplos

Todos los casos salen de la semilla con el lunes por defecto (02/11/2026), sin cambios a mano, y con el reloj fijado en el **miércoles 04/11/2026 a las 12:00**, hora peninsular. En ese momento hay 42 citas reservadas futuras de 27 pacientes, y 15 citas reservadas ya pasadas y sin cerrar. De las 42, 36 se pueden cancelar en el portal y 6 ya están a menos de 24 horas. Los datos son ficticios (001, FR-034).

| Paciente | Teléfono | Correo | Próximas citas | Historial |
|----------|----------|--------|----------------|-----------|
| David Gil | 000 100 001 | Sí | 09/11/2026 18:00 con María y 19:00 con Lucía | 11 citas: 8 completadas, 2 no asistidas y 1 del 02/11/2026 sin cerrar |
| Isabel Navarro | 000 100 012 | No | 4: 04/11, 05/11, 10/11 y 11/11/2026 | 15 citas: 13 completadas y 2 no asistidas |
| Javier Peña | 000 100 031 | Sí | 2, la primera el 04/11/2026 a las 12:15 con Jorge | 10 citas |
| Cristina Ortega | 000 100 033 | Sí | 1: 11/11/2026 de 11:15 a 12:00 con Lucía | 8 citas |
| Rocío Marín | 000 100 020 | No | Ninguna | 8 citas completadas |

### Historia de usuario 1 - Entrar sin cuenta ni contraseña (Prioridad: P1)

Recepción entrega al paciente su enlace personal. El paciente lo abre desde el móvil y entra, sin registrarse, sin contraseña y sin que la clínica le dé de alta.

**Por qué esta prioridad**: sin acceso no hay portal, y las clínicas pequeñas no van a gestionar altas. Es también donde se protegen los datos de los pacientes.

**Prueba independiente**: con los datos de demostración, obtener desde recepción el enlace de varios pacientes, con y sin correo, entrar con ellos e intentar entrar con enlaces inventados o anulados.

**Escenarios de aceptación**:

1. **Dada** una cita de Isabel Navarro, que no tiene correo, **cuando** recepción la abre en la agenda, **entonces** puede copiar el enlace personal de esa ficha sin ningún alta previa.
2. **Dado** el enlace de Isabel Navarro, **cuando** lo abre en su móvil, **entonces** entra en su página sin escribir nada.
3. **Dado** un enlace inventado o anulado, **cuando** alguien lo abre, **entonces** ve siempre el mismo mensaje, que le remite a la clínica, y no descubre si esa persona es paciente.
4. **Dada** una persona que prueba enlaces inventados repetidamente, **cuando** supera el límite de intentos, **entonces** el portal le impide seguir durante un tiempo y le dice qué puede hacer.
5. **Dado** un enlace que el paciente ha perdido o ha llegado a otra persona, **cuando** recepción lo anula, **entonces** el enlace anterior deja de funcionar, también en las sesiones abiertas con él, y recepción obtiene uno nuevo.
6. **Dado** David Gil dentro del portal, **cuando** sale, **entonces** hace falta abrir de nuevo su enlace para ver sus citas.
7. **Dado** David Gil dentro del portal, **cuando** intenta abrir la agenda de recepción, **entonces** se rechaza. Y la clave de clínica `eleva-demo` no da acceso a la página de ningún paciente.

---

### Historia de usuario 2 - Ver mis citas (Prioridad: P1)

El paciente ve de un vistazo su próxima cita, el resto de las citas futuras y su historial, sin llamar a la clínica para preguntar.

**Por qué esta prioridad**: resuelve por sí sola las llamadas de «¿cuándo tengo la cita?», y es la base para cancelar.

**Prueba independiente**: entrar como cada paciente de la tabla y comparar lo mostrado con sus citas en la semilla. Aporta valor aunque aún no se pueda cancelar.

**Escenarios de aceptación**:

1. **Dado** David Gil en el momento de referencia, **cuando** entra, **entonces** ve en «Próximas citas», por este orden, «lun 09/11/2026, 18:00–18:45, Sesión de fisioterapia con María» y «lun 09/11/2026, 19:00–19:30, Consulta de nutrición con Lucía», con la indicación de que es hora peninsular.
2. **Dado** David Gil, **cuando** mira su historial, **entonces** ve sus 11 citas pasadas de la más reciente a la más antigua, cada una con su estado, y la del 23/09/2026 con Lucía aparece como «No asistida».
3. **Dada** la cita de David Gil del 02/11/2026 a las 15:15, que sigue reservada sin cerrar, **cuando** se muestra, **entonces** aparece en el historial como «Pendiente de confirmar por la clínica», sin opción de cancelar.
4. **Dada** Rocío Marín, sin citas futuras, **cuando** entra, **entonces** ve un mensaje que dice que no tiene citas próximas, el teléfono de la clínica para pedir una, y sus 8 citas completadas.
5. **Dado** que han pasado las 12:15 del 04/11/2026, **cuando** Javier Peña vuelve a cargar su página, **entonces** esa cita ya no aparece en «Próximas citas» sino en el historial.
6. **Dado** un móvil de 360 píxeles de ancho, **cuando** entra Isabel Navarro, que tiene 19 citas, el mayor número de la semilla, **entonces** su próxima cita se ve sin desplazarse y toda la página se lee sin desplazamiento horizontal.
7. **Dados** dos pacientes, **cuando** uno intenta ver una cita o la página del otro por cualquier vía, **entonces** se rechaza sin revelar si existe.

---

### Historia de usuario 3 - Cancelar una cita futura (Prioridad: P1)

El paciente que no puede ir cancela la cita desde el móvil en unos segundos, con la certeza de que ha quedado cancelada.

**Por qué esta prioridad**: es lo que quita las llamadas a recepción y libera el hueco a tiempo.

**Prueba independiente**: cancelar citas de los datos de demostración antes y después del límite, y comprobar el estado, la agenda y los rechazos.

**Escenarios de aceptación**:

1. **Dada** la cita de David Gil del 09/11/2026 a las 18:00, dentro de plazo, **cuando** pulsa «Cancelar», **entonces** se le pide confirmación mostrando la cita y avisando de que no se puede deshacer.
2. **Dada** esa confirmación, **cuando** la acepta, **entonces** la cita queda cancelada, pasa al historial como «Cancelada», y su cita de las 19:00 sigue reservada.
3. **Dada** esa confirmación, **cuando** la rechaza, **entonces** la cita sigue reservada y nada cambia.
4. **Dada** una cita a menos de 24 horas, como la de Javier Peña del 04/11/2026 a las 12:15, **cuando** se muestra, **entonces** no ofrece cancelar, explica hasta cuándo se podía y ofrece el teléfono de la clínica.
5. **Dada** una cita fuera de plazo, **cuando** se intenta cancelar por una vía distinta de la pantalla, **entonces** se rechaza y la cita no cambia.
6. **Dada** una cita ya cancelada por recepción mientras el paciente tenía la página abierta, **cuando** pulsa «Cancelar», **entonces** un mensaje le dice que ya está cancelada y la página se actualiza.
7. **Dada** una doble pulsación al confirmar, **cuando** llegan las dos peticiones, **entonces** la cita se cancela una sola vez y el paciente ve la cancelación como hecha, no como un error.

---

### Historia de usuario 4 - Recepción aprovecha el hueco liberado (Prioridad: P2)

Sonia, en recepción, ve el hueco que ha dejado libre un paciente y se lo ofrece a quien llame, sin que la cancelación le haya costado una llamada.

**Por qué esta prioridad**: el portal ya aporta valor sin esta historia, pero sin ella el hueco puede perderse.

**Prueba independiente**: cancelar una cita desde el portal y comprobar en la agenda de recepción el tramo libre, la marca de la cita y la lista de huecos liberados, con reservas simultáneas sobre ese tramo.

**Escenarios de aceptación**:

1. **Dada** la cita de Cristina Ortega del 11/11/2026 de 11:15 a 12:00 con Lucía, **cuando** la cancela desde el portal, **entonces** la agenda de Lucía de ese día muestra libre el tramo de 10:00 a 13:15, entre la cita de las 09:30 y la de las 13:15, y la cita cancelada sigue visible (001, FR-017).
2. **Dado** ese hueco, **cuando** recepción reserva una consulta a las 11:15, **entonces** se acepta y la agenda muestra sin confundirlas la cita cancelada y la nueva.
3. **Dadas** dos reservas simultáneas de ese tramo, **cuando** el sistema las procesa, **entonces** exactamente una prospera y la otra recibe un rechazo claro (RN1).
4. **Dada** una reserva de ese tramo que llega a la vez que la cancelación, **cuando** el sistema procesa ambas, **entonces** no queda ningún solape: la reserva solo prospera si la cancelación ya se ha registrado.
5. **Dado** que Cristina Ortega ha cancelado, **cuando** recepción abre la agenda de cualquier profesional y día, **entonces** ve en la lista de huecos liberados «mié 11/11/2026, 11:15–12:00, Lucía», y al pulsarlo va a esa agenda.
6. **Dado** ese mismo día en la agenda de Lucía, **cuando** se muestra la cita, **entonces** aparece como «Cancelada por el paciente», con la fecha y la hora de la cancelación.
7. **Dado** ese hueco en la lista, **cuando** recepción lo reserva, o llega su hora de inicio, **entonces** desaparece de la lista.
8. **Dada** una cita que cancela recepción, **cuando** se muestra, **entonces** aparece como «Cancelada» y no entra en la lista.

---

### Casos límite

- **Cancelar y completar a la vez**: paciente y recepción actúan sobre la misma cita al mismo tiempo. Solo una acción prospera, y la otra recibe un mensaje con el estado resultante (001, Casos límite).
- **El plazo vence con la página abierta**: el límite se comprueba al cancelar, no al cargar la página. Si ha vencido, se rechaza con el mensaje del escenario 4 de la historia 3.
- **Cita ya empezada y sin cerrar**: nunca se cancela desde el portal, aunque siga reservada.
- **Fuera de plazo y sin poder ir**: quien no llega a tiempo puede no llamar y acabar como no asistida. Por eso el portal le da el teléfono en ese mismo momento.
- **Cita cancelada de fecha futura**: va al historial, no a «Próximas citas».
- **Cita que empieza justo ahora**: deja de ser futura en su hora de inicio exacta.
- **Paciente que quiere cambiar la cita**: el portal no reserva. Tras cancelar, se le ofrece el teléfono de la clínica para pedir otra.
- **Cancelación con la clínica cerrada**: el portal funciona a cualquier hora. La cita del lunes 09/11/2026 a las 10:30 de Isabel Serrano se puede cancelar hasta el domingo a las 10:30, y recepción lo verá el lunes.
- **Reloj del móvil equivocado o paciente en otra zona horaria**: no afecta. «Ahora» y las horas mostradas son siempre las de la clínica (001, FR-023).
- **Días de cambio de hora**: el límite se calcula restando horas en el reloj local de la clínica. Como la clínica abre a las 09:00, ningún límite cae en la hora que no existe o que se repite. Una cita del historial conserva su hora local a ambos lados del cambio (001, FR-025).
- **Enlace reenviado**: quien tenga el enlace ve y cancela las citas de esa ficha, porque el enlace es la única credencial. Por eso recepción puede anularlo.
- **Teléfono compartido por varias fichas**: cada ficha tiene su propio enlace, y abrir uno no da acceso a las demás.
- **Paciente sin enlace o que lo ha perdido**: llama a la clínica, y recepción se lo entrega otra vez.
- **Regenerar la semilla**: cierra las sesiones abiertas de los pacientes, igual que las de recepción.

## Requisitos *(obligatorio)*

### Reglas de negocio

Los tests de esta feature referencian estos identificadores (constitución, principio VI). Como la 001 usa la misma numeración de FR, los requisitos de esta spec se citan como `002/FR-nnn`.

- **RP1**: un paciente solo ve y cancela las citas de su ficha. La garantía la da el sistema y no depende de la interfaz. Nunca ve datos de otros pacientes ni la agenda de los profesionales.
- **RP2**: una cita es futura si está reservada y su inicio es posterior al momento actual, según la hora local de la clínica. Cualquier otra cita pertenece al historial.
- **RP3**: un paciente solo cancela citas futuras, y hasta 24 horas antes de su inicio. Una cancelación justo en el minuto límite se acepta. Pasado el límite, cancela recepción: RN5 de la 001 no cambia, y recepción puede cancelar en cualquier momento.
- **RP4**: cancelar desde el portal es la misma transición reservada → cancelada de RN4: es definitiva y libera el tramo en ese mismo instante, sin ningún paso de recepción.
- **RP5**: la cancelación es la única escritura del paciente en la agenda. El portal no crea, mueve ni reprograma citas.

### Requisitos funcionales

**Acceso**

- **FR-001**: El paciente DEBE entrar con un enlace personal de su ficha, sin cuenta ni contraseña. Cada ficha tiene un único enlace vigente, que no se puede adivinar ni deducir de los datos del paciente. El enlace NO DEBE caducar: sigue válido hasta que recepción lo anule.
- **FR-002**: Toda ficha DEBE tener su enlace sin ninguna alta previa. Desde una cita de la agenda, recepción DEBE poder copiarlo y DEBE poder anularlo, lo que crea uno nuevo y cierra las sesiones abiertas con el anterior. Recepción lo entrega por el canal que ya use con ese paciente: el sistema no envía nada.
- **FR-003**: Un enlace inventado y uno anulado DEBEN dar la misma respuesta, sin revelar si corresponden a un paciente de la clínica.
- **FR-004**: El sistema DEBE limitar los intentos con enlaces no válidos, y el paciente DEBE poder salir. La sesión DEBE cerrarse tras 30 minutos sin actividad.
- **FR-005**: El acceso del paciente NO DEBE dar acceso a la zona de recepción, y la clave de clínica NO DEBE dar acceso a la página de un paciente.
- **FR-006**: El portal NO DEBE abrirse con datos reales de pacientes mientras la conexión no vaya cifrada (ver [Cambios que se piden a la 001](#cambios-que-se-piden-a-la-001)).

**Ver citas**

- **FR-007**: La página DEBE mostrar primero «Próximas citas», de la más cercana a la más lejana, y después «Historial», de la más reciente a la más antigua, según RP2.
- **FR-008**: Cada cita DEBE mostrar día de la semana, fecha, hora de inicio y de fin, servicio, profesional y estado. NO DEBE mostrar importes.
- **FR-009**: Los estados DEBEN mostrarse como en la 001 (FR-027). Una cita reservada ya empezada DEBE mostrarse como «Pendiente de confirmar por la clínica». El estado NO DEBE comunicarse solo por el color.
- **FR-010**: Fechas y horas DEBEN cumplir 001/FR-023 a FR-025: `dd/mm/aaaa`, 24 horas, hora local de la clínica indicada en pantalla e igual desde cualquier dispositivo.
- **FR-011**: La página DEBE mostrar el nombre de la clínica, y su teléfono como enlace que permita llamar desde el móvil.
- **FR-012**: Si el paciente no tiene citas futuras, la página DEBE decirlo y ofrecer el teléfono de la clínica.

**Cancelar**

- **FR-013**: Cada cita cancelable según RP3 DEBE ofrecer «Cancelar». Las demás citas futuras DEBEN explicar hasta cuándo se podía cancelar y ofrecer el teléfono de la clínica.
- **FR-014**: Cancelar DEBE pedir confirmación, mostrando la cita y avisando de que no se puede deshacer.
- **FR-015**: El sistema DEBE aplicar RP1 a RP3 y RN4 en el momento de registrar la cancelación, por cualquier vía, y si la rechaza, DEBE dejar la cita intacta y decir por qué en lenguaje llano.
- **FR-016**: Tras cancelar, el paciente DEBE ver la confirmación en pantalla y el teléfono de la clínica por si quiere pedir otra cita.
- **FR-017**: Repetir una cancelación ya hecha NO DEBE producir un error ni cambiar nada.

**Hueco liberado**

- **FR-018**: El tramo DEBE quedar libre y reservable por recepción en cuanto se registra la cancelación, con todas las garantías de RN1.
- **FR-019**: La agenda DEBE mostrar las citas canceladas desde el portal como «Cancelada por el paciente», con la fecha y la hora de la cancelación. Al abrir la agenda, recepción DEBE ver, para cualquier profesional y día, la lista de huecos liberados por pacientes, del más cercano al más lejano, con fecha, horas y profesional, y cada uno DEBE llevar a su agenda. Un hueco sale de la lista cuando se ocupa alguna parte de su tramo o cuando llega su hora de inicio.
- **FR-020**: El sistema NO DEBE ocupar el hueco por su cuenta ni avisar de él a otros pacientes.

**Interfaz** (constitución, principios VII y VIII)

- **FR-021**: El portal DEBE diseñarse primero para móvil, en una sola columna a 360 píxeles de ancho, y cumplir 001/FR-028: sin desplazamiento horizontal, contraste de al menos 4,5:1 y controles táctiles de al menos 44 × 44 píxeles.
- **FR-022**: En un móvil de 360 × 640 píxeles, la próxima cita y su acción de cancelar DEBEN verse sin desplazarse.
- **FR-023**: Todos los textos DEBEN estar en español de España, sin jerga técnica, y cada error DEBE decir qué ha pasado y qué puede hacer el paciente.

**Pruebas** (constitución, principios III y VI)

- **FR-024**: Cada regla y cada escenario DEBE tener un test que lo referencie. Como el portal escribe en la agenda, DEBE haber pruebas que intenten provocar un solape sobre el tramo liberado, con reservas simultáneas entre sí y simultáneas con la cancelación.

### Entidades clave

- **Paciente** (001): ahora tiene acceso al producto, pero solo a su propia página.
- **Cita** (001): no cambia de estados. Además guarda quién la canceló y cuándo.
- **Clínica** (001): añade el teléfono que se muestra a los pacientes.
- **Enlace personal**: la credencial de una ficha para entrar en el portal. Cada ficha tiene uno vigente, y anularlo lo sustituye por otro.
- **Sesión de paciente**: la entrada abierta con un enlace, ligada a su ficha y a su clínica. Es temporal, se puede cerrar y es independiente de la sesión de recepción.

### Cambios que se piden a la 001

La 001 tiene propietario propio (AntonioLV1999), y esta feature le pide estos cambios, sin aplicarlos por su cuenta (constitución, Flujo de trabajo). Deben estar aprobados antes de aprobar esta spec.

| Punto de la 001 | Conflicto | Cambio que se pide |
|-----------------|-----------|--------------------|
| FR-001 | Exige la clave de clínica para cualquier consulta u operación, por cualquier vía | Exceptuar el portal, que se protege con 002/FR-001 a FR-005 |
| Entidad Paciente y Supuestos | «Sin acceso al producto» y acceso del paciente fuera de alcance | Remitir a esta spec |
| Entidad Clínica y FR-029 | La clínica no tiene teléfono, y el portal lo necesita | Añadirlo. Para Eleva se propone el ficticio `000 100 000` |
| FR-013 | «Fuera del alta de cita no se gestionan pacientes», y recepción copia y anula enlaces desde una cita | Exceptuar el enlace personal (002/FR-002) |
| FR-029 y FR-032 | La semilla debe ser reproducible, y sus fichas ahora tienen enlace | Generar enlaces deterministas, ficticios y públicos, como la clave `eleva-demo`, y que no se usen con datos reales |
| FR-030 | Los dos resúmenes de contenido incluyen los datos de la clínica y de los pacientes, así que el teléfono y los enlaces los cambian. Las cifras de citas no cambian | Actualizar los resúmenes en el mismo cambio (principio V) |
| FR-015, FR-017, FR-027 y Entidad Cita | La agenda distingue quién canceló, con la etiqueta nueva «Cancelada por el paciente», y muestra la lista de huecos liberados | Añadir el origen y el momento de la cancelación, la etiqueta y la lista (002/FR-019). Las 37 canceladas de la historia cuentan como canceladas por recepción |
| Supuestos: conexión sin cifrar y deuda de autenticación | Se aceptaron para datos ficticios, y deben resolverse antes de usar datos reales | Fijar quién resuelve la deuda y cuándo. Bloquea el uso real del portal (002/FR-006) |

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Los 40 pacientes de la semilla tienen enlace sin ningún alta previa, y recepción copia el de cualquiera de ellos en menos de 30 segundos desde la agenda.
- **SC-002**: Al menos 9 de cada 10 pacientes sin instrucciones localizan su próxima cita en menos de 1 minuto desde que abren su enlace en el móvil.
- **SC-003**: Al menos 9 de cada 10 pacientes sin instrucciones cancelan una cita a la primera, en menos de 30 segundos desde que ven su página.
- **SC-004**: Cero accesos a datos ajenos en un recorrido que intenta, para cada uno de los 40 pacientes, ver y cancelar citas de otro paciente.
- **SC-005**: En 1.000 rondas de reservas simultáneas sobre un tramo recién liberado, y de reservas simultáneas con su cancelación, hay cero solapes.
- **SC-006**: La página de un paciente con 19 citas se muestra en menos de 2 segundos en un móvil con conexión normal.
- **SC-007**: El 100 % de las pantallas del portal cumple los umbrales de 002/FR-021 y FR-022 a 360 píxeles de ancho, y las horas se ven iguales desde dispositivos en zonas horarias distintas.
- **SC-008**: A las 8 semanas de la puesta en marcha en una clínica, al menos el 50 % de las cancelaciones se hace desde el portal.
- **SC-009**: A las 8 semanas, las llamadas de pacientes para consultar o cancelar citas bajan al menos un 50 % respecto a una semana de referencia anotada por recepción antes de la puesta en marcha.
- **SC-010**: El 100 % de RP1 a RP5 y de los escenarios tiene un test que los referencia, y la suite está en verde. SC-002, SC-003, SC-008 y SC-009 no tienen test automático, porque miden el uso real de personas: se comprueban a mano (constitución, principio VI).

## Supuestos

- **Sin línea base de llamadas**: «la mitad de la mañana» es lo que cuenta Sonia, no una medida. La semilla no sirve de referencia, porque es ficticia y sus 37 cancelaciones en 8 semanas son menos de una por día laborable. Por eso SC-009 pide anotar antes una semana real, y el 50 % de SC-008 y SC-009 es una propuesta.
- **Datos de salud**: el servicio y la especialidad revelan información de salud. Antes de usar el portal con datos reales, la clínica necesita la revisión de protección de datos, que queda fuera de esta spec.
- **Entrega manual del enlace**: el sistema no envía nada, así que recepción entrega cada enlace una vez, por ejemplo al confirmar una cita. Es trabajo nuevo para Sonia, aceptado a cambio de no depender de un proveedor externo ni de coste por envío.
- **Enlace sin caducidad (riesgo aceptado)**: un enlace filtrado sin que nadie lo sepa sigue abriendo la página de esa ficha, también cuando el paciente deja de acudir. Se acepta porque cualquier caducidad devolvería trabajo a recepción. La revisión de protección de datos debe confirmarlo antes de usar datos reales.
- **Una ficha, un acceso**: los menores y las personas dependientes usan el enlace de su ficha. No hay gestión de tutores ni de permisos.
- **Sin motivo de cancelación ni penalización**: no se pide motivo, y no hay cargos, porque los pagos están fuera de alcance.
- **Sin avisos al paciente tras cancelar**: la confirmación es solo en pantalla. Los envíos corresponden a la feature de recordatorios, que además debe dejar de avisar de las citas canceladas.
- **Historial completo sin paginar**: la semilla tiene un máximo de 19 citas por paciente.
- **Sin edición de la ficha**: el paciente no cambia su teléfono ni su correo desde el portal.
- **Portal por clínica**: cada clínica tiene su dirección de portal, y un paciente de dos clínicas entra en cada una por separado. Hoy solo existe Eleva.
- **Sesión de 30 minutos**: valor por defecto razonable para un dato sensible en un móvil.
- **Hueco a menos de 24 horas**: el paciente no los libera desde el portal, así que la lista solo contiene huecos con al menos un día de margen en el momento de cancelar.
- **Fuera de alcance de la v1**: reservar o mover citas online, pagos, lista de espera, avisos a otros pacientes y gestión de fichas.
