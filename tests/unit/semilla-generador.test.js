import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generar } from '../../src/semilla/generador.js';
import { resumen } from '../../src/semilla/carga.js';
import { crearAzar } from '../../src/semilla/azar.js';
import { LUNES_POR_DEFECTO, SEMILLA } from '../../src/semilla/datos-base.js';
import { calcularHuecos } from '../../src/dominio/huecos.js';
import { accionesPermitidas } from '../../src/dominio/estados.js';
import { validarPaciente } from '../../src/dominio/reglas.js';
import { diaDeSemana, esDiaLaborable, sumarDias, sumarMinutos } from '../../src/dominio/tiempo.js';

let datos;
let historia;
let futuras;

before(() => {
  datos = generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO });
  historia = datos.citas.filter((c) => c.semana < 0);
  futuras = datos.citas.filter((c) => c.semana >= 0);
});

const contar = (estado) => historia.filter((c) => c.estado === estado).length;
const porcentaje = (estado) => (contar(estado) / historia.length) * 100;

function agrupar(citas, clave) {
  const grupos = new Map();
  for (const cita of citas) {
    const k = clave(cita);
    grupos.set(k, [...(grupos.get(k) ?? []), cita]);
  }
  return grupos;
}

const ocupan = (citas) => citas.filter((c) => c.estado === 'reservada' || c.estado === 'completada');

function contarSolapes(citas) {
  let solapes = 0;
  for (const delProfesional of agrupar(citas, (c) => c.profesional).values()) {
    const ordenadas = [...delProfesional].sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 1; i < ordenadas.length; i += 1) {
      if (ordenadas[i].inicio < ordenadas[i - 1].fin) solapes += 1;
    }
  }
  return solapes;
}

test('FR-029 hay una clínica en la península', () => {
  assert.equal(datos.clinica.nombre, 'Clínica Eleva');
  assert.equal(datos.clinica.zona_horaria, 'Europe/Madrid');
});

test('FR-029 hay 3 profesionales: María y Jorge en fisioterapia, Lucía en nutrición', () => {
  assert.deepEqual(datos.profesionales, [
    { nombre: 'María', especialidad: 'Fisioterapia' },
    { nombre: 'Jorge', especialidad: 'Fisioterapia' },
    { nombre: 'Lucía', especialidad: 'Nutrición' },
  ]);
});

test('FR-029 hay 40 pacientes distintos', () => {
  assert.equal(datos.pacientes.length, 40);
  assert.equal(new Set(datos.pacientes.map((p) => p.nombre)).size, 40);
});

test('FR-029 hay 4 servicios con sus duraciones y precios exactos', () => {
  const resumenServicios = datos.servicios.map((s) => [s.nombre, s.especialidad, s.duracion_min, s.precio_centimos]);
  assert.deepEqual(resumenServicios, [
    ['Sesión de fisioterapia', 'Fisioterapia', 45, 4000],
    ['Primera visita de fisioterapia', 'Fisioterapia', 60, 5000],
    ['Consulta de nutrición', 'Nutrición', 30, 3500],
    ['Primera consulta de nutrición', 'Nutrición', 45, 4500],
  ]);
});

test('FR-030 la historia ocupa las 8 semanas anteriores, de lunes a viernes', () => {
  assert.equal(historia.map((c) => c.inicio).sort()[0].slice(0, 10), '2026-09-07');
  assert.ok(historia.map((c) => c.inicio).sort().at(-1).slice(0, 10) <= '2026-10-30');
  assert.deepEqual([...new Set(historia.map((c) => c.semana))].sort((a, b) => a - b), [-8, -7, -6, -5, -4, -3, -2, -1]);
  assert.ok(historia.every((c) => esDiaLaborable(c.inicio)));
});

test('FR-030 la historia solo tiene estados definitivos', () => {
  assert.deepEqual([...new Set(historia.map((c) => c.estado))].sort(), ['cancelada', 'completada', 'no_asistida']);
});

test('FR-030 entre 3 y 5 citas por profesional y día en la historia', () => {
  const grupos = agrupar(historia, (c) => `${c.profesional}|${c.inicio.slice(0, 10)}`);
  assert.equal(grupos.size, 3 * 8 * 5);
  for (const citas of grupos.values()) assert.ok(citas.length >= 3 && citas.length <= 5);
});

test('H5-E3 FR-030 SC-006 los porcentajes están dentro de los márgenes', () => {
  assert.ok(porcentaje('no_asistida') >= 9 && porcentaje('no_asistida') <= 11, `${porcentaje('no_asistida')}`);
  assert.ok(porcentaje('cancelada') >= 7 && porcentaje('cancelada') <= 9, `${porcentaje('cancelada')}`);
});

test('FR-030 los recuentos son exactos sobre el total', () => {
  assert.equal(contar('no_asistida'), Math.round(0.10 * historia.length));
  assert.equal(contar('cancelada'), Math.round(0.08 * historia.length));
  assert.equal(contar('completada'), historia.length - contar('no_asistida') - contar('cancelada'));
});

test('FR-031 las 2 semanas futuras solo tienen citas reservadas', () => {
  assert.deepEqual([...new Set(futuras.map((c) => c.estado))], ['reservada']);
  assert.deepEqual([...new Set(futuras.map((c) => c.semana))].sort(), [0, 1]);
  assert.ok(futuras.every((c) => c.inicio >= '2026-11-02' && c.inicio < '2026-11-14'));
  assert.ok(futuras.every((c) => esDiaLaborable(c.inicio)));
});

test('FR-031 quedan huecos libres cada día laborable para cada profesional', () => {
  for (let i = 0; i < 14; i += 1) {
    const dia = sumarDias('2026-11-02', i);
    if (!esDiaLaborable(dia)) continue;
    datos.profesionales.forEach((_, profesional) => {
      const citas = futuras.filter((c) => c.profesional === profesional && c.inicio.startsWith(dia));
      assert.ok(citas.length >= 1, 'también debe haber reservas');
      const huecos = calcularHuecos({ dia, citas, ahora: '2026-01-01T00:00' });
      assert.ok(huecos.length > 0);
    });
  }
});

test('FR-031 las semanas futuras tienen menos citas que la historia', () => {
  const media = (citas, semanas) => citas.length / (semanas * 5 * 3);
  assert.ok(media(futuras, 2) < media(historia, 8));
});

test('H5-E2 SC-006 ninguna cita reservada o completada solapa otra', () => {
  assert.equal(contarSolapes(ocupan(datos.citas)), 0);
});

test('RN1 tampoco hay solapes aunque se cuenten todas las citas', () => {
  assert.equal(contarSolapes(datos.citas), 0);
});

test('RN3 el fin de cada cita es su inicio más la duración del servicio', () => {
  for (const cita of datos.citas) {
    assert.equal(cita.fin, sumarMinutos(cita.inicio, datos.servicios[cita.servicio].duracion_min));
  }
});

test('RN7 cada cita usa un servicio de la especialidad del profesional', () => {
  for (const cita of datos.citas) {
    assert.equal(datos.servicios[cita.servicio].especialidad, datos.profesionales[cita.profesional].especialidad);
  }
});

test('RN5 FR-033 las citas cerradas de la historia ya habían empezado antes del lunes', () => {
  for (const cita of historia) {
    assert.ok(cita.inicio < LUNES_POR_DEFECTO);
    assert.deepEqual(accionesPermitidas({ ...cita, estado: 'reservada' }, `${LUNES_POR_DEFECTO}T00:00`).length, 3);
  }
});

test('FR-011 FR-012 todas las citas caen en cuartos de hora y dentro del horario', () => {
  for (const { inicio, fin } of datos.citas) {
    assert.ok(['00', '15', '30', '45'].includes(inicio.slice(14, 16)));
    assert.ok(inicio.slice(11) >= '09:00');
    assert.ok(fin.slice(11) <= '20:00');
    assert.equal(inicio.slice(0, 10), fin.slice(0, 10));
  }
});

test('FR-033 un paciente no tiene más de una primera visita completada por especialidad', () => {
  const completadas = datos.citas.filter((c) => c.estado === 'completada' && datos.servicios[c.servicio].primera);
  const grupos = agrupar(completadas, (c) => `${c.paciente}|${datos.servicios[c.servicio].especialidad}`);
  for (const citas of grupos.values()) assert.equal(citas.length, 1);
});

test('FR-033 la primera cita en una especialidad es de primera visita, y solo se repite si no se completó', () => {
  const ordenadas = [...datos.citas].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const grupos = agrupar(ordenadas, (c) => `${c.paciente}|${datos.servicios[c.servicio].especialidad}`);
  for (const citas of grupos.values()) {
    let atendido = false;
    for (const cita of citas) {
      assert.equal(datos.servicios[cita.servicio].primera, !atendido);
      if (cita.estado === 'completada' || cita.estado === 'reservada') atendido = true;
    }
  }
});

test('FR-034 los nombres son españoles y los correos, solo de example.com', () => {
  for (const { nombre, email } of datos.pacientes) {
    assert.match(nombre, /^\p{Lu}\p{L}+ \p{Lu}\p{L}+( \p{Lu}\p{L}+)?$/u);
    if (email) assert.match(email, /^[a-z.]+@example\.com$/);
  }
  assert.ok(datos.pacientes.some((p) => p.email));
  assert.ok(datos.pacientes.some((p) => !p.email));
});

test('FR-034 los teléfonos están en un rango no asignado y son válidos para la ficha', () => {
  for (const paciente of datos.pacientes) {
    // Ningún número nacional español empieza por 0.
    assert.match(paciente.telefono, /^000 \d{3} \d{3}$/);
    assert.equal(validarPaciente(paciente), null);
  }
});

test('FR-002 la semilla no guarda la clave en claro', () => {
  assert.equal(JSON.stringify(datos).includes('eleva-demo'), false);
});

test('SC-005 FR-032 dos generaciones con los mismos parámetros son idénticas', () => {
  const otra = generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO });
  assert.deepEqual(otra, datos);
  assert.deepEqual(resumen(otra), resumen(datos));
});

test('SC-005 FR-032 otra semilla da otra historia', () => {
  assert.notEqual(resumen(generar({ semilla: SEMILLA + 1, lunes: LUNES_POR_DEFECTO })).sinFechas, resumen(datos).sinFechas);
});

test('FR-032 cambiar de lunes conserva el resumen sin fechas y cambia el de contenido', () => {
  const otra = resumen(generar({ semilla: SEMILLA, lunes: '2026-11-09' }));
  const base = resumen(datos);
  assert.equal(otra.sinFechas, base.sinFechas);
  assert.notEqual(otra.contenido, base.contenido);
});

test('FR-032 cambiar de lunes desplaza cada cita por semanas completas', () => {
  const otra = generar({ semilla: SEMILLA, lunes: '2027-03-29' });
  const semanas = 21;
  otra.citas.forEach((cita, i) => {
    assert.equal(cita.inicio.slice(11), datos.citas[i].inicio.slice(11));
    assert.equal(cita.inicio.slice(0, 10), sumarDias(datos.citas[i].inicio.slice(0, 10), semanas * 7));
    assert.equal(cita.paciente, datos.citas[i].paciente);
    assert.equal(cita.estado, datos.citas[i].estado);
  });
});

test('FR-032 el lunes por defecto es el 02/11/2026', () => {
  assert.equal(LUNES_POR_DEFECTO, '2026-11-02');
  assert.equal(diaDeSemana(LUNES_POR_DEFECTO), 1);
});

test('SC-005 la generación no usa el reloj ni Math.random', () => {
  const { Date: DateReal } = globalThis;
  const { random } = Math;
  const prohibido = () => { throw new Error('La semilla no puede leer el reloj ni usar Math.random'); };
  class DateVigilado extends DateReal {
    constructor(...argumentos) {
      if (argumentos.length === 0) prohibido();
      super(...argumentos);
    }

    static now = prohibido;
  }
  globalThis.Date = DateVigilado;
  Math.random = prohibido;
  try {
    assert.deepEqual(generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO }), datos);
  } finally {
    globalThis.Date = DateReal;
    Math.random = random;
  }
});

test('SC-005 el código del generador no menciona el reloj ni Math.random', () => {
  for (const archivo of ['generador.js', 'azar.js', 'datos-base.js', 'carga.js']) {
    const texto = readFileSync(new URL(`../../src/semilla/${archivo}`, import.meta.url), 'utf8');
    assert.doesNotMatch(texto, /Date\.now|new Date\(\)|Math\.random/, archivo);
  }
});

test('SC-005 mulberry32 da siempre la misma secuencia', () => {
  const a = crearAzar(42);
  const b = crearAzar(42);
  const secuencia = (azar) => Array.from({ length: 5 }, () => azar.entero(0, 1000));
  assert.deepEqual(secuencia(a), secuencia(b));
});

test('SC-005 barajar conserva los elementos y no altera la lista original', () => {
  const lista = [1, 2, 3, 4, 5, 6];
  const barajada = crearAzar(1).barajar(lista);
  assert.deepEqual(lista, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...barajada].sort(), lista);
});

test('SC-005 entero respeta sus límites y elegir devuelve un elemento', () => {
  const azar = crearAzar(7);
  for (let i = 0; i < 1000; i += 1) {
    const n = azar.entero(3, 5);
    assert.ok(n >= 3 && n <= 5 && Number.isInteger(n));
    assert.ok(['a', 'b'].includes(azar.elegir(['a', 'b'])));
  }
});
