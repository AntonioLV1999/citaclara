# Especificación de feature: Recordatorios de cita

**Rama de la feature**: `003-recordatorios-cita`

**Creada**: 06/11/2026

**Estado**: Borrador, pendiente de las 3 preguntas para Sara

**Propietario**: AntonioLV1999 (registrado en `specs/MAPA.md`)

**Entrada**: descripción de la persona usuaria: «Recordatorios de cita. El dolor número uno del cliente piloto: la no asistencia. Alcance: un proceso diario genera un recordatorio por email para cada cita reservada de las próximas 24-48 horas, sin duplicar envíos; el email incluye los datos de la cita y una forma de que el paciente cancele si no va a ir (mejor un hueco libre que un no-show). Correo en modo simulado sin SMTP configurado: se escriben ficheros .eml en datos/salida-correo/. Preguntas cerradas para Sara: antelación exacta, qué pasa si el paciente cancela desde el email y con cuánta antelación puede, y si el recordatorio se reenvía cuando la cita se mueve. Fuera de alcance v1: SMS y WhatsApp».

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
9. **Dada** una clínica de Canarias, **cuando** el paciente lee el correo, **entonces** la hora es la local de la clínica e indica a qué hora local se refiere.

---

### Historia de usuario 2 - Cancelar la cita desde el correo (Prioridad: P1)

El paciente que sabe que no irá abre el enlace del recordatorio, ve qué cita va a cancelar y lo confirma. El hueco queda libre sin que tenga que llamar y la clínica puede ofrecerlo a otra persona.

**Por qué esta prioridad**: convierte una no asistencia en un hueco aprovechable, que es el objetivo de la feature.

**Prueba independiente**: abrir el enlace de un recordatorio sin clave de clínica, cancelar y comprobar en la agenda que la cita está cancelada y que su tramo admite una reserva nueva.

**Escenarios de aceptación**:

1. **Dado** un recordatorio de una cita reservada dentro del plazo de cancelación, **cuando** el paciente abre el enlace, **entonces** ve los datos de la cita y un botón de confirmar, y la cita aún no ha cambiado.
2. **Dada** esa pantalla, **cuando** el paciente confirma, **entonces** se aplica el efecto que fije RR4 y el paciente ve un mensaje que lo confirma.
3. **Dada** una cita cancelada desde el correo, **cuando** recepción reserva ese tramo, **entonces** se acepta (RN1 de la 001).
4. **Dada** una cita ya cancelada, **cuando** el paciente vuelve a abrir el enlace, **entonces** ve que ya está cancelada y no se le ofrece ninguna acción.
5. **Dada** una cita completada o no asistida, **cuando** se abre su enlace, **entonces** se indica el estado en que está y no se ofrece cancelar.
6. **Dada** una cita fuera del plazo de cancelación, **cuando** se abre su enlace, **entonces** un mensaje llano explica que ya no puede cancelarse por esta vía y que debe contactar con la clínica, y la cita no cambia.
7. **Dado** un enlace alterado o inventado, **cuando** se abre, **entonces** un mensaje llano dice que no es válido y no se revela ningún dato.
8. **Dado** un filtro de correo que abre el enlace de forma automática, **cuando** termina, **entonces** la cita sigue reservada, porque cancelar exige la confirmación expresa.
9. **Dado** un móvil de 360 píxeles de ancho, **cuando** se abre el enlace, **entonces** se lee y se maneja sin desplazamiento horizontal.

---

### Historia de usuario 3 - Comprobar los recordatorios sin servidor de correo (Prioridad: P1)

Quien demuestra o prueba el producto ejecuta el proceso sin servidor de correo configurado y encuentra cada recordatorio como un fichero que se abre con cualquier programa de correo.

**Por qué esta prioridad**: es la forma de ver funcionar la feature en la demostración, sin riesgo de escribir a nadie, y la base de prueba de las demás historias.

**Prueba independiente**: sin servidor de correo configurado, ejecutar el proceso con los datos de demostración y abrir los ficheros generados.

**Escenarios de aceptación**:

1. **Dado** que no hay servidor de correo configurado, **cuando** se ejecuta el proceso, **entonces** cada recordatorio se escribe como fichero `.eml` en `datos/salida-correo/` y no sale ningún correo.
2. **Dado** un recordatorio simulado, **cuando** se comprueba si la cita ya tiene recordatorio, **entonces** cuenta como enviado.
3. **Dado** un fichero generado, **cuando** se abre, **entonces** tiene destinatario, asunto, los datos de la cita y un enlace de cancelación que funciona contra el producto en marcha.
4. **Dados** los mismos datos de demostración y el mismo momento de ejecución, **cuando** se ejecuta el proceso, **entonces** los destinatarios y el contenido son idénticos, salvo el enlace de cancelación.

---

### Historia de usuario 4 - Saber que el paciente ha cancelado (Prioridad: P2)

Recepción abre la agenda y distingue las citas que el paciente canceló desde el correo de las demás cancelaciones, para poder ofrecer el hueco.

**Por qué esta prioridad**: el hueco ya queda libre sin esta historia, pero recepción no sabría por qué ha cambiado la agenda.

**Prueba independiente**: cancelar una cita desde el correo y otra desde recepción, y comparar cómo se muestran.

**Escenarios de aceptación**:

1. **Dada** una cita cancelada desde el correo, **cuando** recepción ve la agenda, **entonces** se muestra como «Cancelada» con la indicación de que lo hizo el paciente desde el correo.
2. **Dada** una cita cancelada por recepción, **cuando** se ve la agenda, **entonces** se muestra como en la 001, sin esa indicación.

---

### Casos límite

- **Días de cambio de hora**: la ventana se calcula en hora local de la clínica, de modo que ningún día de 23 o 25 horas deja citas sin recordar ni las recuerda dos veces.
- **Fines de semana y festivos**: el proceso se ejecuta todos los días naturales, porque las citas del lunes también necesitan su aviso.
- **Un día sin ejecución**: las citas que salen de la ventana sin recordatorio se quedan sin él. El proceso no envía avisos fuera de la ventana.
- **Cita creada cuando su ventana ya ha pasado**: no recibe recordatorio; el paciente acaba de reservar.
- **Cita cancelada justo antes del envío**: el estado se comprueba al enviar, y si ya no está reservada no sale el recordatorio.
- **Fallo a mitad de ejecución**: al reanudar, las citas ya enviadas no se repiten y las pendientes se envían.
- **Paciente y recepción cancelan a la vez**: solo una acción prospera; la otra ve que la cita ya está cancelada.
- **Paciente cancela mientras recepción marca otro estado**: solo una prospera (RN4), y quien pierde ve el estado resultante.
- **Doble pulsación al confirmar**: la cita se cancela una vez y la segunda pulsación ve el mensaje de cita ya cancelada.
- **Hueco cancelado y vuelto a ocupar**: el enlace de la cita antigua solo actúa sobre esa cita y nunca sobre la nueva.
- **Correo compartido en una familia**: cada cita tiene su recordatorio, y el enlace solo sirve para esa cita.
- **Regenerar los datos de demostración**: los recordatorios registrados se borran con las citas, y los enlaces anteriores dejan de ser válidos.

## Requisitos *(obligatorio)*

### Reglas de negocio

Los tests de esta feature referencian estos identificadores (constitución, principio VI). Las reglas RN1 a RN7 son las de la 001 y siguen vigentes.

- **RR1**: una cita recibe como máximo un recordatorio, sea cual sea el número de ejecuciones del proceso y aunque coincidan en el tiempo. La garantía la da el sistema.
- **RR2**: solo se recuerdan citas en estado reservada en el momento del envío, dentro de la ventana de recordatorio y de pacientes con correo.
- **RR3**: la ventana de recordatorio es [NEEDS CLARIFICATION: antelación exacta del recordatorio, pregunta 1 para Sara].
- **RR4**: la cancelación desde el correo tiene este efecto y este plazo: [NEEDS CLARIFICATION: efecto de la cancelación y antelación mínima, pregunta 2 para Sara].
- **RR5**: cuando una cita cambia de hora, el recordatorio se trata así: [NEEDS CLARIFICATION: reenvío al mover una cita, pregunta 3 para Sara].
- **RR6**: un enlace de cancelación solo da acceso a la cita para la que se generó, no se puede deducir a partir de otro y nunca cancela sin confirmación expresa.

### Requisitos funcionales

**Proceso diario**

- **FR-001**: El sistema DEBE ejecutar el proceso de recordatorios una vez al día, todos los días naturales, sin intervención de la clínica.
- **FR-002**: El proceso DEBE poder lanzarse también a mano, y repetirlo NO DEBE producir duplicados (RR1).
- **FR-003**: El proceso DEBE poder ejecutarse indicando el momento que toma como «ahora», para que la demostración no dependa del reloj (constitución, principio V).
- **FR-004**: El proceso DEBE calcular la ventana de cada clínica en su hora local, y DEBE cumplir RR3 también los días de cambio de hora.
- **FR-005**: Un fallo en una cita NO DEBE impedir el procesado de las demás, y una cita con envío fallido NO DEBE contar como recordada.
- **FR-006**: Cada ejecución DEBE dejar un resumen con las citas enviadas, las omitidas por no tener correo y las fallidas.

**Contenido del correo**

- **FR-007**: El recordatorio DEBE incluir el nombre de la clínica, el del paciente, el profesional, el servicio, la fecha con su día de la semana, la hora de inicio y el enlace de cancelación.
- **FR-008**: Las fechas y horas DEBEN cumplir FR-023 a FR-025 de la 001: `dd/mm/aaaa`, formato de 24 horas y hora local de la clínica, indicando a qué hora local se refieren.
- **FR-009**: El correo DEBE estar en español de España, sin jerga técnica, y DEBE leerse bien en el móvil de un paciente.
- **FR-010**: El correo DEBE dejar claro que cancelar libera el hueco para otra persona, y NO DEBE contener el teléfono ni otros datos de la ficha del paciente.

**Cancelación desde el correo**

- **FR-011**: El enlace DEBE funcionar sin clave de clínica y dar acceso solo a la pantalla de cancelación de esa cita (RR6).
- **FR-012**: La pantalla DEBE mostrar la clínica, el profesional, el servicio, la fecha y la hora, y NO DEBE mostrar datos de otras citas ni de la ficha del paciente.
- **FR-013**: Antes de cancelar, la pantalla DEBE pedir confirmación y avisar de que no se puede deshacer, igual que FR-021 de la 001.
- **FR-014**: El sistema DEBE aplicar RN4 y RR4 en el momento de confirmar, aunque la pantalla se abriera antes. Si la cita ya no puede cancelarse, DEBE decirlo y dejarla intacta.
- **FR-015**: Abrir el enlace NO DEBE cambiar nada: solo la confirmación expresa cancela.
- **FR-016**: La cancelación DEBE registrar que la hizo el paciente desde el correo, y la agenda DEBE mostrarlo junto al estado «Cancelada».
- **FR-017**: La pantalla DEBE cumplir FR-027 y FR-028 de la 001: mensajes llanos, 360 píxeles de ancho sin desplazamiento horizontal, contraste de 4,5:1 y controles táctiles de 44 × 44 píxeles.

**Modo de envío**

- **FR-018**: Si hay un servidor de correo configurado, el sistema DEBE enviar los recordatorios a través de él.
- **FR-019**: Si no lo hay, el sistema DEBE escribir cada recordatorio como un fichero `.eml` propio en `datos/salida-correo/`, sin sobrescribir los existentes y sin intentar enviar nada.
- **FR-020**: Un recordatorio simulado DEBE contar como enviado a efectos de RR1.

**Datos de demostración** (constitución, principio V)

- **FR-021**: Los datos de demostración DEBEN permitir ver las tres situaciones: citas recordadas, citas omitidas por no tener correo y citas fuera de la ventana. La semilla actual ya las cubre, porque 10 de sus 40 pacientes no tienen correo, y esta feature NO DEBE alterar sus cifras ni sus resúmenes de contenido (FR-030 de la 001).
- **FR-022**: Cerrada RR3, esta spec DEBE citar el número exacto de recordatorios que genera la semilla por defecto en un momento de referencia fijo.

**Pruebas** (constitución, principios III y VI)

- **FR-023**: Cada regla RR y cada criterio de aceptación DEBE tener un test que lo referencie, incluidas ejecuciones simultáneas del proceso, y ejecuciones en días de cambio de hora en la península y en Canarias.
- **FR-024**: Las pruebas DEBEN intentar provocar un solape reservando un tramo a la vez que se cancela desde el correo, y comprobar que RN1 se mantiene.

### Entidades clave

- **Recordatorio**: constancia de que una cita tiene su aviso. Pertenece a una sola cita y guarda cuándo se envió, a qué dirección y por qué modo (real o simulado).
- **Enlace de cancelación**: acceso no adivinable a una sola cita, generado con su recordatorio. Sirve sin clave de clínica y deja de permitir acciones cuando la cita no puede cancelarse.
- **Cita** (ampliada, 001): añade quién la canceló, para distinguir al paciente desde el correo.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: La tasa de no asistencia de la clínica piloto baja al menos un 30 % respecto a la suya previa, medida durante los 3 primeros meses de uso.
- **SC-002**: El 100 % de las citas reservadas con correo que cumplen RR2 tienen exactamente un recordatorio tras la ejecución.
- **SC-003**: En 1.000 rondas de ejecuciones simultáneas del proceso, cero citas reciben más de un recordatorio.
- **SC-004**: En 365 días consecutivos de ejecución simulada, que incluyen los dos cambios de hora, cero citas se quedan sin recordatorio por el cálculo de la ventana, tanto en la península como en Canarias.
- **SC-005**: Al menos 9 de cada 10 personas sin ayuda cancelan su cita desde el correo en menos de 1 minuto, también desde el móvil.
- **SC-006**: Una cita cancelada desde el correo aparece cancelada, y su tramo libre, la siguiente vez que recepción ve la agenda.
- **SC-007**: El 100 % de las reglas RR y de los escenarios de aceptación tiene un test que los referencia, y la suite está en verde. SC-001 y SC-005 no tienen test automático, porque miden el uso real: se comprueban a mano con la clínica piloto (constitución, principio VI).

## Supuestos

- **Propietario**: se registra a AntonioLV1999, como en la 001, hasta que se indique otra cosa.
- **Objetivo del 30 %**: es una propuesta para SC-001, porque el encargo no fija cifra y no conocemos la tasa real del piloto. La clínica debe aportar esa tasa de partida.
- **Hoy no se mueven citas**: la 001 no tiene esa operación y cambiar una cita es cancelarla y crear otra. La pregunta 3 se plantea sobre esa realidad.
- **Un único correo**: no hay confirmación de asistencia, ni segundo aviso, ni correo de confirmación tras cancelar. La pantalla de confirmación es el acuse.
- **Sin correo no hay aviso**: recepción no recibe una lista para llamar a esos pacientes; el resumen solo los cuenta. El correo sigue siendo opcional en la ficha.
- **Sin aviso en la agenda de si se envió el recordatorio**: el encargo no lo pide.
- **Sin darse de baja**: el recordatorio es un aviso de servicio sobre una cita pedida por el paciente. Debe validarse con quien asesore en protección de datos antes de usar datos reales, porque el servicio de la cita puede revelar información de salud.
- **Sin teléfono de la clínica**: la 001 no lo guarda y añadirlo alteraría la semilla, así que el mensaje de fuera de plazo dice «contacta con la clínica» sin dar un número.
- **Dirección del producto**: el enlace necesita una dirección pública del producto, que forma parte de la configuración.
- **Datos reales (deuda de la 001)**: la conexión sin cifrar de la 001 también afecta a los enlaces de cancelación. Enviar correo real a pacientes reales exige resolver antes esa deuda.
- **Ficheros simulados**: se guardan en una carpeta que no entra en el control de versiones y no se borran solos, porque el modo simulado solo se usa con datos ficticios.
- **Fuera de alcance de la v1**: SMS, WhatsApp y que el paciente pueda mover la cita.

## Dependencias

- **Cambios necesarios en la 001**, que debe aprobar su propietario antes de implementar (constitución, «Para trabajar en paralelo»):
  - **FR-001 de la 001** exige la clave para cualquier operación, por cualquier vía. El enlace de cancelación es una excepción que debe constar allí.
  - **Entidad Paciente y supuestos de la 001**: dicen «sin acceso al producto» y dejan fuera «cualquier acceso del paciente». Esta spec introduce un acceso acotado a una sola cita.
  - **FR-020 de la 001** reserva a recepción los cambios de estado. Debe admitir la cancelación del paciente. FR-022 no se ve afectada, porque la cancelación la decide el paciente y no el sistema.
- **002-portal-paciente**: si el portal permite cancelar o mover citas, RR4 y RR5 deben coincidir con sus reglas. Sus propietarios lo resuelven antes de aprobar.
- **Analítica (rama `main04`)**: el dato de quién canceló (FR-016) puede interesarle; aquí solo se justifica por la agenda.
