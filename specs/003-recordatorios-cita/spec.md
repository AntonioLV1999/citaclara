# Especificación de feature: Recordatorios de cita

**Rama de la feature**: `003-recordatorios-cita`

**Creada**: 06/11/2026

**Estado**: Borrador (revisada el 10/11/2026 tras la revisión cruzada; ver «Historial de cambios»)

**Propietario**: AntonioLV1999 (registrado en `specs/MAPA.md`)

**Entrada**: descripción de la persona usuaria: «Recordatorios de cita. El dolor número uno del cliente piloto: la no asistencia. Alcance: un proceso diario genera un recordatorio por email para cada cita reservada de las próximas 24-48 horas, sin duplicar envíos; el email incluye los datos de la cita y una forma de que el paciente cancele si no va a ir (mejor un hueco libre que un no-show). Correo en modo simulado sin SMTP configurado: se escriben ficheros .eml en datos/salida-correo/. Preguntas cerradas para Sara: antelación exacta, qué pasa si el paciente cancela desde el email y con cuánta antelación puede, y si el recordatorio se reenvía cuando la cita se mueve. Fuera de alcance v1: SMS y WhatsApp».

## Aclaraciones

### Sesión del 06/11/2026

- P: ¿Cuándo debe recibir el paciente el recordatorio de su cita? → R: el proceso sale cada día a las 08:00 y avisa de las citas de mañana, entre 25 y 36 horas antes (RR3).
- P: ¿Qué ocurre cuando el paciente cancela desde el correo y hasta cuándo puede hacerlo? → R: la cita se cancela al momento, dentro del plazo del paciente; después, el paciente debe contactar con la clínica (RR4). Ese plazo es hoy el único de RN8 de la 001 (D1).
- P: ¿Qué debe pasar con el recordatorio cuando una cita cambia de hora? → R: la cita nueva se trata como cualquier otra y tiene su recordatorio si aún le toca (RR5).

### Sesión del 10/11/2026 (revisión cruzada)

- P: ¿Hasta cuándo vale un enlace de cancelación? (D5, S-20) → R: hasta el inicio de la cita; desde ese momento da la respuesta uniforme de 002/FR-003 (RR6).

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Recibir un recordatorio de la cita (Prioridad: P1)

Cada día, sin que nadie de la clínica intervenga, el sistema envía un correo a los pacientes con una cita próxima. El paciente recibe un único aviso con los datos de su cita.

**Por qué esta prioridad**: la no asistencia es el mayor dolor del cliente piloto, y un paciente que recuerda su cita es la primera defensa contra ella.

**Prueba independiente**: con los datos de demostración, ejecutar el proceso para un momento dado, comprobar que cada cita que toca tiene un recordatorio y repetir la ejecución para comprobar que no aparece ninguno más. Aporta valor por sí sola, aunque el correo aún no permita cancelar.

**Escenarios de aceptación**:

1. **Dada** una cita reservada dentro de la ventana de recordatorio, de un paciente con correo, **cuando** se ejecuta el proceso, **entonces** se envía un recordatorio con clínica, profesional, servicio, fecha y hora.
2. **Dada** una cita ya recordada, **cuando** el proceso se ejecuta de nuevo, el mismo día o el siguiente, **entonces** no se envía otro recordatorio de esa cita.
3. **Dadas** dos ejecuciones simultáneas del proceso, **cuando** ambas terminan, **entonces** cada cita tiene un solo recordatorio.
4. **Dada** una cita fuera de la ventana, **cuando** se ejecuta el proceso, **entonces** no se envía nada para ella.
5. **Dada** una cita completada, cancelada o no asistida, **cuando** se ejecuta el proceso, **entonces** no se envía nada para ella.
6. **Dada** una cita de un paciente sin correo, **cuando** se ejecuta el proceso, **entonces** no se envía nada, el proceso sigue con las demás y el resumen la cuenta como omitida.
7. **Dado** un paciente con dos citas dentro de la ventana, **cuando** se ejecuta el proceso, **entonces** recibe un recordatorio por cada cita.
8. **Dado** un envío que falla, **cuando** el proceso continúa, **entonces** las demás citas se procesan, el resumen cuenta el fallo y esa cita puede recordarse en otra ejecución mientras siga dentro de la ventana.
9. **Dada** una cita recordada que recepción cancela para crear otra de pasado mañana, **cuando** el proceso se ejecuta mañana, **entonces** se envía el recordatorio de la cita nueva.
10. **Dada** una clínica de Canarias, **cuando** el paciente lee el correo, **entonces** la hora es la local de la clínica e indica a qué hora local se refiere.

---

### Historia de usuario 2 - Cancelar la cita desde el correo (Prioridad: P1)

El paciente que sabe que no irá abre el enlace del recordatorio, ve qué cita va a cancelar y lo confirma. El hueco queda libre sin que tenga que llamar y la clínica puede ofrecerlo a otra persona.

**Por qué esta prioridad**: convierte una no asistencia en un hueco aprovechable, que es el objetivo de la feature.

**Prueba independiente**: abrir el enlace de un recordatorio sin clave de clínica, cancelar y comprobar en la agenda que la cita está cancelada y que su tramo admite una reserva nueva.

**Escenarios de aceptación**:

1. **Dado** un recordatorio de una cita reservada dentro del plazo de cancelación, **cuando** el paciente abre el enlace, **entonces** ve los datos de la cita y un botón de confirmar, y la cita aún no ha cambiado.
2. **Dada** esa pantalla, **cuando** el paciente confirma, **entonces** la cita queda cancelada al momento, su tramo queda libre y el paciente ve un mensaje que lo confirma (resultado «cancelada ahora» de FR-038 de la 001).
3. **Dada** una cita cancelada desde el correo, **cuando** recepción reserva ese tramo, **entonces** se acepta (RN1 de la 001).
4. **Dada** una cita ya cancelada, **cuando** el paciente vuelve a abrir el enlace, **entonces** ve que ya está cancelada y no se le ofrece ninguna acción. Es el mismo mensaje que da el resultado «ya estaba cancelada» de FR-038 de la 001 si confirma.
5. **Dada** una cita cuya hora de inicio ya ha llegado, sea cual sea su estado, **cuando** se abre su enlace, **entonces** está caducado y da la respuesta uniforme de 002/FR-003, sin revelar la cita (RR6).
6. **Dada** una cita de las 10:00 y siendo las 08:01 de ese día, ya fuera del plazo de RN8 de la 001, **cuando** se abre su enlace, **entonces** un mensaje llano explica que ya no puede cancelarse por esta vía y ofrece el teléfono de la clínica (FR-029 de la 001), que se puede pulsar desde el móvil, y la cita no cambia. Es el mensaje del resultado «fuera de plazo» de FR-038 de la 001.
7. **Dado** un enlace alterado o inventado, **cuando** se abre, **entonces** da la respuesta uniforme de 002/FR-003 y no se revela ningún dato.
8. **Dado** un filtro de correo que abre el enlace de forma automática, **cuando** termina, **entonces** la cita sigue reservada, porque cancelar exige la confirmación expresa.
9. **Dado** un móvil de 360 píxeles de ancho, **cuando** se abre el enlace, **entonces** se lee y se maneja sin desplazamiento horizontal.
10. **Dado** un recordatorio ya enviado de una cita reservada, **cuando** recepción anula el enlace personal de esa ficha (RP7 de la 002) y después se abre el enlace de cancelación, **entonces** da la respuesta uniforme de 002/FR-003 y la cita sigue reservada.

---

### Historia de usuario 3 - Comprobar los recordatorios sin servidor de correo (Prioridad: P1)

Quien demuestra o prueba el producto ejecuta el proceso sin servidor de correo configurado y encuentra cada recordatorio como un fichero que se abre con cualquier programa de correo.

**Por qué esta prioridad**: es la forma de ver funcionar la feature en la demostración, sin riesgo de escribir a nadie, y la base de prueba de las demás historias.

**Prueba independiente**: sin servidor de correo configurado, ejecutar el proceso con los datos de demostración y abrir los ficheros generados.

**Escenarios de aceptación**:

1. **Dado** que no hay servidor de correo configurado, **cuando** se ejecuta el proceso, **entonces** cada recordatorio se escribe como fichero `.eml` en `datos/salida-correo/` y no sale ningún correo.
2. **Dado** un recordatorio simulado, **cuando** se comprueba si la cita ya tiene recordatorio, **entonces** cuenta como enviado.
3. **Dado** un fichero generado, **cuando** se abre, **entonces** tiene destinatario, asunto, los datos de la cita y un enlace de cancelación que funciona contra el producto en marcha, arrancado con el mismo momento de referencia que el proceso (FR-043 de la 001).
4. **Dado** un servidor de correo configurado sin que se cumpla FR-039 de la 001, **cuando** se ejecuta el proceso, **entonces** los recordatorios se escriben como en el escenario 1 y no sale ningún correo (FR-018).
5. **Dados** los mismos datos de demostración y el mismo momento de ejecución, **cuando** se ejecuta el proceso, **entonces** los destinatarios y el contenido son idénticos, salvo el enlace de cancelación.

---

### Historia de usuario 4 - Saber que el paciente ha cancelado (Prioridad: P2)

Recepción abre la agenda y distingue las citas que canceló el paciente de las que canceló ella, para poder ofrecer el hueco. Los huecos cancelados desde el correo entran además en la lista de huecos liberados por pacientes de 002/FR-019.

**Por qué esta prioridad**: el hueco ya queda libre sin esta historia, pero recepción no sabría por qué ha cambiado la agenda.

**Prueba independiente**: cancelar una cita desde el correo y otra desde recepción, y comparar cómo se muestran.

**Escenarios de aceptación**:

1. **Dada** una cita cancelada desde el correo, **cuando** recepción ve la agenda, **entonces** se muestra como «Cancelada por el paciente», con la fecha y la hora de la cancelación, igual que las canceladas desde el portal.
2. **Dada** una cita cancelada por recepción, **cuando** se ve la agenda, **entonces** se muestra como «Cancelada».

---

### Casos límite

- **Días de cambio de hora**: la ventana se cuenta por días naturales en hora local de la clínica, de modo que ningún día de 23 o 25 horas deja citas sin recordar ni las recuerda dos veces.
- **Fines de semana y festivos**: el proceso se ejecuta todos los días naturales, porque las citas del lunes se avisan el domingo.
- **Ejecución retrasada**: si el proceso sale más tarde de las 08:00, avisa de las mismas citas, las de mañana, y ninguna se pierde.
- **Un día sin ejecución**: las citas del día siguiente se quedan sin recordatorio, salvo que el proceso se lance a mano ese mismo día. El proceso no envía avisos fuera de la ventana.
- **Cita creada después de la ejecución, para hoy o para mañana**: no recibe recordatorio, porque el paciente acaba de reservar. Si alguien lanza el proceso a mano ese día, las de mañana sí se avisan.
- **Cita cancelada justo antes del envío**: el estado se comprueba al enviar, y si ya no está reservada no sale el recordatorio.
- **Fallo a mitad de ejecución**: al reanudar, las citas ya enviadas no se repiten y las pendientes se envían.
- **Paciente y recepción cancelan a la vez**: solo una acción prospera; la otra ve que la cita ya está cancelada.
- **Portal y correo cancelan a la vez**: FR-038 de la 001 deja la cita cancelada una vez y con un solo origen (FR-036 de la 001), y el otro canal obtiene «ya estaba cancelada».
- **Paciente cancela mientras recepción marca otro estado**: solo una prospera (RN4), y quien pierde ve el estado resultante.
- **Pantalla abierta mientras vence el plazo**: con el plazo de RN8 de la 001, si el paciente confirma a las 08:01 una cita de las 10:00 que abrió a las 07:55, se rechaza con el mensaje de fuera de plazo y la cita no cambia.
- **Justo en el límite**: confirmar a las 08:00 una cita de las 10:00 se acepta (RN8).
- **Pantalla abierta hasta el inicio**: si el paciente confirma después de la hora de inicio, el enlace ya está caducado y da la respuesta uniforme de 002/FR-003 (RR6).
- **Doble pulsación al confirmar**: FR-038 de la 001 cancela una sola vez y distingue «ya estaba cancelada». La segunda pulsación ve el mensaje de cita ya cancelada, sin error. El portal muestra en ese caso la cancelación como hecha (002/FR-017): cada canal elige su propio texto, como permite FR-038.
- **Hueco cancelado y vuelto a ocupar**: el enlace de la cita antigua solo actúa sobre esa cita y nunca sobre la nueva.
- **Correo compartido en una familia**: cada cita tiene su recordatorio, y el enlace solo sirve para esa cita.
- **Regenerar los datos de demostración**: los recordatorios registrados se borran con las citas, y los enlaces anteriores dejan de ser válidos.

## Requisitos *(obligatorio)*

### Reglas de negocio

Los tests de esta feature referencian estos identificadores (constitución, principio VI). Las reglas RN1 a RN7 son las de la 001 y siguen vigentes.

- **RR1**: una cita recibe como máximo un recordatorio, sea cual sea el número de ejecuciones del proceso y aunque coincidan en el tiempo. La garantía la da el sistema.
- **RR2**: solo se recuerdan citas que, en el momento del envío, están en estado reservada, caen dentro de la ventana de recordatorio y son de pacientes cuya ficha tiene correo. El recordatorio se envía al correo que tiene la ficha en ese momento.
- **RR3**: la ventana de recordatorio de una ejecución son las citas cuyo inicio cae en el día natural siguiente al de la ejecución, en hora local de la clínica. Con la ejecución de las 08:00 y el horario de 09:00 a 20:00, el aviso llega entre 25 y 36 horas antes.
- **RR4**: al confirmar desde el correo, la cita queda cancelada al momento y su tramo libre, sin intervención de recepción, mediante FR-038 de la 001 con el canal «correo». FR-038 aplica el plazo de RN8, registra el origen «correo» (FR-036) y distingue «cancelada ahora» de «ya estaba cancelada». Pasado el plazo de RN8, solo recepción puede cancelarla (RN5 de la 001). Esta spec solo fija los mensajes que ve el paciente.
- **RR5**: cambiar una cita de hora es cancelarla y crear otra (001). La cita nueva se trata como cualquier otra: tiene su recordatorio si cumple RR2 y RR3, aunque la cancelada ya lo tuviera. No hay correo específico de cambio.
- **RR6**: un enlace de cancelación solo da acceso a la cita para la que se generó, nunca cancela sin confirmación expresa y vale hasta la hora de inicio de esa cita (D5), comparada con el «ahora» del servidor que recibe el enlace, que es el de FR-043 de la 001, con el mismo momento de referencia que el proceso (FR-003). Desde ese momento está caducado y da la respuesta uniforme de 002/FR-003. Es la segunda credencial del paciente (D2), y todo lo demás lo hereda del modelo de acceso de la 002 (RP6): no se puede adivinar (002/FR-025), tiene límite de intentos (002/FR-004) y sesiones aparte (002/FR-005), y se anula con el enlace personal de la ficha (RP7).

### Requisitos funcionales

**Proceso diario**

- **FR-001**: El sistema DEBE ejecutar el proceso de recordatorios una vez al día, a las 08:00 en hora local de cada clínica, todos los días naturales, sin intervención de la clínica.
- **FR-002**: El proceso DEBE poder lanzarse también a mano, y repetirlo NO DEBE producir duplicados (RR1).
- **FR-003**: El proceso DEBE poder ejecutarse con el momento de referencia de FR-043 de la 001, que toma como «ahora», para que la demostración no dependa del reloj (constitución, principio V). Es el mismo ajuste que el del servidor, y no uno propio del proceso: con el mismo momento, el proceso calcula la ventana (RR3) y el servidor decide la vigencia del enlace (RR6) y el plazo de RN8 (FR-014).
- **FR-004**: El proceso DEBE calcular la ventana de cada clínica en su hora local, y DEBE cumplir RR3 también los días de cambio de hora.
- **FR-005**: Un fallo en una cita NO DEBE impedir el procesado de las demás, y una cita con envío fallido NO DEBE contar como recordada.
- **FR-006**: Cada ejecución DEBE dejar un resumen con las citas enviadas, las omitidas por no tener correo y las fallidas.

**Contenido del correo**

- **FR-007**: El recordatorio DEBE incluir el nombre de la clínica, el del paciente, el profesional, el servicio, la fecha con su día de la semana, la hora de inicio y el enlace de cancelación.
- **FR-008**: Las fechas y horas DEBEN cumplir FR-023 a FR-025 de la 001: `dd/mm/aaaa`, formato de 24 horas y hora local de la clínica, indicando a qué hora local se refieren.
- **FR-009**: El correo DEBE estar en español de España, sin jerga técnica, y DEBE leerse bien en el móvil de un paciente.
- **FR-010**: El correo DEBE dejar claro que cancelar libera el hueco para otra persona. De la ficha del paciente, el asunto y el cuerpo solo DEBEN contener el nombre (FR-007), y NO DEBEN contener su teléfono, su correo, que solo figura como destinatario, ni ningún otro dato de la ficha, como el enlace personal del portal (D3).

**Cancelación desde el correo**

- **FR-011**: El enlace DEBE dar acceso solo a la pantalla de cancelación de esa cita, con confirmación expresa (RR6). Funciona sin clave de clínica por la excepción única de FR-001 de la 001 para el acceso del paciente.
- **FR-012**: La pantalla DEBE mostrar la clínica, el profesional, el servicio, la fecha y la hora, y NO DEBE mostrar datos de otras citas ni de la ficha del paciente.
- **FR-013**: Antes de cancelar, la pantalla DEBE pedir confirmación y avisar de que no se puede deshacer, igual que FR-021 de la 001.
- **FR-014**: La confirmación DEBE usar FR-038 de la 001 con el canal «correo» (RR4), que aplica RN4 y RN8 en el momento de confirmar, aunque la pantalla se abriera antes. Esta spec solo fija el mensaje de cada resultado de FR-038:
  - **Cancelada ahora**: confirma la cancelación y que el hueco queda libre (HU2, escenario 2).
  - **Ya estaba cancelada**: dice que la cita ya está cancelada, sin error y sin ofrecer ninguna acción (HU2, escenario 4).
  - **Fuera de plazo**: explica que ya no puede cancelarse por esta vía y ofrece el teléfono de la clínica (FR-029 de la 001) (HU2, escenario 6).
  - **No cancelable**: no se da por el correo, porque una cita solo se completa o se marca como no asistida desde su inicio (RN5 de la 001), y desde entonces el enlace ya está caducado (RR6, HU2, escenario 5).
- **FR-015**: Abrir el enlace NO DEBE cambiar nada: solo la confirmación expresa cancela.
- **FR-016**: La cancelación DEBE registrar el origen «correo» y el momento de la cancelación, y la agenda DEBE mostrarla con la etiqueta «Cancelada por el paciente», según la definición de origen y momento (FR-036) y de etiqueta (FR-027) de la 001. Esta spec no define ningún dato ni etiqueta propios.
- **FR-017**: La pantalla DEBE cumplir FR-027 y FR-028 de la 001: mensajes llanos, 360 píxeles de ancho sin desplazamiento horizontal, contraste de 4,5:1 y controles táctiles de 44 × 44 píxeles.

**Modo de envío**

- **FR-018**: El sistema DEBE enviar los recordatorios por correo real solo si hay un servidor de correo configurado y se cumple FR-039 de la 001. Mientras FR-039 no se cumpla, el modo DEBE ser siempre el simulado de FR-019, aunque haya servidor configurado.
- **FR-019**: En cualquier otro caso, el sistema DEBE escribir cada recordatorio como un fichero `.eml` propio en `datos/salida-correo/`, sin sobrescribir los existentes y sin intentar enviar nada.
- **FR-020**: Un recordatorio simulado DEBE contar como enviado a efectos de RR1.

**Datos de demostración** (constitución, principio V)

- **FR-021**: Los datos de demostración DEBEN permitir ver las tres situaciones: citas recordadas, citas omitidas por no tener correo y citas fuera de la ventana. La semilla actual ya las cubre, porque 10 de sus 40 pacientes no tienen correo, y esta feature NO DEBE alterar las cifras de citas de la semilla (FR-030 de la 001). Los resúmenes de contenido son de la 001, que los actualiza cuando cambian los datos.
- **FR-022**: Con la semilla por defecto y el momento de referencia de FR-043 de la 001 en el 02/11/2026 a las 08:00, el proceso DEBE recordar las 5 citas reservadas del 03/11/2026: 4 recordatorios enviados y 1 cita omitida por no tener correo. De las 57 reservas futuras, 43 son de pacientes con correo y 14 de pacientes sin él. Recepción puede añadir el correo a una ficha desde una cita (FR-041 de la 001), pero eso no altera la semilla: estas cifras son las de la semilla recién generada.

**Pruebas** (constitución, principios III y VI)

- **FR-023**: Cada regla RR y cada criterio de aceptación DEBE tener un test que lo referencie, incluidas ejecuciones simultáneas del proceso, y ejecuciones en días de cambio de hora en la península y en Canarias. Los tests siguen la convención de FR-035 de la 001: empiezan por el identificador que comprueban, las reglas sin prefijo (`RR1` a `RR6`) y los requisitos, criterios, escenarios y casos límite de esta spec con el suyo (`003/FR-nnn`, `003/SC-nnn`, `003/Hx-Ey` y `003/CL`). Solo cuentan como cobertura de esta spec los tests que empiezan por uno de esos identificadores.
- **FR-024**: Las pruebas DEBEN intentar provocar un solape reservando un tramo a la vez que se cancela desde el correo, y comprobar que RN1 se mantiene.

### Entidades clave

- **Recordatorio**: constancia de que una cita tiene su aviso. Pertenece a una sola cita y guarda cuándo se envió, a qué dirección y por qué modo (real o simulado).
- **Enlace de cancelación**: acceso a una sola cita, generado con su recordatorio, que exige confirmación expresa para cancelar y vale hasta la hora de inicio de la cita (D5). Es una credencial del modelo de acceso del paciente de la 002 (RP6, D2).
- **Cita** (001): sin campos propios de esta feature. Usa el origen de la cancelación, con el valor «correo», y el momento que define FR-036 de la 001.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Durante los 3 primeros meses de uso se cumplen a la vez dos condiciones:
  - La tasa de no asistencia de la clínica piloto, calculada según RA3 de la 004 (no asistidas ÷ (completadas + no asistidas)), baja al menos un 30 % respecto a su tasa de partida. Como referencia con la semilla, un 30 % menos desde 10,8 % es 7,6 %.
  - La ocupación, calculada según RA4 de la 004, no baja respecto a la ocupación de partida del mismo periodo, que aporta la clínica (supuesto «Objetivo del 30 %»). Así la tasa no puede mejorar solo porque las no asistencias pasen a ser cancelaciones, sin ninguna cita más atendida (S-07).

  Como propuesta, el informe de SC-001 da aparte cuántas cancelaciones del periodo tienen origen «correo» y cuántas «portal» (FR-036 de la 001).
- **SC-002**: El 100 % de las citas reservadas con correo que cumplen RR2 tienen exactamente un recordatorio tras la ejecución.
- **SC-003**: En 1.000 rondas de ejecuciones simultáneas del proceso, cero citas reciben más de un recordatorio.
- **SC-004**: En 365 días consecutivos de ejecución simulada, que incluyen los dos cambios de hora, cero citas se quedan sin recordatorio por el cálculo de la ventana, tanto en la península como en Canarias.
- **SC-005**: Al menos 9 de cada 10 personas sin ayuda cancelan su cita desde el correo en menos de 1 minuto, también desde el móvil.
- **SC-006**: Una cita cancelada desde el correo aparece cancelada, y su tramo libre, la siguiente vez que recepción ve la agenda.
- **SC-007**: El 100 % de las reglas RR y de los escenarios de aceptación tiene un test que empieza por su identificador, según la convención de FR-035 de la 001 (FR-023), y la suite está en verde. SC-001 y SC-005 no tienen test automático, porque miden el uso real: se comprueban a mano con la clínica piloto (constitución, principio VI).

## Supuestos

- **Propietario**: se registra a AntonioLV1999, como en la 001, hasta que se indique otra cosa.
- **Objetivo del 30 %**: es una propuesta para SC-001, porque el encargo no fija cifra y no conocemos la tasa real del piloto. La clínica debe aportar, de los 3 meses anteriores al inicio del uso, dos cifras de partida (S-23):
  - la tasa de no asistencia, calculada con la fórmula de RA3 de la 004, y no sobre el total de citas, para que sea comparable con el panel;
  - la ocupación, calculada con RA4 de la 004 y la capacidad del horario de FR-012 de la 001. Sin ella no se puede comprobar la segunda condición de SC-001.

  Se descarta tomar el primer mes de uso como referencia, porque ese mes ya tiene recordatorios y su efecto quedaría dentro de la cifra de partida.
- **Hoy no se mueven citas**: la 001 no tiene esa operación y cambiar una cita es cancelarla y crear otra. Si otra spec crea esa operación, deberá revisar RR5.
- **Un único correo**: no hay confirmación de asistencia, ni segundo aviso, ni correo de confirmación tras cancelar. La pantalla de confirmación es el acuse.
- **Sin correo no hay aviso**: recepción no recibe una lista para llamar a esos pacientes; el resumen solo los cuenta. El correo sigue siendo opcional en la ficha, y recepción puede añadirlo desde una cita (FR-041 de la 001). Si lo añade antes del envío, la cita tiene su recordatorio cuando cumpla RR2 y RR3.
- **Sin aviso en la agenda de si se envió el recordatorio**: el encargo no lo pide.
- **Sin darse de baja**: el recordatorio es un aviso de servicio sobre una cita pedida por el paciente, y no ofrece darse de baja. Que incluya el servicio de la cita y no ofrezca la baja es el riesgo c de la condición 2 de FR-039 de la 001, que la revisión de protección de datos cubre antes de usar datos reales. Esta spec no fija ninguna condición propia. La única forma de que un paciente deje de recibir recordatorios es que recepción quite el correo de su ficha (FR-041 de la 001), y RR2 ya lo respeta, porque solo se envía a fichas con correo en el momento del envío.
- **Dirección del producto**: el enlace de cancelación se construye con la dirección pública única del producto (FR-042 de la 001). Esta spec no crea otro ajuste.
- **Datos reales**: el envío real lo condiciona FR-039 de la 001 (FR-018). Mientras FR-039 no se cumpla, que es el estado actual, la feature solo funciona en modo simulado.
- **Ficheros simulados**: se guardan en una carpeta que no entra en el control de versiones y no se borran solos, porque el modo simulado solo se usa con datos ficticios.
- **Fuera de alcance de la v1**: SMS, WhatsApp y que el paciente pueda mover la cita.

## Dependencias

- **Cambio del 10/11/2026 de la 001, aprobado por su propietario el 10/11/2026**. Esta spec cita de él:
  - RN8, el plazo único de cancelación del paciente (D1).
  - FR-036 y FR-027: origen, momento y etiqueta de la cancelación.
  - FR-038, la operación única de cancelar (S-05), y FR-020, que admite al paciente dentro de RN8. RR4, FR-014 y los casos límite «Portal y correo cancelan a la vez» y «Doble pulsación» la citan. FR-022 no se ve afectada, porque la cancelación la decide el paciente y no el sistema.
  - FR-039, la puerta de uso con datos reales (S-08). FR-018, HU3-E4 y el supuesto «Datos reales» la citan.
  - La excepción única de FR-001, que remite al modelo de acceso de la 002 (D2).
  - FR-029: teléfono de la clínica.
  - FR-030: cifras de citas protegidas.
- **Segundo cambio del 10/11/2026 de la 001, aprobado por su propietario el 10/11/2026**. Esta spec cita de él:
  - FR-035, la convención de identificadores de los tests (S-14). FR-023 y SC-007 la citan.
  - FR-039, condición 2, riesgo c: el recordatorio con el servicio y sin baja (S-24). El supuesto «Sin darse de baja» lo cita.
  - FR-041, el correo de la ficha desde una cita (S-13). FR-022 y los supuestos «Sin correo no hay aviso» y «Sin darse de baja» lo citan.
  - FR-042, la dirección pública única (S-16). El supuesto «Dirección del producto» la cita.
  - FR-043, el momento de referencia de la demostración (S-17). FR-003, FR-022, RR6 y HU3-E3 lo citan.
- **002-portal-paciente** (D2, en borrador): define el modelo de acceso del paciente (RP6) que hereda el enlace de cancelación (RR6): 002/FR-025, 002/FR-003, 002/FR-004, 002/FR-005 y RP7. La vigencia que pide 002/FR-003 la fija RR6 (D5). La lista de huecos de 002/FR-019 incluye los cancelados desde el correo. El plazo de cancelación es RN8 de la 001, y RR5 coincide con la 002, que no mueve citas.
  - **D3 (S-12), decidida por Sara: no**. El recordatorio no lleva el enlace personal del portal, solo el de cancelación, para que un correo reenviado solo dé acceso a una cita (RP6). FR-007 no cambia, y FR-010 excluye el enlace personal. En la rama de la 002, D3 aún figura como pregunta abierta.
- **004-panel-analitica** (en borrador): SC-001 se mide con RA3 y RA4. Si cambian, hay que revisar SC-001.

## Historial de cambios

### 10/11/2026: revisión cruzada

Resuelve los bloqueantes de `specs/000-revision-cruzada-nov2026.md` (en `master`) con las decisiones D1 (plazo único de 2 horas, definido en la 001) y D2 (dos credenciales; el modelo de acceso lo define la 002).

- **S-01**: RR4 deja de fijar su propio plazo y cita el plazo de cancelación del paciente de la 001 (D1). La dependencia con la 002 remite a esa regla común.
- **S-02**: FR-016, HU4 y la entidad Cita usan el origen «correo», el momento y la etiqueta «Cancelada por el paciente» de la 001. Esta spec ya no añade ese dato por su cuenta.
- **S-03**: FR-021 protege las cifras de citas de la semilla (FR-030 de la 001) y ya no protege sus resúmenes de contenido.
- **S-04**: RR6, FR-011 y la entidad «Enlace de cancelación» solo definen el alcance: una cita y confirmación expresa. El resto se hereda de 002/FR-001 a 002/FR-004 (D2), con un escenario nuevo para el enlace personal anulado (HU2, escenario 10). FR-011 remite a la excepción única de FR-001 de la 001. La dependencia de analítica pasa a ser `004-panel-analitica`.

### 10/11/2026: hallazgos altos y medios de la revisión cruzada

**Aviso (S-19)**: esta spec cita el cambio de la 001 del 10/11/2026 (RN8, FR-027, FR-029, FR-030, FR-036 y la excepción de FR-001), que su propietario **aprobó el 10/11/2026** y es la versión vigente. Cita también la 002 y la 004, que siguen en borrador. Si esos textos cambian antes de aprobarse, hay que revisar estas citas.

- **S-05**: RR4, FR-014 y el caso límite «Doble pulsación» citan la operación única de cancelar de la 001, y la 003 solo fija sus mensajes. Esa operación aún no está en la 001, así que la petición sobre FR-020 se mantiene en «Dependencias», reescrita como pendiente. Se añade el caso límite de cancelación simultánea desde el portal y el correo.
- **S-06**: SC-001 se mide con RA3 de la 004, y la tasa de partida se pide con esa fórmula. Con la semilla, un 30 % menos desde 10,8 % es 7,6 %.
- **S-07**: SC-001 exige además que la ocupación (RA4 de la 004) no baje en el mismo periodo, y propone informar aparte de las cancelaciones con origen «correo» y «portal».
- **S-08**: FR-018 solo envía correo real si se cumple la puerta de uso con datos reales de la 001, y si no, siempre usa el modo simulado de FR-019 (HU3, escenario 4 nuevo). La puerta aún no existe en la 001 y queda pendiente en «Dependencias».
- **S-11**: se retira el supuesto «Sin teléfono de la clínica». HU2-E6 y FR-014 ofrecen el teléfono de FR-029 de la 001.
- **S-20, decisión D5**: el enlace de cancelación vale hasta la hora de inicio de la cita, y después da la respuesta uniforme de 002/FR-003. Cambian RR6, la entidad y HU2-E5, que pasa a ser un caso de enlace caducado. Se añade un caso límite.
- **S-22**: RR6 cita 002/FR-025, 002/FR-005 y RP7, y HU2-E10 cita RP7. Al añadirse HU3-E4, el antiguo HU3-E4 pasa a ser HU3-E5. Las aclaraciones, HU2-E6, los casos límite y las dependencias citan RN8 en lugar de repetir la cifra. HU4 cita 002/FR-019.

### 10/11/2026: la 003 cita FR-038 y FR-039 de la 001 aprobada

Rama actualizada desde `master` sobre el cambio de la 001 aprobado el 10/11/2026, que recoge las dos peticiones que esta spec tenía pendientes.

- **S-05**: RR4, FR-014, los casos límite «Portal y correo cancelan a la vez» y «Doble pulsación» y «Dependencias» citan FR-038 de la 001 en lugar de «la operación única de cancelar», sin la marca de pendiente. FR-014 fija el mensaje de cada uno de los cuatro resultados de FR-038, y HU2 relaciona sus escenarios 2, 4 y 6 con «cancelada ahora», «ya estaba cancelada» y «fuera de plazo». «No cancelable» no se da por el correo, porque el enlace caduca en el inicio de la cita (RR6).
- **S-08**: FR-018, HU3-E4, el supuesto «Datos reales» y «Dependencias» citan FR-039 de la 001, sin la marca de pendiente. Sin FR-039 cumplido, el modo sigue siendo siempre el simulado.
- **Dependencias**: la operación de cancelar (FR-038) y la puerta de uso con datos reales (FR-039) pasan de «Pendiente de recoger en la 001» a lo que esta spec cita del cambio aprobado. Ya no queda nada pendiente de recoger en la 001.
- **S-19**: el aviso del historial anterior dice ahora que el cambio de la 001 está aprobado.

### 10/11/2026: la 003 recoge el segundo cambio de la 001

Rama rebasada sobre `master`, que contiene el segundo cambio de la 001 (S-13 a S-17, S-22, S-24 y S-25), **pendiente de aprobación** por su propietario. Las citas a ese cambio se agrupan en «Dependencias» y deben revisarse si cambia antes de aprobarse. La spec sigue en Borrador, y no se planifica ni se implementa hasta que `master` esté en verde (S-18).

- **S-24**: el supuesto «Sin darse de baja» deja de fijar su propia validación y cita el riesgo c de la condición 2 de FR-039 de la 001. Añade que la única forma de dejar de recibir recordatorios es que recepción quite el correo de la ficha (FR-041 de la 001). RR2 aclara que el correo se comprueba, y se toma, en el momento del envío.
- **S-13**: el supuesto «Sin correo no hay aviso» y FR-022 citan FR-041 de la 001. Las cifras de FR-022 (43 con correo y 14 sin él) no cambian, porque son de la semilla.
- **S-23**: el supuesto «Objetivo del 30 %» pide a la clínica, además de la tasa de partida con RA3, la ocupación de partida del mismo periodo, con RA4 de la 004 y el horario de FR-012 de la 001. SC-001 remite a esa cifra. Se descarta usar el primer mes de uso como referencia, porque ya tendría recordatorios.
- **S-22**: el caso límite «Doble pulsación al confirmar» ya no dice «como en el portal». El portal muestra la cancelación como hecha (002/FR-017), y el correo elige su propio texto, que FR-038 permite.
- **S-16**: el supuesto «Dirección del producto» cita FR-042 de la 001, sin crear otro ajuste.
- **S-17**: FR-003 cita FR-043 de la 001: el «ahora» del proceso es el mismo momento de referencia que el del servidor. RR6 compara la vigencia del enlace con ese «ahora», y FR-022 y HU3-E3 expresan su momento con el ajuste.
- **S-12, decisión D3 (Sara: no)**: el recordatorio no lleva el enlace personal del portal. FR-007 no cambia, y se anota en «Dependencias».
- **S-14**: FR-023 y SC-007 adoptan la convención de FR-035 de la 001: `RR1` a `RR6` sin prefijo, y `003/FR-nnn`, `003/SC-nnn`, `003/Hx-Ey` y `003/CL` para lo demás.
- **FR-007 y FR-010**: FR-010 prohibía «otros datos de la ficha del paciente», y FR-007 exige su nombre. FR-010 dice ahora que, de la ficha, el asunto y el cuerpo solo llevan el nombre, y excluye el teléfono, el correo (que solo figura como destinatario) y cualquier otro dato, como el enlace personal (D3).
- **Dependencias**: se añade lo que esta spec cita del segundo cambio de la 001: FR-035, FR-039 (riesgo c), FR-041, FR-042 y FR-043.

### 11/11/2026: el segundo cambio de la 001 está aprobado

Rama rebasada sobre `master`, que contiene el segundo cambio de la 001, **aprobado por su propietario el 10/11/2026**, y su implementación, con la suite en verde. Se cumple así la condición de S-18 para planificar.

- **Dependencias**: el segundo cambio de la 001 pasa de «pendiente de aprobación» a aprobado, y se retira el aviso de revisar sus citas si cambiaba antes de aprobarse. Las citas (FR-035, FR-039 riesgo c, FR-041, FR-042 y FR-043) no cambian, porque el texto aprobado es el que citaban.
- La spec sigue en Borrador hasta que la apruebe su propietario (principio I).
