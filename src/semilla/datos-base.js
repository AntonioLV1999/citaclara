// Cambiar cualquiera de estos valores es un cambio de datos sujeto al principio V:
// hay que actualizar las cifras citadas en la spec (FR-030).

export const SEMILLA = 20261102;
export const LUNES_POR_DEFECTO = '2026-11-02';

export const CLINICA = { nombre: 'Clínica Eleva', zona_horaria: 'Europe/Madrid' };

// Clave ficticia y pública. No debe usarse con datos reales.
export const CLAVE = 'eleva-demo';

export const PROFESIONALES = [
  { nombre: 'María', especialidad: 'Fisioterapia' },
  { nombre: 'Jorge', especialidad: 'Fisioterapia' },
  { nombre: 'Lucía', especialidad: 'Nutrición' },
];

export const SERVICIOS = [
  { nombre: 'Sesión de fisioterapia', especialidad: 'Fisioterapia', duracion_min: 45, precio_centimos: 4000, primera: false },
  { nombre: 'Primera visita de fisioterapia', especialidad: 'Fisioterapia', duracion_min: 60, precio_centimos: 5000, primera: true },
  { nombre: 'Consulta de nutrición', especialidad: 'Nutrición', duracion_min: 30, precio_centimos: 3500, primera: false },
  { nombre: 'Primera consulta de nutrición', especialidad: 'Nutrición', duracion_min: 45, precio_centimos: 4500, primera: true },
];

export const NUMERO_PACIENTES = 40;

export const NOMBRES = [
  'Ana', 'Antonio', 'Carmen', 'Carlos', 'Cristina', 'David', 'Elena', 'Fernando', 'Isabel', 'Javier',
  'Laura', 'Luis', 'Marta', 'Manuel', 'Nuria', 'Óscar', 'Paula', 'Pedro', 'Rocío', 'Sergio',
];

export const APELLIDOS = [
  'Álvarez', 'Blanco', 'Cano', 'Delgado', 'Domínguez', 'Fernández', 'Gallego', 'García', 'Gil', 'Gómez',
  'Herrera', 'Iglesias', 'Jiménez', 'León', 'López', 'Marín', 'Molina', 'Morales', 'Muñoz', 'Navarro',
  'Núñez', 'Ortega', 'Peña', 'Ramos', 'Rubio', 'Sáez', 'Santos', 'Serrano', 'Torres', 'Vega',
];
