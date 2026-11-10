# Especificación de feature: Recordatorios de cita

**Rama de la feature**: `003-recordatorios-cita`

**Creada**: 06/11/2026

**Estado**: Borrador (revisada el 10/11/2026 tras la revisión cruzada; ver «Historial de cambios»)

**Propietario**: AntonioLV1999 (registrado en `specs/MAPA.md`)

**Entrada**: descripción de la persona usuaria: «Recordatorios de cita. El dolor número uno del cliente piloto: la no asistencia. Alcance: un proceso diario genera un recordatorio por email para cada cita reservada de las próximas 24-48 horas, sin duplicar envíos; el email incluye los datos de la cita y una forma de que el paciente cancele si no va a ir (mejor un hueco libre que un no-show). Correo en modo simulado sin SMTP configurado: se escriben ficheros .eml en datos/salida-correo/. Preguntas cerradas para Sara: antelación exacta, qué pasa si el paciente cancela desde el email y con cuánta antelación puede, y si el recordatorio se reenvía cuando la cita se mueve. Fuera de alcance v1: SMS y WhatsApp».

## Aclaraciones

### Sesión del 06/11/2026

- P: ¿Cuándo debe recibir el paciente el recordatorio de su cita? → R: el proceso sale cada día a las 08:00 y avisa de las citas de mañana, entre 25 y 36 horas antes (RR3).
- P: ¿Qué ocurre cuando el paciente cancela desde el correo y hasta cuándo puede hacerlo? → R: la cita se cancela al momento, hasta 2 horas antes del inicio; después, el paciente debe contactar con la clínica (RR4).
- P: ¿Qué debe pasar con el recordatorio cuando una cita cambia de hora? → R: la cita nueva se trata como cualquier otra y tiene su recordatorio si aún le toca (RR5).

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
2. **Dada** esa pantalla, **cuando** el paciente confirma, **entonces** la cita queda cancelada al momento, su tramo queda libre y el paciente ve un mensaje que lo confirma.
3. **Dada** una cita cancelada desde el correo, **cuando** recepción reserva ese tramo, **entonces** se acepta (RN1 de la 001).
4. **Dada** una cita ya cancelada, **cuando** el paciente vuelve a abrir el enlace, **entonces** ve que ya está cancelada y no se le ofrece ninguna acción.
5. **Dada** una cita completada o no asistida, **cuando** se abre su enlace, **entonces** se indica el estado en que está y no se ofrece cancelar.
6. **Dada** una cita de las 10:00 y siendo las 08:01 de ese día, ya fuera del plazo de 2 horas de la 001, **cuando** se abre su enlace, **entonces** un mensaje llano explica que ya no puede cancelarse por esta vía y que debe contactar con la clínica, y la cita no cambia.
7. **Dado** un enlace alterado o inventado, **cuando** se abre, **entonces** da la respuesta uniforme de 002/FR-003 y no se revela ningún dato.
8. **Dado** un filtro de correo que abre el enlace de forma automática, **cuando** termina, **entonces** la cita sigue reservada, porque cancelar exige la confirmación expresa.
9. **Dado** un móvil de 360 píxeles de ancho, **cuando** se abre el enlace, **entonces** se lee y se maneja sin desplazamiento horizontal.
10. **Dado** un recordatorio ya enviado de una cita reservada, **cuando** recepción anula el enlace personal de esa ficha (002/FR-002) y después se abre el enlace de cancelación, **entonces** da la respuesta uniforme de 002/FR-003 y la cita sigue reservada.

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

Recepción abre la agenda y distingue las citas que canceló el paciente de las que canceló ella, para poder ofrecer el hueco.

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
- **Paciente cancela mientras recepción marca otro estado**: solo una prospera (RN4), y quien pierde ve el estado resultante.
- **Pantalla abierta mientras vence el plazo**: con el plazo de 2 horas de la 001, si el paciente confirma a las 08:01 una cita de las 10:00 que abrió a las 07:55, se rechaza con el mensaje de fuera de plazo y la cita no cambia.
- **Justo en el límite**: confirmar a las 08:00 una cita de las 10:00 se acepta.
- **Doble pulsación al confirmar**: la cita se cancela una vez y la segunda pulsación ve el mensaje de cita ya cancelada.
- **Hueco cancelado y vuelto a ocupar**: el enlace de la cita antigua solo actúa sobre esa cita y nunca sobre la nueva.
- **Correo compartido en una familia**: cada cita tiene su recordatorio, y el enlace solo sirve para esa cita.
- **Regenerar los datos de demostración**: los recordatorios registrados se borran con las citas, y los enlaces anteriores dejan de ser válidos.

## Requisitos *(obligatorio)*

### Reglas de negocio

Los tests de esta feature referencian estos identificadores (constitución, principio VI). Las reglas RN1 a RN7 son las de la 001 y siguen vigentes.

- **RR1**: una cita recibe como máximo un recordatorio, sea cual sea el número de ejecuciones del proceso y aunque coincidan en el tiempo. La garantía la da el sistema.
- **RR2**: solo se recuerdan citas en estado reservada en el momento del envío, dentro de la ventana de recordatorio y de pacientes con correo.
- **RR3**: la ventana de recordatorio de una ejecución son las citas cuyo inicio cae en el día natural siguiente al de la ejecución, en hora local de la clínica. Con la ejecución de las 08:00 y el horario de 09:00 a 20:00, el aviso llega entre 25 y 36 horas antes.
- **RR4**: al confirmar desde el correo, la cita queda cancelada al momento y su tramo libre, sin intervención de recepción. El paciente puede hacerlo dentro del plazo de cancelación del paciente que fija la 001, único para todos sus canales (D1). Pasado ese plazo, solo recepción puede cancelarla (RN5 de la 001).
- **RR5**: cambiar una cita de hora es cancelarla y crear otra (001). La cita nueva se trata como cualquier otra: tiene su recordatorio si cumple RR2 y RR3, aunque la cancelada ya lo tuviera. No hay correo específico de cambio.
- **RR6**: un enlace de cancelación solo da acceso a la cita para la que se generó y nunca cancela sin confirmación expresa. Es la segunda credencial del paciente (D2), y todo lo demás lo hereda del modelo de acceso de la 002: no se puede adivinar (002/FR-001), da la misma respuesta si es inventado o está anulado (002/FR-003), tiene límite de intentos y sesión (002/FR-004) y se anula con el enlace personal de la ficha (002/FR-002).

### Requisitos funcionales

**Proceso diario**

- **FR-001**: El sistema DEBE ejecutar el proceso de recordatorios una vez al día, a las 08:00 en hora local de cada clínica, todos los días naturales, sin intervención de la clínica.
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

- **FR-011**: El enlace DEBE dar acceso solo a la pantalla de cancelación de esa cita, con confirmación expresa (RR6). Funciona sin clave de clínica por la excepción única de FR-001 de la 001 para el acceso del paciente.
- **FR-012**: La pantalla DEBE mostrar la clínica, el profesional, el servicio, la fecha y la hora, y NO DEBE mostrar datos de otras citas ni de la ficha del paciente.
- **FR-013**: Antes de cancelar, la pantalla DEBE pedir confirmación y avisar de que no se puede deshacer, igual que FR-021 de la 001.
- **FR-014**: El sistema DEBE aplicar RN4 y RR4 en el momento de confirmar, aunque la pantalla se abriera antes. Si la cita ya no puede cancelarse, DEBE decirlo y dejarla intacta.
- **FR-015**: Abrir el enlace NO DEBE cambiar nada: solo la confirmación expresa cancela.
- **FR-016**: La cancelación DEBE registrar el origen «correo» y el momento de la cancelación, y la agenda DEBE mostrarla con la etiqueta «Cancelada por el paciente», según la definición de origen, momento y etiqueta de la 001. Esta spec no define ningún dato ni etiqueta propios.
- **FR-017**: La pantalla DEBE cumplir FR-027 y FR-028 de la 001: mensajes llanos, 360 píxeles de ancho sin desplazamiento horizontal, contraste de 4,5:1 y controles táctiles de 44 × 44 píxeles.

**Modo de envío**

- **FR-018**: Si hay un servidor de correo configurado, el sistema DEBE enviar los recordatorios a través de él.
- **FR-019**: Si no lo hay, el sistema DEBE escribir cada recordatorio como un fichero `.eml` propio en `datos/salida-correo/`, sin sobrescribir los existentes y sin intentar enviar nada.
- **FR-020**: Un recordatorio simulado DEBE contar como enviado a efectos de RR1.

**Datos de demostración** (constitución, principio V)

- **FR-021**: Los datos de demostración DEBEN permitir ver las tres situaciones: citas recordadas, citas omitidas por no tener correo y citas fuera de la ventana. La semilla actual ya las cubre, porque 10 de sus 40 pacientes no tienen correo, y esta feature NO DEBE alterar las cifras de citas de la semilla (FR-030 de la 001). Los resúmenes de contenido son de la 001, que los actualiza cuando cambian los datos.
- **FR-022**: Con la semilla por defecto y «ahora» el 02/11/2026 a las 08:00, el proceso DEBE recordar las 5 citas reservadas del 03/11/2026: 4 recordatorios enviados y 1 cita omitida por no tener correo. De las 57 reservas futuras, 43 son de pacientes con correo y 14 de pacientes sin él.

**Pruebas** (constitución, principios III y VI)

- **FR-023**: Cada regla RR y cada criterio de aceptación DEBE tener un test que lo referencie, incluidas ejecuciones simultáneas del proceso, y ejecuciones en días de cambio de hora en la península y en Canarias.
- **FR-024**: Las pruebas DEBEN intentar provocar un solape reservando un tramo a la vez que se cancela desde el correo, y comprobar que RN1 se mantiene.

### Entidades clave

- **Recordatorio**: constancia de que una cita tiene su aviso. Pertenece a una sola cita y guarda cuándo se envió, a qué dirección y por qué modo (real o simulado).
- **Enlace de cancelación**: acceso a una sola cita, generado con su recordatorio, que exige confirmación expresa para cancelar. Es una credencial del modelo de acceso del paciente de la 002 (D2).
- **Cita** (001): sin campos propios de esta feature. Usa el origen de la cancelación, con el valor «correo», y el momento que define la 001.

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
- **Hoy no se mueven citas**: la 001 no tiene esa operación y cambiar una cita es cancelarla y crear otra. Si otra spec crea esa operación, deberá revisar RR5.
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
  - **Plazo de cancelación del paciente** (S-01, D1): una regla de la 001, junto a RN5, con el plazo único de 2 horas para todos los canales del paciente. RR4 la cita.
  - **Origen, momento y etiqueta de la cancelación** (S-02): la 001 los define en la entidad Cita y en FR-027. FR-016 los cita.
  - **Excepción única de FR-001 de la 001** (S-04): el acceso del paciente sin clave de clínica, que remite al modelo de la 002. Cubre el enlace de cancelación, y esta spec no pide otra excepción.
  - **FR-020 de la 001** reserva a recepción los cambios de estado. Debe admitir la cancelación del paciente. FR-022 no se ve afectada, porque la cancelación la decide el paciente y no el sistema.
- **002-portal-paciente** (S-04, D2): define el modelo de acceso del paciente, que hereda el enlace de cancelación (RR6). Debe recoger que anular el enlace personal de una ficha anula también los enlaces de cancelación de esa ficha. El plazo de cancelación ya es la regla común de la 001 (D1), y RR5 coincide con la 002, que no mueve citas.
- **004-panel-analitica**: el origen de la cancelación (FR-016) puede interesarle; aquí solo se justifica por la agenda.

## Historial de cambios

### 10/11/2026: revisión cruzada

Resuelve los bloqueantes de `specs/000-revision-cruzada-nov2026.md` (en `master`) con las decisiones D1 (plazo único de 2 horas, definido en la 001) y D2 (dos credenciales; el modelo de acceso lo define la 002).

- **S-01**: RR4 deja de fijar su propio plazo y cita el plazo de cancelación del paciente de la 001 (D1). La dependencia con la 002 remite a esa regla común.
- **S-02**: FR-016, HU4 y la entidad Cita usan el origen «correo», el momento y la etiqueta «Cancelada por el paciente» de la 001. Esta spec ya no añade ese dato por su cuenta.
- **S-03**: FR-021 protege las cifras de citas de la semilla (FR-030 de la 001) y ya no protege sus resúmenes de contenido.
- **S-04**: RR6, FR-011 y la entidad «Enlace de cancelación» solo definen el alcance: una cita y confirmación expresa. El resto se hereda de 002/FR-001 a 002/FR-004 (D2), con un escenario nuevo para el enlace personal anulado (HU2, escenario 10). FR-011 remite a la excepción única de FR-001 de la 001. La dependencia de analítica pasa a ser `004-panel-analitica`.
