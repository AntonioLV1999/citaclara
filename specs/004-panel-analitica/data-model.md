# Modelo de datos: Panel de analítica

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Almacén

**Sin cambios.** Esta feature no añade tablas, columnas, índices, disparadores ni datos, y no cambia la versión del esquema (2) ni la semilla (FR-018, RA8). Lee estas tablas de la 001 ([data-model.md de la 001](../001-nucleo-agenda/data-model.md)), siempre filtradas por la clínica de la sesión (FR-002):

| Tabla | Columnas que lee | Para qué |
|-------|------------------|----------|
| `clinica` | `id`, `nombre`, `zona_horaria` | La de la sesión: fecha local de «hoy» (FR-016) |
| `profesional` | `id`, `nombre` | Filas de no asistencia y de ocupación, en orden de `id` |
| `servicio` | `id`, `nombre`, `duracion_min`, `precio_centimos` | Filas de ingresos, en orden de `id`; tiempo (RA4) e importe (RA5) de cada cita |
| `cita` | `profesional_id`, `servicio_id`, `estado`, `inicio` | Las del periodo: `clinica_id = ?`, `inicio >= ?` e `inicio < ?` |

**No lee**: `paciente`, `sesion_paciente` ni las columnas `paciente_id`, `fin`, `origen_cancelacion` y `momento_cancelacion` de `cita` (FR-012; nota S-03 de la spec: ninguna cifra depende del origen de la cancelación). La tabla `sesion` solo la lee el servidor para identificar la clínica, como en el resto de rutas.

Las tres lecturas van dentro de una sola transacción de lectura ([research.md §2](research.md#2-un-único-instante-de-los-datos-fr-015-sc-002)).

## Estructuras derivadas

Se calculan en cada apertura con una función pura de `src/dominio/analitica.js` y no se guardan en ningún sitio (RA8). Los recuentos y minutos son enteros; los importes, céntimos enteros. Los porcentajes no se guardan redondeados: cada uno se guarda como su par `{ numerador, denominador }` y solo se redondea al mostrarlo (RA7).

### Entrada

```text
EntradaPanel
├── hoy: 'AAAA-MM-DD'            fecha local de la clínica (ahoraLocal, FR-016 y FR-043)
├── ahora: 'AAAA-MM-DDTHH:MM'    para decidir las citas sin cerrar (FR-040 de la 001)
├── profesionales: [{ id, nombre }]
├── servicios: [{ id, nombre, duracion_min, precio_centimos }]
└── citas: [{ profesional_id, servicio_id, estado, inicio }]   solo las del periodo
```

### Periodo (RA1, RA2)

```text
Periodo
├── inicio: 'AAAA-MM-DD'   lunes, 8 semanas antes del lunes de la semana en curso
├── fin: 'AAAA-MM-DD'      domingo anterior al lunes de la semana en curso
└── semanas: [8 × { inicio: lunes, fin: domingo }]   en orden cronológico
```

- La semana en curso nunca está en `semanas`.
- Una cita pertenece a la semana `floor(días(inicio.fecha − periodo.inicio) / 7)`.
- Con el reloj en el 04/11/2026: del 07/09/2026 al 01/11/2026.

### Clasificación de cada cita

| Estado | Condición | Cuenta como |
|--------|-----------|-------------|
| `completada` | — | Completada: suma en la tasa, en la ocupación (minutos de su servicio) y en los ingresos (precio de su servicio) |
| `no_asistida` | — | No asistida: solo en la tasa |
| `cancelada` | Cualquier origen | Cancelada: se muestra su recuento, pero no entra en la tasa (RA3), en la ocupación ni en los ingresos |
| `reservada` | `sinCerrar(cita, ahora)` | Sin cerrar: no entra en ninguna cifra; solo en el aviso (RA6) |
| `reservada` | No sin cerrar | No puede darse dentro del periodo, que acaba antes de la semana en curso. Si se diera, tampoco contaría en nada |

### Salida

```text
Panel
├── periodo: Periodo
├── sinCerrar: entero                                  RA6; 0 si no hay aviso
├── capacidadSemanal: minutos                          por profesional (RA4), 3.300 con FR-012
├── ingresos (RA5)
│   ├── servicios: [{ servicio, completadas, centimos }]   todos los de la clínica, con 0 si no tienen (H1-E4)
│   └── total: centimos                                    = suma de servicios = suma de semanas (FR-013)
├── noAsistencia (RA3)
│   ├── profesionales: [{ profesional, completadas, noAsistidas, canceladas, tasa }]
│   └── clinica: { completadas, noAsistidas, canceladas, tasa }   con los recuentos totales (H2-E2)
├── ocupacion (RA4)
│   ├── profesionales: [{ profesional, semanas: [8 × { minutos, ocupacion }],
│   │                     periodo: { capacidad, minutos, ocupacion } }]
│   └── clinica: { capacidad, minutos, ocupacion }    capacidad = semanal × 8 × nº de profesionales
└── evolucion: [8 × { semana, completadas, noAsistidas, canceladas, tasa, ocupacion, centimos }]
                                                      de la clínica en conjunto (FR-009)
```

donde

- `tasa = { numerador: noAsistidas, denominador: completadas + noAsistidas }` (RA3).
- `ocupacion = { numerador: minutos completados, denominador: capacidad }` (RA4).
- Un denominador 0 se muestra «Sin datos» (RA7).

### Invariantes

Las comprueba la función de dominio en cada apertura; si alguna falla, lanza un error en lugar de mostrar cifras que no cuadran (principio II):

1. `ingresos.total` = Σ `ingresos.servicios[].centimos` = Σ `evolucion[].centimos` (FR-013).
2. Σ por profesional de completadas, no asistidas y canceladas = las de `noAsistencia.clinica` = Σ de `evolucion[]`.
3. Σ `ocupacion.profesionales[].periodo.minutos` = `ocupacion.clinica.minutos` = Σ `evolucion[]` de minutos.

## Valores con la semilla por defecto

Con el reloj en el 04/11/2026 a las 12:00, la salida es la de [Cifras de referencia](spec.md#cifras-de-referencia), con `sinCerrar = 0` y `capacidadSemanal = 3.300`. Con el reloj en el 11/11/2026 a las 12:00, `sinCerrar = 31`, y la octava semana (del 02/11/2026) tiene 0 completadas, 0,00 € y «Sin datos» de no asistencia.
