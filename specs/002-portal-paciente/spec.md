# Especificación de feature: Portal del paciente

**Rama de la feature**: `002-portal-paciente`

**Creada**: 06/11/2026

**Estado**: Borrador. Cambiada el 10/11/2026 por la revisión cruzada (ver [Historial de cambios](#historial-de-cambios))

**Propietario**: Sara (registrada en `specs/MAPA.md`)

**Entrada**: descripción de la persona usuaria: «Portal del paciente. Los pacientes de la clínica quieren ver sus citas y cancelarlas sin llamar por teléfono (Sonia, recepción de Eleva, dedica "la mitad de la mañana" a esto). Alcance: un paciente accede a una página personal moderna donde ve sus citas futuras y pasadas y puede cancelar una cita futura. Interfaz limpia y responsive, pensada para móvil. Preguntas que la spec debe dejar decididas (formúlalas cerradas, para Sara): cómo accede el paciente sin crear cuentas ni contraseñas (las clínicas pequeñas no van a gestionar altas), hasta cuándo puede cancelar, y qué pasa con el hueco liberado. Datos: cita casos reales de la semilla en los ejemplos. Fuera de alcance v1: reservar o mover citas online, pagos».

## Aclaraciones

### Sesión del 06/11/2026

- P: ¿Cómo debe entrar el paciente en el portal sin cuenta ni contraseña? → R: con un enlace personal por ficha, que recepción entrega al paciente (FR-001).
- P: ¿Hasta cuándo puede cancelar el paciente una cita desde el portal? → R: hasta 24 horas antes del inicio. *Sustituida el 10/11/2026 por la decisión D1: el plazo es el de RN8 de la 001, 2 horas en todos los canales (RP3).*
- P: ¿Cómo debe enterarse recepción de que un paciente ha liberado un hueco? → R: la cita aparece «Cancelada por el paciente», con fecha y hora, y al abrir la agenda se ve una lista de los huecos liberados por pacientes (FR-019).
- P: ¿Debe caducar el enlace personal del paciente? → R: no, sigue válido hasta que recepción lo anule (FR-001).
- P: ¿Quién es el propietario de esta spec? → R: Sara.

### Preguntas abiertas para Sara (10/11/2026)

Salen de la revisión cruzada. Están sin decidir, y la spec no se aprueba hasta que Sara las responda.

- **D3 (S-12)**: ¿el recordatorio de la 003 debe incluir el enlace personal del portal, además del enlace de cancelación? **Recomendación: no en esta versión.** Un correo reenviado solo debe dar acceso a una cita (RP6), y meter el enlace personal deshace esa separación. Afecta a RP6, al caso límite «Correo de recordatorio reenviado» y al supuesto «Entrega manual del enlace», cuyo motivo («no depender de un proveedor externo») deja de valer cuando la 003 envíe correos.
- **S-15, cita sin cerrar**: ¿se pide a la 001 que FR-027 admita la etiqueta «Pendiente de confirmar por la clínica» para una cita reservada ya empezada (002/FR-009, historia 2, escenario 3)? Si no, el portal solo puede mostrarla con las etiquetas de FR-027.
- **S-15, cita que canceló el propio paciente**: ¿qué etiqueta ve el paciente en su historial? Puede ser «Cancelada», como dice hoy la historia 3, escenario 2, o «Cancelada por el paciente el dd/mm/aaaa a las hh:mm», como muestra la agenda según FR-027 de la 001. Según el informe, la 001 es la propietaria de las etiquetas y debe aclarar cuáles ve el paciente. La respuesta decide qué se le pide.

## Escenarios de usuario y pruebas *(obligatorio)*

### Datos de los ejemplos

Todos los casos salen de la semilla con el lunes por defecto (02/11/2026), sin cambios a mano, y con el reloj fijado en el **miércoles 04/11/2026 a las 12:00**, hora peninsular. En ese momento hay 42 citas reservadas futuras de 27 pacientes, y 15 citas reservadas ya pasadas y sin cerrar. Con el plazo de 2 horas de RN8 de la 001, 41 de las 42 se pueden cancelar en el portal. La única fuera de plazo es la de Javier Peña de las 12:15, cuyo límite fueron las 10:15. Los datos son ficticios (001, FR-034).

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

**Prueba independiente**: con los datos de demostración, obtener desde recepción el enlace de varios pacientes, con y sin correo, entrar con ellos, intentar entrar con enlaces de los dos tipos inventados o anulados, y anular un enlace personal que tenga enlaces de cancelación vivos.

**Escenarios de aceptación**:

1. **Dada** una cita de Isabel Navarro, que no tiene correo, **cuando** recepción la abre en la agenda, **entonces** puede copiar el enlace personal de esa ficha sin ningún alta previa.
2. **Dado** el enlace de Isabel Navarro, **cuando** lo abre en su móvil, **entonces** entra en su página sin escribir nada.
3. **Dado** un enlace personal o de cancelación que sea inventado, anulado o caducado, **cuando** alguien lo abre, **entonces** ve siempre el mismo mensaje, igual para los dos tipos, que le remite a la clínica, y no descubre si esa persona es paciente ni si esa cita existe (FR-003).
4. **Dada** una persona que prueba enlaces inventados repetidamente, de cualquiera de los dos tipos, **cuando** supera el límite de intentos, **entonces** el portal le impide seguir durante un tiempo y le dice qué puede hacer (FR-004).
5. **Dado** un enlace personal que el paciente ha perdido o ha llegado a otra persona, **cuando** recepción lo anula, **entonces** el enlace anterior deja de funcionar, también en las sesiones abiertas con él, y recepción obtiene uno nuevo.
6. **Dado** que David Gil tiene su enlace personal y ha recibido el recordatorio de su cita del 09/11/2026 a las 18:00 con su enlace de cancelación, **cuando** recepción anula su enlace personal, **entonces** el enlace de cancelación del correo también deja de funcionar y da la misma respuesta que un enlace inventado, y la cita sigue reservada (RP7).
7. **Dado** David Gil dentro del portal, **cuando** sale, **entonces** hace falta abrir de nuevo su enlace para ver sus citas.
8. **Dada** una sesión de David Gil, abierta con cualquiera de sus dos enlaces, **cuando** intenta abrir la agenda de recepción, cualquier otra ruta de recepción o el panel de analítica, **entonces** se rechaza igual que sin sesión (FR-005; FR-037 de la 001). Y la clave de clínica `eleva-demo` no da acceso a la página de ningún paciente.

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
2. **Dada** esa confirmación, **cuando** la acepta, **entonces** la cita queda cancelada, pasa al historial como «Cancelada» (etiqueta pendiente de la pregunta S-15), y su cita de las 19:00 sigue reservada.
3. **Dada** esa confirmación, **cuando** la rechaza, **entonces** la cita sigue reservada y nada cambia.
4. **Dada** una cita fuera del plazo de RN8 de la 001, como la de Javier Peña del 04/11/2026 a las 12:15, cuyo límite fueron las 10:15, **cuando** se muestra, **entonces** no ofrece cancelar, explica hasta cuándo se podía y ofrece el teléfono de la clínica.
5. **Dada** una cita fuera del plazo de RN8 de la 001, **cuando** se intenta cancelar por una vía distinta de la pantalla del portal, incluido el enlace de cancelación del correo de la 003, **entonces** se rechaza y la cita no cambia.
6. **Dada** una cita ya cancelada por recepción mientras el paciente tenía la página abierta, **cuando** pulsa «Cancelar», **entonces** FR-038 de la 001 devuelve «ya estaba cancelada» con el origen «recepción», el portal le dice que «ya está cancelada» y actualiza la página, y el origen y el momento siguen siendo los de recepción (002/FR-017; 001, HU6, escenario 8).
7. **Dada** una doble pulsación al confirmar, **cuando** llegan las dos peticiones, **entonces** FR-038 de la 001 cancela la cita una sola vez: la primera petición obtiene «cancelada ahora» y la segunda «ya estaba cancelada» con el origen «portal», con un solo origen y un solo momento, y el paciente ve la cancelación como hecha, sin ningún error (002/FR-017).

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
6. **Dado** ese mismo día en la agenda de Lucía, **cuando** se muestra la cita, **entonces** aparece con la etiqueta, la fecha y la hora que define la 001 para una cancelación del paciente (001, HU6, escenario 6).
7. **Dado** ese hueco en la lista, **cuando** recepción lo reserva, o llega su hora de inicio, **entonces** desaparece de la lista.
8. **Dada** una cita que cancela recepción, **cuando** se muestra, **entonces** aparece como «Cancelada» (001, HU6, escenario 7) y no entra en la lista.

---

### Casos límite

- **Cancelar y completar a la vez**: paciente y recepción actúan sobre la misma cita al mismo tiempo. Solo una acción prospera, y la otra recibe un mensaje con el estado resultante (001, Casos límite).
- **El plazo vence con la página abierta**: el límite se comprueba al cancelar, no al cargar la página (RN8 de la 001). Si ha vencido, se rechaza con el mensaje del escenario 4 de la historia 3.
- **Cita ya empezada y sin cerrar**: nunca se cancela desde el portal, aunque siga reservada, porque siempre está fuera de plazo (001, Casos límite).
- **Fuera de plazo y sin poder ir**: quien no llega a tiempo puede no llamar y acabar como no asistida. Por eso el portal le da el teléfono en ese mismo momento.
- **Cita cancelada de fecha futura**: va al historial, no a «Próximas citas».
- **Cita que empieza justo ahora**: deja de ser futura en su hora de inicio exacta.
- **Paciente que quiere cambiar la cita**: el portal no reserva. Tras cancelar, se le ofrece el teléfono de la clínica para pedir otra.
- **Cancelación con la clínica cerrada**: el portal funciona a cualquier hora. La cita del lunes 09/11/2026 a las 10:30 de Isabel Serrano se puede cancelar hasta ese mismo lunes a las 08:30, antes de que abra la clínica. Recepción lo verá al abrir, con hora y media para ocupar el hueco.
- **Reloj del móvil equivocado o paciente en otra zona horaria**: no afecta. «Ahora» y las horas mostradas son siempre las de la clínica (001, FR-023).
- **Días de cambio de hora**: el límite de cancelación lo calcula RN8 de la 001, también en esos días. Una cita del historial conserva su hora local a ambos lados del cambio (001, FR-025).
- **Enlace personal reenviado**: quien lo tenga ve y cancela todas las citas de esa ficha. Recepción lo anula, y con él caen los enlaces de cancelación de esa ficha (RP7).
- **Correo de recordatorio reenviado**: su enlace de cancelación solo da acceso a la cancelación de esa cita, nunca a la página personal ni al historial (RP6).
- **Teléfono compartido por varias fichas**: cada ficha tiene su propio enlace personal, y abrir uno no da acceso a las demás.
- **Paciente sin enlace o que lo ha perdido**: llama a la clínica, y recepción se lo entrega otra vez.
- **Sesión de recepción y de paciente en el mismo navegador**: viven aparte, y salir de una no cierra la otra (FR-037 de la 001).
- **Regenerar la semilla**: cierra las sesiones abiertas de los pacientes, igual que las de recepción.

## Requisitos *(obligatorio)*

### Reglas de negocio

Los tests de esta feature referencian estos identificadores (constitución, principio VI). Como la 001 usa la misma numeración de FR, los requisitos de esta spec se citan como `002/FR-nnn`.

- **RP1**: un paciente solo ve y cancela las citas de su ficha, y con un enlace de cancelación solo la cita de ese enlace (RP6). La garantía la da el sistema y no depende de la interfaz. Nunca ve datos de otros pacientes ni la agenda de los profesionales.
- **RP2**: una cita es futura si está reservada y su inicio es posterior al momento actual, según la hora local de la clínica. Cualquier otra cita pertenece al historial.
- **RP3**: un paciente solo cancela citas futuras, y solo dentro del plazo de RN8 de la 001, que es el único plazo del paciente en cualquier canal. Esta spec no fija ninguna cifra propia. Pasado el plazo, cancela recepción, que no tiene plazo (RN5 de la 001).
- **RP4**: el portal no define cómo se cancela. Registra toda cancelación con FR-038 de la 001, indicando el canal «portal», y FR-038 aplica RN4 y RN8, registra el origen y el momento (FR-036 de la 001) y distingue «cancelada ahora» de «ya estaba cancelada». No hace falta ningún paso de recepción. Esta spec solo fija qué mensaje ve el paciente con cada resultado (FR-017).
- **RP5**: la cancelación es la única escritura del paciente en la agenda. El portal no crea, mueve ni reprograma citas.
- **RP6 (modelo de acceso del paciente, decisión D2)**: el paciente tiene dos credenciales, las dos en forma de enlace y sin clave de clínica:
  - El **enlace personal** da acceso a toda la ficha: ver sus citas y cancelar las futuras (FR-001 y FR-002).
  - El **enlace de cancelación** da acceso solo a la cancelación de la cita para la que se generó, nunca a la página personal, al historial ni a otras citas. Lo genera la 003 con cada recordatorio, y la 003 fija su alcance concreto y su vigencia (RR6 y FR-011 de la 003).

  Esta spec es la propietaria del modelo común, que vale igual para los dos tipos: que no se puedan adivinar (FR-025), la respuesta uniforme (FR-003), el límite de intentos (FR-004), la revocación (RP7), las sesiones (FR-005) y la excepción a la clave (FR-026).
- **RP7**: anular el enlace personal de una ficha invalida también, en ese mismo instante, todos los enlaces de cancelación de esa ficha, incluidos los de correos ya enviados, y cierra las sesiones abiertas con cualquiera de ellos. Un enlace de cancelación también deja de valer cuando lo dispone la 003.

### Requisitos funcionales

**Acceso**

- **FR-001**: El paciente DEBE entrar en el portal con su enlace personal (RP6), sin cuenta ni contraseña. Cada ficha tiene un único enlace personal vigente. El enlace personal NO DEBE caducar: sigue válido hasta que recepción lo anule.
- **FR-002**: Toda ficha DEBE tener su enlace personal sin ninguna alta previa. Desde una cita de la agenda, recepción DEBE poder copiarlo y DEBE poder anularlo. Anularlo crea uno nuevo y aplica RP7. Recepción lo entrega por el canal que ya use con ese paciente: el sistema no envía nada.
- **FR-003**: Un enlace de cualquiera de los dos tipos que sea inventado, anulado o caducado DEBE dar la misma respuesta, igual para los dos tipos, sin revelar si corresponde a un paciente o a una cita de la clínica ni de qué tipo era. «Caducado» solo se aplica al enlace de cancelación, según la vigencia que fije la 003, porque el enlace personal no caduca.
- **FR-004**: El sistema DEBE limitar los intentos con enlaces no válidos, de los dos tipos y contados juntos, y el paciente DEBE poder salir. La sesión DEBE cerrarse tras 30 minutos sin actividad.
- **FR-005**: Las sesiones de paciente, abiertas con cualquiera de los dos tipos de enlace, DEBEN usar un almacén y una cookie propios, y NO DEBEN abrir la agenda, ninguna ruta de recepción ni el panel de analítica, tal como exige FR-037 de la 001. La clave de clínica NO DEBE dar acceso a la página de un paciente ni a la cancelación por enlace.
- **FR-025**: Ningún enlace de paciente, de ninguno de los dos tipos, DEBE poder adivinarse ni deducirse de los datos del paciente o de la cita, ni de otro enlace. La única excepción son los enlaces personales de demostración de la semilla (FR-029 de la 001). Son deterministas, ficticios y públicos, igual que la clave `eleva-demo` (FR-002 de la 001), y NO DEBEN usarse con datos reales. Los tests de este requisito DEBEN usar enlaces generados fuera de la semilla, nunca los de demostración.
- **FR-026**: Este modelo de acceso es la única excepción a la clave de clínica que admite FR-001 de la 001. Las únicas rutas sin clave son las que abren los dos tipos de enlace, y cada una alcanza solo lo que permite su tipo (RP6).
- **FR-006**: El portal NO DEBE abrirse con datos reales de pacientes mientras no se cumpla la puerta de uso con datos reales de FR-039 de la 001. Esta spec no fija una condición propia ni la relaja.

**Ver citas**

- **FR-007**: La página DEBE mostrar primero «Próximas citas», de la más cercana a la más lejana, y después «Historial», de la más reciente a la más antigua, según RP2.
- **FR-008**: Cada cita DEBE mostrar día de la semana, fecha, hora de inicio y de fin, servicio, profesional y estado. NO DEBE mostrar importes.
- **FR-009**: Los estados DEBEN mostrarse como en la 001 (FR-027). Una cita reservada ya empezada DEBE mostrarse como «Pendiente de confirmar por la clínica» (pendiente de la pregunta S-15). El estado NO DEBE comunicarse solo por el color.
- **FR-010**: Fechas y horas DEBEN cumplir 001/FR-023 a FR-025: `dd/mm/aaaa`, 24 horas, hora local de la clínica indicada en pantalla e igual desde cualquier dispositivo.
- **FR-011**: La página DEBE mostrar el nombre de la clínica, y su teléfono como enlace que permita llamar desde el móvil.
- **FR-012**: Si el paciente no tiene citas futuras, la página DEBE decirlo y ofrecer el teléfono de la clínica.

**Cancelar**

- **FR-013**: Cada cita cancelable según RP3 DEBE ofrecer «Cancelar». Las demás citas futuras DEBEN explicar hasta cuándo se podía cancelar y ofrecer el teléfono de la clínica.
- **FR-014**: Cancelar DEBE pedir confirmación, mostrando la cita y avisando de que no se puede deshacer.
- **FR-015**: El portal DEBE registrar las cancelaciones solo a través de FR-038 de la 001 (RP4), después de comprobar RP1. FR-038 aplica RN4 y el plazo de RN8 de la 001 en el momento de registrar la cancelación, por cualquier vía, incluido el enlace de cancelación del correo. Si rechaza la cancelación, la cita queda intacta y el portal DEBE mostrar el mensaje que corresponda según FR-017.
- **FR-016**: Tras cancelar, el paciente DEBE ver la confirmación en pantalla y el teléfono de la clínica por si quiere pedir otra cita.
- **FR-017**: El portal DEBE mostrar, según el resultado que devuelve FR-038 de la 001:
  - **Cancelada ahora**, o **ya estaba cancelada** con un origen previo del paciente («portal» o «correo»), como en una doble pulsación: la confirmación de FR-016, como hecha y sin ningún error.
  - **Ya estaba cancelada** con el origen previo «recepción»: un mensaje que dice que la cita «ya está cancelada», y la página actualizada.
  - **Fuera de plazo**: un mensaje que explica hasta cuándo se podía cancelar, con la fecha y la hora del límite que devuelve FR-038, y el teléfono de la clínica.
  - **No cancelable**, con el estado que devuelve FR-038 (completada o no asistida): qué ha pasado y qué puede hacer el paciente, en lenguaje llano (FR-023).

**Hueco liberado**

- **FR-018**: El tramo DEBE quedar libre y reservable por recepción en cuanto se registra la cancelación, con todas las garantías de RN1.
- **FR-019**: La agenda DEBE mostrar las citas canceladas por el paciente con el origen, el momento y la etiqueta que define la 001 (HU6, escenarios 6 y 7). Esta spec no los define. Al abrir la agenda, recepción DEBE ver, para cualquier profesional y día, la lista de huecos liberados por citas con origen de paciente, por cualquiera de sus canales. La lista va del hueco más cercano al más lejano, con fecha, horas y profesional, y cada hueco DEBE llevar a su agenda. Un hueco sale de la lista cuando se ocupa alguna parte de su tramo o cuando llega su hora de inicio.
- **FR-020**: El sistema NO DEBE ocupar el hueco por su cuenta ni avisar de él a otros pacientes.

**Interfaz** (constitución, principios VII y VIII)

- **FR-021**: El portal DEBE diseñarse primero para móvil, en una sola columna a 360 píxeles de ancho, y cumplir 001/FR-028: sin desplazamiento horizontal, contraste de al menos 4,5:1 y controles táctiles de al menos 44 × 44 píxeles.
- **FR-022**: En un móvil de 360 × 640 píxeles, la próxima cita y su acción de cancelar DEBEN verse sin desplazarse.
- **FR-023**: Todos los textos DEBEN estar en español de España, sin jerga técnica, y cada error DEBE decir qué ha pasado y qué puede hacer el paciente.

**Pruebas** (constitución, principios III y VI)

- **FR-024**: Cada regla y cada escenario DEBE tener un test que lo referencie. Como el portal escribe en la agenda, DEBE haber pruebas que intenten provocar un solape sobre el tramo liberado, con reservas simultáneas entre sí y simultáneas con la cancelación.

### Entidades clave

- **Paciente** (001): ahora tiene acceso al producto, con las dos credenciales de RP6.
- **Cita** (001): no cambia de estados. El origen y el momento de la cancelación, y su etiqueta, los define la 001 (HU6). Esta spec solo los muestra y los usa en la lista de huecos (FR-019).
- **Clínica** (001): el teléfono que se muestra a los pacientes lo añade la 001, en su cambio único de la semilla.
- **Enlace personal**: la credencial de una ficha para entrar en el portal. Cada ficha tiene uno vigente, que no caduca, y anularlo lo sustituye por otro (RP6 y RP7).
- **Enlace de cancelación**: la credencial de una sola cita, generada por la 003 con su recordatorio. Sigue el modelo común de esta spec, y su alcance y su vigencia los fija la 003 (RP6).
- **Sesión de paciente**: la entrada abierta con cualquiera de los dos enlaces, ligada a su ficha y a su clínica. Es temporal, se puede cerrar, y tiene almacén y cookie propios, aparte de la sesión de recepción (FR-005; FR-037 de la 001).

### Cambios que se piden a la 001

La 001 tiene propietario propio (AntonioLV1999), y esta feature le pide estos cambios, sin aplicarlos por su cuenta (constitución, Flujo de trabajo). Deben estar aprobados antes de aprobar esta spec. Los marcados como recogidos lo están en el cambio de la 001 del 10/11/2026, aprobado el 10/11/2026.

| Punto de la 001 | Conflicto | Cambio que se pide | Estado |
|-----------------|-----------|--------------------|--------|
| FR-001 y FR-037 | Exige la clave de clínica para cualquier consulta u operación, por cualquier vía | Una sola excepción, el modelo de acceso de esta spec (RP6, FR-026), y sesiones de paciente aisladas (FR-005) | Recogido: FR-001 y FR-037 de la 001 |
| RN5 y RN8 | El portal y el correo fijaban plazos distintos (S-01) | Un único plazo del paciente para todos los canales | Recogido: RN8 de la 001, 2 horas (D1) |
| Origen, momento y etiqueta de la cancelación (FR-015, FR-017, FR-027 y Entidad Cita) | La 002 y la 003 añadían el mismo dato con etiquetas distintas (S-02) | Una sola definición que citan la 002 y la 003 | Recogido: HU6 de la 001. La 002 solo la cita (FR-019) |
| Semilla: Entidad Clínica, FR-029, FR-030 y FR-032 | Teléfono de la clínica, enlaces personales de demostración, origen de las 37 canceladas y resúmenes de contenido (S-03) | Un cambio único de la 001 que añade los datos y actualiza los resúmenes una sola vez. Esta spec no altera la semilla por su cuenta | Remite al cambio único de la 001 (HU5, escenario 4) |
| Entidad Paciente y Supuestos | «Sin acceso al producto» y acceso del paciente fuera de alcance | Remitir a esta spec | Recogido: entidad Paciente y supuesto «Fuera de alcance de la 001» (S-22) |
| FR-020, HU3 escenario 5 y Casos límite | Solo recepción cambia estados, y una cita ya cancelada se rechaza, mientras el portal pide que la repetición no dé error (S-05) | Una operación única de cancelar que admita al paciente dentro de RN8, reciba el canal, registre el origen y el momento (FR-036) y distinga «cancelada ahora» de «ya estaba cancelada». La 002 solo elige el mensaje (RP4, FR-015 y FR-017) | Recogido: FR-038 y FR-020 de la 001 |
| FR-013 | «Fuera del alta de cita no se gestionan pacientes», y recepción copia y anula enlaces desde una cita | Exceptuar el enlace personal (002/FR-002) | Pendiente |
| Supuestos: conexión sin cifrar y deuda de autenticación | Se aceptaron para datos ficticios, y deben resolverse antes de usar datos reales (S-08) | Un requisito único de puerta de uso con datos reales (conexión cifrada, revisión de protección de datos y responsable con fecha) que citen 002/FR-006, la 003 y la 004 | Recogido: FR-039 de la 001 |
| FR-027 | La 002 muestra «Pendiente de confirmar por la clínica», que FR-027 no admite, y no dice qué etiqueta ve el paciente en una cita que él canceló (S-15) | Por decidir: ver la pregunta S-15 para Sara | Sin pedir |

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Los 40 pacientes de la semilla tienen enlace sin ningún alta previa, y recepción copia el de cualquiera de ellos en menos de 30 segundos desde la agenda.
- **SC-002**: Al menos 9 de cada 10 pacientes sin instrucciones localizan su próxima cita en menos de 1 minuto desde que abren su enlace en el móvil.
- **SC-003**: Al menos 9 de cada 10 pacientes sin instrucciones cancelan una cita a la primera, en menos de 30 segundos desde que ven su página.
- **SC-004**: Cero accesos a datos ajenos en un recorrido que intenta, para cada uno de los 40 pacientes, ver y cancelar citas de otro paciente con su enlace personal, y cancelar otra cita con un enlace de cancelación.
- **SC-005**: En 1.000 rondas de reservas simultáneas sobre un tramo recién liberado, y de reservas simultáneas con su cancelación, hay cero solapes.
- **SC-006**: La página de un paciente con 19 citas se muestra en menos de 2 segundos en un móvil con conexión normal.
- **SC-007**: El 100 % de las pantallas del portal cumple los umbrales de 002/FR-021 y FR-022 a 360 píxeles de ancho, y las horas se ven iguales desde dispositivos en zonas horarias distintas.
- **SC-008**: A las 8 semanas de la puesta en marcha en una clínica, al menos el 50 % de las cancelaciones se hace desde el portal.
- **SC-009**: A las 8 semanas, las llamadas de pacientes para consultar o cancelar citas bajan al menos un 50 % respecto a una semana de referencia anotada por recepción antes de la puesta en marcha.
- **SC-010**: El 100 % de RP1 a RP7 y de los escenarios tiene un test que los referencia, y la suite está en verde. SC-002, SC-003, SC-008 y SC-009 no tienen test automático, porque miden el uso real de personas: se comprueban a mano (constitución, principio VI).

## Supuestos

- **Sin línea base de llamadas**: «la mitad de la mañana» es lo que cuenta Sonia, no una medida. La semilla no sirve de referencia, porque es ficticia y sus 37 cancelaciones en 8 semanas son menos de una por día laborable. Por eso SC-009 pide anotar antes una semana real, y el 50 % de SC-008 y SC-009 es una propuesta.
- **Datos de salud**: el servicio y la especialidad revelan información de salud. Antes de usar el portal con datos reales, la clínica necesita la revisión de protección de datos, que queda fuera de esta spec.
- **Entrega manual del enlace**: el sistema no envía nada, así que recepción entrega cada enlace una vez, por ejemplo al confirmar una cita. Es trabajo nuevo para Sonia, aceptado a cambio de no depender de un proveedor externo ni de coste por envío.
- **Enlace sin caducidad (riesgo aceptado)**: un enlace personal filtrado sin que nadie lo sepa sigue abriendo la página de esa ficha, también cuando el paciente deja de acudir. Se acepta porque cualquier caducidad devolvería trabajo a recepción. La revisión de protección de datos debe confirmarlo antes de usar datos reales.
- **Una ficha, un acceso**: los menores y las personas dependientes usan el enlace de su ficha. No hay gestión de tutores ni de permisos.
- **Sin motivo de cancelación ni penalización**: no se pide motivo, y no hay cargos, porque los pagos están fuera de alcance.
- **Sin avisos al paciente tras cancelar**: la confirmación es solo en pantalla. Los envíos corresponden a la feature de recordatorios, que además debe dejar de avisar de las citas canceladas.
- **Historial completo sin paginar**: la semilla tiene un máximo de 19 citas por paciente.
- **Sin edición de la ficha**: el paciente no cambia su teléfono ni su correo desde el portal.
- **Portal por clínica**: cada clínica tiene su dirección de portal, y un paciente de dos clínicas entra en cada una por separado. Hoy solo existe Eleva.
- **Sesión de 30 minutos**: valor por defecto razonable para un dato sensible en un móvil.
- **Huecos con poco margen (consecuencia de D1)**: con el plazo de 2 horas, un paciente puede liberar un hueco poco antes de su inicio, o con la clínica aún cerrada. Ese hueco sale de la lista al llegar su hora de inicio (FR-019), aunque recepción no haya llegado a verlo. Es el precio aceptado de «mejor un hueco libre que una no asistida».
- **Fuera de alcance de la v1**: reservar o mover citas online, pagos, lista de espera, avisos a otros pacientes y gestión de fichas.

## Historial de cambios

### 10/11/2026, rebase sobre la 001 aprobada: S-05 y S-08

Propuesta para Sara, sin aprobar. Rebasa la rama sobre el cambio de la 001 del 10/11/2026, ya aprobado, y sustituye las referencias genéricas por sus identificadores. No cambia ningún comportamiento ni toca las preguntas abiertas.

- **S-05**: RP4, FR-015, FR-017 y los escenarios 6 y 7 de la historia 3 citan FR-038 de la 001 en lugar de «la operación única de cancelar». Los cuatro casos de FR-017 corresponden a los cuatro resultados de FR-038: «cancelada ahora», «ya estaba cancelada» (con el origen previo, que separa la doble pulsación del paciente de la cancelación de recepción), «fuera de plazo» (con el límite) y «no cancelable» (con el estado). El último caso, antes «cualquier otro rechazo», pasa a nombrar «no cancelable». La fila de la tabla pasa a recogida (FR-038 y FR-020 de la 001).
- **S-08**: FR-006 cita FR-039 de la 001, y su fila de la tabla pasa a recogida.
- Las entradas de este historial y la introducción de la tabla dejan de dar por pendiente el cambio de la 001.

### 10/11/2026, segunda pasada de la revisión cruzada: S-05, S-08, S-21 y S-22

Propuesta para Sara, sin aprobar. Ninguna decisión de producto se toma aquí: D3 y S-15 quedan como [preguntas abiertas](#preguntas-abiertas-para-sara-10112026).

- **S-05 (operación de cancelar)**: RP4, FR-015, FR-017 y los escenarios 6 y 7 de la historia 3 dejan de describir cómo se cancela, y remiten a la operación única de cancelar de la 001. La spec solo fija los mensajes: la doble pulsación se ve como hecha y sin error, la cita cancelada antes por recepción dice que «ya está cancelada», y fuera de RN8 se explica hasta cuándo se podía y se da el teléfono. La petición se añade a «Cambios que se piden a la 001».
- **S-08 (datos reales)**: FR-006 deja su propia condición (conexión cifrada) y remite a la puerta de uso con datos reales de la 001. La petición se añade a «Cambios que se piden a la 001».
- **S-21 (enlaces de demostración)**: FR-025 admite la excepción de los enlaces de demostración de FR-029 de la 001, y exige que sus tests usen enlaces generados fuera de la semilla.
- **S-22 (referencias)**: la fila «Entidad Paciente y Supuestos» pasa a recogida.
- **S-15**: se añade a la tabla como punto sin pedir, a la espera de la respuesta de Sara.

### 10/11/2026: revisión cruzada (`specs/000-revision-cruzada-nov2026.md`)

Resuelve los bloqueantes que afectan a esta spec, con las decisiones D1 y D2 del informe. Cita el cambio de la 001 del 10/11/2026, aprobado por su propietario el 10/11/2026.

- **S-01 (plazo), decisión D1**: RP3 deja la cifra de 24 horas y cita RN8 de la 001, con 2 horas en todos los canales. FR-015 y el escenario 5 de la historia 3 exigen el plazo por cualquier vía, incluido el enlace del correo. Se recalcula el recuento de los datos de los ejemplos (41 de 42 cancelables) y se revisan el ejemplo de Isabel Serrano, el caso de cambio de hora y el supuesto de los huecos con poco margen.
- **S-02 (origen de la cancelación)**: la entidad Cita, FR-019 y la historia 4 citan el origen, el momento y la etiqueta de la 001 (HU6), y esta spec deja de definirlos. El punto queda recogido en «Cambios que se piden a la 001».
- **S-03 (semilla)**: el teléfono, los enlaces de demostración y los resúmenes remiten al cambio único de la 001. Esta spec no altera la semilla por su cuenta.
- **S-04 (modelo de acceso), decisión D2**: hay dos credenciales, el enlace personal y el enlace de cancelación de la 003, y esta spec es la propietaria del modelo común (RP6). Se generalizan FR-003, FR-004 y FR-005 a los dos tipos, y se añaden RP7 (anular el enlace personal invalida los enlaces de cancelación), FR-025 (enlaces no adivinables) y FR-026 (única excepción a FR-001 de la 001), con los escenarios 3, 4, 6 y 8 de la historia 1. Se corrige el caso límite del enlace reenviado, porque el enlace personal ya no es la única credencial.
