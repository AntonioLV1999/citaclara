<!--
INFORME DE IMPACTO (temporal: eliminar antes de confirmar el commit)

Cambio de versión: plantilla sin ratificar → 1.0.0
Motivo: primera adopción de la constitución.

Principios modificados: ninguno (no había versión anterior).
Principios añadidos:
  I. Spec primero
  II. Los números no admiten creatividad
  III. El solape es el fallo capital (NO NEGOCIABLE)
  IV. Simplicidad y cero alcance fantasma
  V. Demostrable con datos reproducibles
  VI. Los tests acompañan a la spec
  VII. Interfaz clara y moderna
  VIII. Español de España en todo

Secciones añadidas: Alcance y límites; Flujo de trabajo y puertas de calidad; Gobernanza.
Secciones eliminadas: ninguna.
Encabezados de la plantilla traducidos al español por el principio VIII (ningún script los lee).

Plantillas revisadas: no se modifican en este comando; leen la constitución al ejecutarse.
  ⚠ .specify/templates/*: siguen en inglés; las specs generadas deben redactarse en español.

Pendientes:
  - specs/MAPA.md aún no existe; debe crearse antes de aprobar la primera spec.
  - Sin marcadores TODO en el documento.
-->
# Constitución de CitaClara

CitaClara es un gestor de citas para clínicas y consultas pequeñas de fisioterapia, nutrición y
podología. Nace con desarrollo guiado por specs y está pensado para que varias features y varios
agentes avancen en paralelo desde el primer mes.

## Principios fundamentales

### I. Spec primero

- Todo comportamiento observable nace de una spec aprobada en `specs/`.
- Todo cambio de comportamiento empieza corrigiendo o creando su spec, nunca por el producto.
- Cada spec tiene un único propietario, registrado en `specs/MAPA.md`. Una spec sin propietario
  registrado no puede aprobarse.
- Una spec queda aprobada cuando su propietario la aprueba, y solo su propietario aprueba
  cambios en ella.
- Si el producto y su spec discrepan, la discrepancia es un defecto: se corrige el producto o,
  si la spec estaba equivocada, se corrige primero la spec.

*Razón*: con varios agentes en paralelo, la spec es la única fuente de verdad, y un propietario
único evita que dos trabajos redefinan la misma regla sin saberlo.

### II. Los números no admiten creatividad

- Todos los importes cuadran al céntimo, siempre: cada total coincide exactamente con la suma de
  las partes que se muestran, en pantalla y en cualquier documento o informe.
- Ningún importe es aproximado. Si una operación exige redondear, su spec fija la regla y el
  momento del redondeo.
- Los importes se muestran en euros con el formato español: `1.234,56 €`.
- Toda fecha u hora se muestra sin ambigüedad posible para una clínica española:
  - Las fechas siguen el orden día, mes y año, y las horas usan el formato de 24 horas.
  - Toda hora es la hora local de la clínica, incluidas las clínicas de Canarias, y se ve igual
    desde cualquier dispositivo. Si la hora puede leerse como de otro lugar, se indica cuál es.
  - Las specs que manejan horas definen el comportamiento en los días de cambio de hora.

*Razón*: un céntimo descuadrado o una cita leída con una hora de diferencia destruyen la
confianza de la clínica y de sus pacientes.

### III. El solape es el fallo capital (NO NEGOCIABLE)

- Un profesional no puede tener dos citas a la vez, jamás, sea cual sea el origen de la cita.
- Si dos reservas del mismo hueco llegan en el mismo instante, exactamente una prospera y la
  otra recibe un rechazo claro, con la agenda intacta.
- La garantía la da el sistema. No depende de que la interfaz oculte un hueco ni de que
  recepción lo vigile.
- Toda feature que escriba en la agenda (crear, mover, reprogramar o importar citas, entre otras
  operaciones) incluye pruebas que intenten provocar un solape, también con reservas simultáneas.
- Un solape es siempre un defecto de máxima gravedad y bloquea cualquier merge o entrega.

*Razón*: es el fallo que más daña a una clínica, porque enfrenta a dos pacientes con un solo
profesional.

### IV. Simplicidad y cero alcance fantasma

- Ante dos soluciones que cumplen la spec, se elige la más simple.
- Nada se construye sin estar justificado en una spec: ni funcionalidad, ni opciones
  «por si acaso», ni preparación para necesidades futuras.
- Ninguna dependencia se añade sin responder a una necesidad justificada en una spec. El plan
  elige y registra la dependencia concreta.
- Toda complejidad añadida se justifica por escrito frente a la alternativa más simple.

*Razón*: en un producto para consultas pequeñas, cada pieza de más cuesta mantenimiento y
multiplica los conflictos entre trabajos en paralelo.

### V. Demostrable con datos reproducibles

- El producto mantiene datos de demostración ficticios y deterministas: misma semilla, misma
  historia, sea quien sea quien los genere, y sea cuando sea.
- Las specs, los ejemplos y la analítica citan números que cualquiera puede reproducir a partir
  de esos datos.
- Si un cambio en los datos de demostración altera un número citado, ese mismo cambio actualiza
  las citas afectadas.

*Razón*: un número que no se puede reproducir no se puede verificar, ni discutir con rigor.

### VI. Los tests acompañan a la spec

- Cada regla de negocio y cada criterio de aceptación relevante tiene su test, y ese test
  referencia la regla o el criterio que comprueba.
- Se consideran relevantes todos, salvo que la spec justifique por escrito lo contrario.
- La suite en verde es condición de merge, sin excepciones.
- Ningún test se desactiva ni se relaja para conseguir el verde. Si el test ya no es válido,
  primero se corrige su spec.

*Razón*: la trazabilidad entre spec y test es lo que permite a varios agentes cambiar el producto
sin romper en silencio lo que otro construyó.

### VII. Interfaz clara y moderna

- Recepción usa el producto sin formación y sin manual: las tareas habituales se resuelven
  a partir de lo que muestra la pantalla.
- En pantalla no hay jerga técnica. Los errores dicen, en lenguaje llano, qué ha pasado y qué
  puede hacer la persona.
- El contraste y los tamaños son accesibles. Cada spec de interfaz incluye criterios verificables.
- El producto funciona en el portátil de recepción y en el móvil de un paciente.

*Razón*: quien lo usa atiende a pacientes mientras lo hace; si necesita ayuda para usarlo, el
producto ha fallado. Este principio fija calidad, no tecnología.

### VIII. Español de España en todo

- La interfaz, los mensajes y avisos, los datos de demostración, las specs, los planes, las
  tareas y la documentación se escriben en español de España.
- Se usan el vocabulario y las convenciones propios de España: «móvil», «ordenador» y el formato
  numérico español, entre otros.

*Razón*: el producto y su equipo sirven a clínicas españolas, y un solo idioma evita traducciones
y dobles interpretaciones de las reglas.

## Alcance y límites

- Esta constitución fija principios de negocio y de calidad. No contiene decisiones técnicas: el
  stack, los formatos y las estructuras se deciden en el plan de cada feature.
- Ningún plan puede contradecir estos principios. Si uno lo necesita, se enmienda antes la
  constitución.

## Flujo de trabajo y puertas de calidad

Un cambio solo se integra si cumple todas estas condiciones:

1. Su comportamiento está en una spec aprobada por su propietario (I).
2. Los importes, las fechas y las horas que toca cumplen las reglas de presentación y de cuadre (II).
3. Si escribe en la agenda, incluye pruebas que intentan provocar un solape (III).
4. No añade funcionalidad ni dependencias sin justificar en una spec (IV).
5. Los números citados se reproducen con los datos de demostración (V).
6. Las reglas y los criterios tienen tests que los referencian, y la suite está en verde (VI).
7. Lo que ve el usuario cumple los principios de interfaz y de idioma (VII y VIII).

Para trabajar en paralelo:

- Una feature que necesite cambiar la spec de otro propietario pide ese cambio al propietario, y
  no lo aplica por su cuenta.
- Cuando dos specs entren en conflicto, sus propietarios lo resuelven antes de seguir, y la
  decisión queda escrita en las specs afectadas.

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica, plan o spec del proyecto. Todo lo que
  declara es obligatorio.
- Una enmienda exige una propuesta escrita con su motivo y su impacto, la aprobación de la
  persona responsable del producto, y la actualización de las specs y los planes afectados.
- La versión sigue el versionado semántico:
  - **MAYOR**: se elimina o se redefine un principio de forma incompatible.
  - **MENOR**: se añade un principio o sección, o se amplía de forma sustancial.
  - **PARCHE**: aclaraciones y correcciones de redacción sin cambio de significado.
- Toda revisión de un cambio verifica su cumplimiento con las puertas de calidad anteriores, y
  todo plan pasa la comprobación de constitución antes de ejecutarse.

**Versión**: 1.0.0 | **Ratificada**: 2026-11-05 | **Última enmienda**: 2026-11-05
