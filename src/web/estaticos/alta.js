// Mejoras del formulario de alta. Sin este script el formulario funciona igual, con la lista de
// pacientes completa y el resumen que trae la página. No lee el reloj del dispositivo.

const selectorProfesional = document.getElementById('elegir-profesional');
const verServicios = document.getElementById('ver-servicios');
const servicio = document.getElementById('servicio');
const horaInicio = document.getElementById('hora');
const paciente = document.getElementById('paciente');
const pacienteNuevo = document.getElementById('paciente-nuevo');
const zonaBusqueda = document.getElementById('zona-busqueda');
const buscador = document.getElementById('buscar-paciente');
const resultados = document.getElementById('resultados-paciente');

function horaDeFin(hora, duracion) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + duracion;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function actualizarResumen() {
  const opcion = servicio.selectedOptions[0];
  if (!opcion) return;
  const duracion = Number(opcion.dataset.duracion);
  document.getElementById('resumen-duracion').textContent = `${duracion} min`;
  document.getElementById('resumen-precio').textContent = opcion.dataset.precio;
  document.getElementById('resumen-fin').textContent = horaDeFin(horaInicio.value, duracion);
}

function actualizarPacienteNuevo() {
  pacienteNuevo.hidden = paciente.value !== '';
}

let ultimaBusqueda = 0;

async function buscar() {
  const numero = ++ultimaBusqueda;
  const respuesta = await fetch(`/pacientes/buscar?q=${encodeURIComponent(buscador.value)}`);
  const fragmento = await respuesta.text();
  if (numero === ultimaBusqueda) resultados.innerHTML = fragmento;
}

function elegirPaciente(evento) {
  const boton = evento.target.closest('[data-paciente]');
  if (!boton) return;
  paciente.value = boton.dataset.paciente;
  resultados.textContent = '';
  buscador.value = '';
  actualizarPacienteNuevo();
}

selectorProfesional.addEventListener('change', () => selectorProfesional.form.requestSubmit(verServicios));
verServicios.hidden = true;
servicio.addEventListener('change', actualizarResumen);
horaInicio.addEventListener('change', actualizarResumen);
paciente.addEventListener('change', actualizarPacienteNuevo);
buscador.addEventListener('input', buscar);
resultados.addEventListener('click', elegirPaciente);

zonaBusqueda.hidden = false;
actualizarPacienteNuevo();
actualizarResumen();
