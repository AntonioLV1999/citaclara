// Proceso hijo del test 003/FR-024: su propio servidor sobre el archivo compartido, para cancelar
// desde el correo por la ruta real, `POST /cancelar`, como lo haría el paciente.
import { abrirBd } from '../../src/datos/bd.js';
import { crearServidor } from '../../src/web/servidor.js';

const [ruta, momentoFijado] = process.argv.slice(2);
const bd = abrirBd(ruta);
const servidor = crearServidor({ bd, ahora: () => new Date(), momentoFijado });
await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
const base = `http://127.0.0.1:${servidor.address().port}`;

process.on('message', async ({ instante, token }) => {
  try {
    // Abrir el enlace no cambia nada (FR-015): se hace antes de la barrera, y solo compite la confirmación.
    const entrada = await fetch(`${base}/e/${token}`, { redirect: 'manual' });
    const cookie = entrada.headers.getSetCookie()[0]?.split(';')[0];
    while (Date.now() < instante);
    const r = await fetch(`${base}/cancelar`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: '',
    });
    const texto = await r.text();
    process.send({ estado: r.status, cancelada: texto.includes('<h1>Cita cancelada</h1>') });
  } catch (error) {
    process.send({ estado: 0, detalle: error.message });
  }
});

process.send({ listo: true });
