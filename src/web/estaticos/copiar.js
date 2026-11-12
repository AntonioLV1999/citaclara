// 002/FR-002: copiar el enlace del paciente. Sin este script, el campo se selecciona y se copia a mano.
// El navegador solo deja usar el portapapeles en https o en localhost: si no, se selecciona el texto.

const boton = document.getElementById('copiar-enlace');
const campo = document.getElementById(boton.dataset.campo);
const aviso = document.getElementById('aviso-copiar');

function seleccionar() {
  campo.focus();
  campo.select();
  aviso.textContent = 'Pulsa Ctrl+C para copiarlo.';
}

boton.hidden = false;
boton.addEventListener('click', async () => {
  if (!navigator.clipboard?.writeText) return seleccionar();
  try {
    await navigator.clipboard.writeText(campo.value);
    aviso.textContent = 'Enlace copiado.';
  } catch {
    seleccionar();
  }
});
