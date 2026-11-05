# Investigación: Núcleo de agenda

**Feature**: [spec.md](spec.md) | **Fecha**: 05/11/2026

Entorno comprobado: Node 26.13 y npm 11.20 disponibles; sin PostgreSQL ni Python utilizable; Docker 19.03 (2019). El repositorio no tiene código todavía.

## 1. Garantía contra el solape (RN1, principio III)

- **Decisión**: SQLite con un disparador `BEFORE INSERT` que aborta la escritura si existe una cita reservada o completada del mismo profesional que se cruza con la nueva. Cada alta se ejecuta en una transacción `BEGIN IMMEDIATE`.
- **Razón**: la regla vive en el almacén, de modo que se cumple sea cual sea el origen de la cita, incluida la semilla. SQLite admite un único escritor a la vez, así que la comprobación y la inserción no pueden intercalarse entre dos peticiones, ni siquiera desde procesos distintos.
- **Alternativas descartadas**:
  - PostgreSQL con restricción de exclusión: es la garantía declarativa clásica, pero exige instalar y operar un servidor para clínicas de 2 a 5 profesionales. Es la vía de migración si algún día hacen falta varios servidores.
  - Comprobar en la aplicación y después insertar: tiene una ventana de carrera, y es justo el fallo que prohíbe el principio III.
  - Índice único sobre el inicio: no detecta solapes parciales.
- **Comprobación empírica**: 4 procesos y 1.000 rondas de tramos que se cruzan, sobre un archivo compartido. Resultado: 1.000 citas, 0 solapes, 0 errores de bloqueo.
- **Límite de esa prueba**: un mismo proceso ganó las 1.000 rondas, de modo que hubo poca simultaneidad real dentro de cada ronda. Valida el mecanismo, pero no sirve como test final. El test de SC-001 debe sincronizar los procesos con una barrera en cada ronda.

## 2. Plataforma y dependencias (principio IV)

- **Decisión**: Node 26 con JavaScript y módulos ES, usando solo la biblioteca estándar en producción: `node:http`, `node:sqlite`, `node:crypto` y `node:test`. Cero dependencias de producción.
- **Razón**: Node es lo que hay instalado, y su biblioteca estándar cubre servidor, almacén, hash de la clave y tests. `node:sqlite` carga sin aviso experimental en 26.13.
- **Alternativas descartadas**: un framework web (unas 12 rutas no lo justifican) y TypeScript (paso de compilación sin necesidad en la spec).
- **Única dependencia de desarrollo**: `@playwright/test`. FR-028 y SC-007 solo se pueden comprobar en un navegador real: desbordamiento a 360 píxeles, tamaño de controles y contraste calculado.

## 3. Interfaz (principio VII)

- **Decisión**: HTML generado en el servidor, formularios con redirección tras POST, una hoja de estilos propia y dos scripts pequeños de mejora: búsqueda de paciente y resumen del alta.
- **Razón**: es lo más simple que cumple la spec. No hay estado de cliente que sincronizar, y tras cada rechazo la pantalla refleja la agenda real (FR-019).
- **Confirmaciones (FR-021)**: una página propia, que funciona sin JavaScript y se prueba igual que el resto.
- **Alternativa descartada**: aplicación de una sola página. Añade compilación, dependencias y una API que nadie más usa.
- **Campos de fecha (FR-024)**: de texto, en `dd/mm/aaaa`. `<input type="date">` pinta la fecha según el idioma del navegador, no el de la página: con Chromium en inglés, el 05/11/2026 se ve como `11/05/2026`. A cambio se pierde el calendario nativo.
- **Seguridad de las vistas**: todo dato se escapa al generar HTML, mediante una única función de plantilla.

## 4. Representación del tiempo (principio II, FR-023 a FR-025)

- **Decisión**: inicio y fin se guardan como hora local de la clínica, en texto `AAAA-MM-DDTHH:MM`, sin convertir a UTC. La clínica guarda su zona (`Europe/Madrid` o `Atlantic/Canary`). «Ahora» se obtiene del reloj del servidor, convertido a esa zona con `Intl`.
- **Razón**: la regla de negocio es que las 10:00 siguen siendo las 10:00 a ambos lados del cambio de hora, y la hora local la cumple sin ninguna conversión. Además, la comparación de textos ordena bien, por lo que el disparador de solape es directo. Comprobado con `Intl`: ambas zonas dan la hora correcta en la madrugada del 25/10/2026.
- **Alternativa descartada**: guardar UTC. Es la opción habitual para instantes globales, pero obliga a convertir en cada lectura y comparación y mueve la hora local si cambian las reglas de horario de verano. Una cita de clínica es una hora de pared, y nunca se compara entre clínicas.
- **Cambio de hora**: los dos cambios anuales caen en domingo y la clínica abre de lunes a viernes (FR-012), así que esas horas se rechazan como fuera de horario, sin lógica adicional. Si una spec futura abre los domingos, deberá añadir el rechazo específico; los tests de FR-025 lo avisarán.
- **Reloj inyectable**: los servicios reciben una función `ahora()`, y los tests fijan el momento sin tocar el reloj del sistema.

## 5. Importes (principio II)

- **Decisión**: precios en céntimos enteros, y formato `1.234,56 €` en una sola función.
- **Razón**: con enteros no hay redondeo. La 001 no suma importes, de modo que no hace falta regla de redondeo.

## 6. Acceso (FR-001 a FR-004)

- **Decisión**: la clave se guarda con `scrypt` y sal. Al entrar, se compara con la de cada clínica. La sesión es un token aleatorio cuyo hash se guarda en el almacén, en una cookie `HttpOnly`, `SameSite=Strict`, sin `Max-Age`.
- **Razón**: `SameSite=Strict` cubre los envíos cruzados sin añadir tokens en cada formulario. Comparar con cada clínica es lo más simple con una clínica, y evita pedir un identificador que recepción tendría que recordar.
- **Deuda consciente**: sin usuarios individuales, sin rotación de clave, sin límite de intentos y sin caducidad de sesión. Comparar clínica a clínica deja de ser viable con muchas clínicas.

## 7. Semilla determinista (principio V, FR-029 a FR-034)

- **Decisión**: una función pura `generar({ semilla, lunes })` con un generador pseudoaleatorio propio de pocas líneas (mulberry32). No lee el reloj ni usa `Math.random`. Las citas se calculan como semana relativa, día de la semana y minuto, y solo al final se convierten en fechas a partir del lunes.
- **Razón**: separar el contenido relativo de las fechas hace que cambiar de lunes no pueda alterar citas ni cifras (FR-032). Los porcentajes se aplican con recuentos exactos sobre una lista barajada, no por sorteo cita a cita, lo que garantiza los márgenes de FR-030.
- **Sal de la clave de demostración**: fija y derivada de la semilla, para que el resultado sea idéntico (SC-005).
- **Comparación**: un resumen SHA-256 de los registros en orden canónico. Comparar archivos de base de datos no serviría, porque su formato binario puede variar.
- **Inserción**: la semilla escribe por la misma tabla y con los mismos disparadores, de forma que RN1 también la vigila. RN2 se aplica en el servicio de alta, por lo que la historia queda exenta sin ningún caso especial.
