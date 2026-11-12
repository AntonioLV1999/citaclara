-- Fechas y horas: texto en hora local de la clínica, `AAAA-MM-DDTHH:MM`. Importes: céntimos enteros.
-- Versión 4 del esquema (`PRAGMA user_version`, que fija `abrirBd`). Un archivo de otra versión no
-- se migra: se borra y se regenera con la semilla. La 3 es la de la 002: enlace personal obligatorio,
-- sesiones de paciente con alcance y actividad, y enlaces de cancelación. La 4, la de la 003: recordatorios.
-- Las marcas de tiempo real (`ultima_actividad`) son milisegundos desde 1970, porque miden esperas.

CREATE TABLE IF NOT EXISTS clinica (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  clave_hash TEXT NOT NULL,
  clave_sal TEXT NOT NULL,
  zona_horaria TEXT NOT NULL CHECK (zona_horaria IN ('Europe/Madrid', 'Atlantic/Canary')),
  -- El que se da a los pacientes (FR-029). Admite nulo: hay clínicas de prueba sin teléfono.
  telefono TEXT
);

CREATE TABLE IF NOT EXISTS profesional (
  id INTEGER PRIMARY KEY,
  clinica_id INTEGER NOT NULL REFERENCES clinica (id),
  nombre TEXT NOT NULL,
  especialidad TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS servicio (
  id INTEGER PRIMARY KEY,
  clinica_id INTEGER NOT NULL REFERENCES clinica (id),
  nombre TEXT NOT NULL,
  especialidad TEXT NOT NULL,
  duracion_min INTEGER NOT NULL CHECK (typeof(duracion_min) = 'integer' AND duracion_min > 0 AND duracion_min % 15 = 0),
  precio_centimos INTEGER NOT NULL CHECK (typeof(precio_centimos) = 'integer' AND precio_centimos >= 0)
);

CREATE TABLE IF NOT EXISTS paciente (
  id INTEGER PRIMARY KEY,
  clinica_id INTEGER NOT NULL REFERENCES clinica (id),
  nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
  telefono TEXT NOT NULL,
  email TEXT,
  -- Enlace personal vigente: solo el token, 32 caracteres hexadecimales en minúscula (002/FR-025).
  -- Toda ficha nace con uno del generador único (002/FR-001); la semilla trae los de demostración (FR-029).
  enlace TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))
    CHECK (length(enlace) = 32 AND enlace NOT GLOB '*[^0-9a-f]*')
);

CREATE UNIQUE INDEX IF NOT EXISTS paciente_enlace ON paciente (enlace);

CREATE TABLE IF NOT EXISTS cita (
  id INTEGER PRIMARY KEY,
  clinica_id INTEGER NOT NULL REFERENCES clinica (id),
  profesional_id INTEGER NOT NULL REFERENCES profesional (id),
  servicio_id INTEGER NOT NULL REFERENCES servicio (id),
  paciente_id INTEGER NOT NULL REFERENCES paciente (id),
  inicio TEXT NOT NULL CHECK (
    inicio GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]'
    AND substr(inicio, 15, 2) IN ('00', '15', '30', '45')
  ),
  fin TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'reservada' CHECK (estado IN ('reservada', 'completada', 'cancelada', 'no_asistida')),
  origen_cancelacion TEXT CHECK (origen_cancelacion IN ('recepcion', 'portal', 'correo')),
  momento_cancelacion TEXT,
  -- FR-036, SC-011: origen y momento, los dos si la cita está cancelada, y ninguno si no lo está.
  CHECK (
    (estado = 'cancelada' AND origen_cancelacion IS NOT NULL AND momento_cancelacion IS NOT NULL)
    OR (estado <> 'cancelada' AND origen_cancelacion IS NULL AND momento_cancelacion IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS cita_profesional_inicio ON cita (profesional_id, inicio);

CREATE TABLE IF NOT EXISTS sesion (
  token_hash TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL REFERENCES clinica (id)
);

-- FR-037: las sesiones de paciente viven aparte. La 001 no las crea ni las lee: son de la 002.
CREATE TABLE IF NOT EXISTS sesion_paciente (
  token_hash TEXT PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES paciente (id),
  -- RP6: nulo es una sesión de toda la ficha; con valor, solo de esa cita (enlace de cancelación).
  cita_id INTEGER REFERENCES cita (id),
  -- 002/FR-004: milisegundos de tiempo real de la última petición. Caduca a los 30 minutos.
  ultima_actividad INTEGER NOT NULL
);

-- RP6: credencial de una sola cita. El token en claro solo va en el correo de la 003.
CREATE TABLE IF NOT EXISTS enlace_cancelacion (
  token_hash TEXT PRIMARY KEY NOT NULL,
  cita_id INTEGER NOT NULL REFERENCES cita (id)
);

-- RP7: la anulación en cascada borra por cita.
CREATE INDEX IF NOT EXISTS enlace_cancelacion_cita ON enlace_cancelacion (cita_id);

-- RR1, 003/FR-020: una cita tiene como máximo un recordatorio, y lo garantiza la clave primaria.
-- `enviado_en` es el «ahora» local de la ejecución y `direccion`, el correo de la ficha al enviar (RR2).
CREATE TABLE IF NOT EXISTS recordatorio (
  cita_id INTEGER PRIMARY KEY REFERENCES cita (id),
  enviado_en TEXT NOT NULL,
  direccion TEXT NOT NULL,
  modo TEXT NOT NULL CHECK (modo IN ('simulado', 'real'))
);

-- RP1: una sesión de alcance de cita solo se abre con una cita de su misma ficha.
CREATE TRIGGER IF NOT EXISTS sesion_paciente_cita BEFORE INSERT ON sesion_paciente
WHEN NEW.cita_id IS NOT NULL
  AND (SELECT paciente_id FROM cita WHERE id = NEW.cita_id) IS NOT NEW.paciente_id
BEGIN
  SELECT RAISE(ABORT, 'SESION_CITA');
END;

-- Misma clínica: los cuatro registros de una cita pertenecen a la misma clínica.
CREATE TRIGGER IF NOT EXISTS cita_misma_clinica BEFORE INSERT ON cita
WHEN (SELECT clinica_id FROM profesional WHERE id = NEW.profesional_id) IS NOT NEW.clinica_id
  OR (SELECT clinica_id FROM servicio WHERE id = NEW.servicio_id) IS NOT NEW.clinica_id
  OR (SELECT clinica_id FROM paciente WHERE id = NEW.paciente_id) IS NOT NEW.clinica_id
BEGIN
  SELECT RAISE(ABORT, 'CLINICA');
END;

-- RN7: un profesional solo atiende servicios de su especialidad.
CREATE TRIGGER IF NOT EXISTS cita_especialidad BEFORE INSERT ON cita
WHEN (SELECT especialidad FROM profesional WHERE id = NEW.profesional_id)
  IS NOT (SELECT especialidad FROM servicio WHERE id = NEW.servicio_id)
BEGIN
  SELECT RAISE(ABORT, 'ESPECIALIDAD');
END;

-- RN3: el fin es el inicio más la duración. `IS NOT` hace que un inicio imposible también aborte.
CREATE TRIGGER IF NOT EXISTS cita_fin BEFORE INSERT ON cita
WHEN NEW.fin IS NOT strftime(
  '%Y-%m-%dT%H:%M',
  NEW.inicio,
  '+' || (SELECT duracion_min FROM servicio WHERE id = NEW.servicio_id) || ' minutes'
)
BEGIN
  SELECT RAISE(ABORT, 'FIN');
END;

-- RN1 (capital): dos citas se solapan si cada una empieza antes de que acabe la otra.
-- Basta con vigilar INSERT: UPDATE solo cambia `estado` desde `reservada`, y eso nunca añade ocupación.
CREATE TRIGGER IF NOT EXISTS cita_solape BEFORE INSERT ON cita
WHEN NEW.estado IN ('reservada', 'completada')
BEGIN
  SELECT RAISE(ABORT, 'SOLAPE')
  WHERE EXISTS (
    SELECT 1 FROM cita
    WHERE profesional_id = NEW.profesional_id
      AND estado IN ('reservada', 'completada')
      AND inicio < NEW.fin
      AND NEW.inicio < fin
  );
END;

-- RN4: nada cambia en una cita salvo su estado, y solo se sale de reservada hacia un estado de llegada.
-- Un solo disparador, porque el orden entre disparadores no está garantizado.
CREATE TRIGGER IF NOT EXISTS cita_rn4 BEFORE UPDATE ON cita
BEGIN
  SELECT RAISE(ABORT, 'INMUTABLE')
  WHERE NEW.id IS NOT OLD.id
    OR NEW.clinica_id IS NOT OLD.clinica_id
    OR NEW.profesional_id IS NOT OLD.profesional_id
    OR NEW.servicio_id IS NOT OLD.servicio_id
    OR NEW.paciente_id IS NOT OLD.paciente_id
    OR NEW.inicio IS NOT OLD.inicio
    OR NEW.fin IS NOT OLD.fin;
  SELECT RAISE(ABORT, 'ESTADO')
  WHERE OLD.estado <> 'reservada' OR NEW.estado NOT IN ('completada', 'cancelada', 'no_asistida');
END;
