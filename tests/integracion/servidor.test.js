import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { crearEscenario, detener, escuchar, peticion, relojFijo, sesionDePrueba } from '../ayudas/escenario.js';
import { crearServidor } from '../../src/web/servidor.js';
import { html, layout, pagina, seguro } from '../../src/web/plantilla.js';

let e;
let servidor;
let cookie;
let efectos = 0;

const rutasExtra = [
  { metodo: 'GET', patron: '/prueba/protegida', manejador: () => pagina('<p>dentro</p>') },
  { metodo: 'POST', patron: '/prueba/protegida', manejador: () => { efectos += 1; return pagina('<p>hecho</p>'); } },
  { metodo: 'GET', patron: '/prueba/fallo', manejador: () => { throw new Error('SQLITE_ERROR: detalle interno en C:\\secreto.js'); } },
];

before(async () => {
  e = crearEscenario();
  servidor = await escuchar(crearServidor({ bd: e.bd, ahora: relojFijo('2026-11-09T12:00:00+01:00'), rutasExtra }));
  cookie = sesionDePrueba(e.bd, e.a.id);
});
after(async () => {
  await detener(servidor);
  e.cerrar();
});

/** `fetch` normaliza las rutas; aquí se necesita enviar la ruta tal cual. */
function peticionCruda(ruta) {
  return new Promise((resolver, rechazar) => {
    const { port } = servidor.address();
    const peticionHttp = request({ host: '127.0.0.1', port, path: ruta, headers: { cookie } }, (respuesta) => {
      let texto = '';
      respuesta.setEncoding('utf8');
      respuesta.on('data', (trozo) => { texto += trozo; });
      respuesta.on('end', () => resolver({ estado: respuesta.statusCode, texto }));
    });
    peticionHttp.on('error', rechazar);
    peticionHttp.end();
  });
}

test('FR-001 un GET protegido sin sesión redirige a /acceso', async () => {
  const r = await peticion(servidor, { ruta: '/prueba/protegida' });
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, '/acceso');
  assert.doesNotMatch(r.texto, /dentro/);
});

test('FR-001 un POST protegido sin sesión da 401 y no tiene efecto', async () => {
  const r = await peticion(servidor, { metodo: 'POST', ruta: '/prueba/protegida', formulario: { a: '1' } });
  assert.equal(r.estado, 401);
  assert.equal(efectos, 0);
});

test('FR-001 una cookie inventada no abre sesión', async () => {
  const r = await peticion(servidor, { ruta: '/prueba/protegida', cookie: 'sesion=inventada' });
  assert.equal(r.estado, 303);
});

test('FR-001 una ruta que no existe tampoco responde sin sesión', async () => {
  const r = await peticion(servidor, { ruta: '/no-existe' });
  assert.equal(r.estado, 303);
  assert.equal(r.ubicacion, '/acceso');
});

test('FR-001 con sesión la ruta protegida responde', async () => {
  const r = await peticion(servidor, { ruta: '/prueba/protegida', cookie });
  assert.equal(r.estado, 200);
  assert.match(r.texto, /dentro/);
});

test('FR-027 con sesión una ruta que no existe da 404 en español', async () => {
  const r = await peticion(servidor, { ruta: '/no-existe', cookie });
  assert.equal(r.estado, 404);
  assert.match(r.texto, /No encontramos/);
});

test('FR-001 los estáticos no exigen sesión', async () => {
  const r = await peticion(servidor, { ruta: '/estaticos/estilos.css' });
  assert.equal(r.estado, 200);
  assert.match(r.tipo, /text\/css/);
});

for (const ruta of [
  '/estaticos/../servidor.js',
  '/estaticos/../../principal.js',
  '/estaticos/..%2fservidor.js',
  '/estaticos/%2e%2e/servidor.js',
  '/estaticos/..%5cservidor.js',
  '/estaticos/..\\servidor.js',
  '/estaticos/%zz',
  '/estaticos/no-existe.css',
  '/estaticos/',
]) {
  test(`FR-001 se rechaza una ruta de estáticos fuera de su carpeta: ${ruta}`, async () => {
    const r = await peticionCruda(ruta);
    assert.equal(r.estado, 404);
    assert.doesNotMatch(r.texto, /crearServidor|import /);
  });
}

test('FR-027 un fallo interno da una página 500 en español sin detalles internos', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const r = await peticion(servidor, { ruta: '/prueba/fallo', cookie });
    assert.equal(r.estado, 500);
    assert.match(r.texto, /lang="es-ES"/);
    assert.match(r.texto, /Algo ha fallado/);
    assert.doesNotMatch(r.texto, /SQLITE|secreto|Error:|\.js/);
  } finally {
    console.error = original;
  }
});

test('FR-027 un formulario demasiado grande recibe una página en español y no llega a la ruta', async () => {
  const antes = efectos;
  const r = await peticion(servidor, {
    metodo: 'POST', ruta: '/prueba/protegida', cookie, formulario: { texto: 'x'.repeat(20_000_000) },
  });
  assert.equal(r.estado, 413);
  assert.match(r.texto, /demasiado texto/);
  assert.equal(efectos, antes);
});

test('FR-027 la plantilla escapa los datos', () => {
  const nombre = `<script>alert('x')</script> & "y"`;
  assert.equal(
    String(html`<p>${nombre}</p>`),
    '<p>&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;y&quot;</p>',
  );
});

test('FR-027 la plantilla no escapa dos veces el contenido ya generado', () => {
  const interior = html`<b>${'<i>'}</b>`;
  assert.equal(String(html`<p>${interior}</p>`), '<p><b>&lt;i&gt;</b></p>');
  assert.equal(String(html`<ul>${['<a>', '<b>'].map((x) => html`<li>${x}</li>`)}</ul>`),
    '<ul><li>&lt;a&gt;</li><li>&lt;b&gt;</li></ul>');
  assert.equal(String(html`<p>${seguro('<br>')}</p>`), '<p><br></p>');
});

test('FR-027 la plantilla trata los valores vacíos como texto vacío', () => {
  assert.equal(String(html`<p>${null}${undefined}${false}</p>`), '<p></p>');
  assert.equal(String(html`<p>${0}</p>`), '<p>0</p>');
});

test('FR-003 el layout común está en español y ofrece salir', () => {
  const texto = String(layout({ titulo: 'Agenda', clinica: { nombre: 'Clínica <Norte>' }, contenido: html`<p>x</p>` }));
  assert.match(texto, /<html lang="es-ES">/);
  assert.match(texto, /Clínica &lt;Norte&gt;/);
  assert.match(texto, /action="\/salir"/);
  assert.match(texto, />Salir</);
});

test('FR-001 el layout sin clínica no ofrece salir', () => {
  assert.doesNotMatch(String(layout({ titulo: 'Acceso', contenido: html`<p>x</p>` })), /Salir/);
});
