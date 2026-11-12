# Guía de validación: Panel de analítica

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Contrato**: [interfaz-panel.md](contracts/interfaz-panel.md)

Escenarios ejecutables que demuestran que el panel funciona de principio a fin. Las cifras esperadas no se repiten aquí: están en [Cifras de referencia](spec.md#cifras-de-referencia).

## Requisitos previos

- Node 26 o posterior, y las dependencias instaladas con `npm install` (solo `@playwright/test`, de la 001).
- Navegadores de Playwright instalados (`npx playwright install chromium`), para las pruebas de interfaz.
- Ningún servidor escuchando en el puerto 3000.

## 1. Suite completa

```sh
npm test
npm run test:e2e
```

**Resultado esperado**: las dos en verde. `npm test` incluye `tests/unit/trazabilidad-004.test.js`, que falla si alguna de RA1 a RA8, de los 22 escenarios o de los criterios, salvo `004/SC-006`, no tiene un test que empiece por su identificador (004/SC-008). El test de trazabilidad de la 001 sigue en verde sin cambios.

## 2. Demostración con las cifras de referencia

```sh
npm run semilla
CITACLARA_AHORA=2026-11-04T12:00 npm start
```

En PowerShell: `$env:CITACLARA_AHORA = '2026-11-04T12:00'; npm start`.

1. Abrir `http://localhost:3000`, entrar con la clave `eleva-demo` y elegir «Analítica» en el menú.
2. **Esperado**:
   - El aviso del reloj de demostración en la cabecera.
   - «Del 07/09/2026 al 01/11/2026», sin aviso de citas sin cerrar.
   - Los cuatro apartados con cada cifra de las cuatro tablas de referencia, y 15.380,00 € como total de ingresos por servicio y de las 8 semanas.
   - Ningún nombre ni teléfono de paciente en toda la página.

## 3. Aviso de citas sin cerrar (RA6)

```sh
npm run semilla
CITACLARA_AHORA=2026-11-11T12:00 npm start
```

**Esperado**: «Del 14/09/2026 al 08/11/2026» y el aviso «Hay 31 citas sin cerrar en este periodo…» con el enlace «Ir a la agenda». La semana del 02/11/2026 tiene 0 completadas, 0,00 € y «Sin datos» de no asistencia.

## 4. Otra fecha de demostración (FR-017, 004/SC-005)

```sh
npm run semilla -- --lunes 2027-01-04
CITACLARA_AHORA=2027-01-06T12:00 npm start
```

**Esperado**: «Del 09/11/2026 al 03/01/2027», y las mismas cifras que en el paso 2. Solo cambian las fechas.

## 5. Solo lectura (RA8, 004/SC-003)

Con el servidor del paso 2 parado, guardar un volcado de la base, abrir el panel varias veces y comparar:

```sh
node -e "const {DatabaseSync}=require('node:sqlite');const b=new DatabaseSync('datos/citaclara.db');for(const {name} of b.prepare(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").all())console.log(name,JSON.stringify(b.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()))" > antes.txt
```

Arrancar el servidor, entrar, abrir «Analítica» varias veces, parar el servidor y repetir el volcado en `despues.txt`.

**Esperado**: `antes.txt` y `despues.txt` solo difieren en la tabla `sesion`, por la sesión que abrió el acceso. El panel no cambia nada. La prueba automática de 004/SC-003 hace lo mismo con 100 aperturas, y la sesión abierta antes del primer volcado.

## 6. Acceso

Con el servidor del paso 2:

- `curl -i http://localhost:3000/analitica` → **303** a `/acceso`, sin cifras.
- `curl -i -X POST http://localhost:3000/analitica` → **401**, sin cifras.
- Con la cookie de una sesión de recepción, `POST /analitica` → **404**, y ningún dato cambia.

## 7. Interfaz a 360 píxeles (H5-E7, 004/SC-007)

```sh
npx playwright test tests/e2e/analitica.spec.js
```

**Esperado**: en verde a 360 píxeles y en portátil. Sin desplazamiento horizontal, texto con contraste de al menos 4,5:1, barras con al menos 3:1 y controles de al menos 44 × 44 píxeles.

## 8. Prueba con personas (004/SC-006)

No es automática. Su protocolo está en [checklists/entrega.md](checklists/entrega.md), que se rellena con las sesiones reales antes de integrar.
