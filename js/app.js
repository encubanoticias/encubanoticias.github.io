let noticias = [];
let filtroActual = 'todas';
let busqueda = '';
let slideActual = 0;
let intervaloCarrusel = null;

// Cargar noticias
fetch('data/noticias.json')
  .then(res => res.json())
  .then(data => {
    noticias = data.noticias;
    renderCarrusel();
    renderCalientes();
    renderNoticias();
    renderPodcast();
    iniciarCarrusel();
  })
  .catch(err => console.error('Error:', err));

// --- CARRUSEL ---
function renderCarrusel() {
  const destacadas = noticias.filter(n => n.destacada).slice(0, 5);
  const cont = document.getElementById('carrusel');
  cont.innerHTML = '';

  destacadas.forEach((n, i) => {
    const div = document.createElement('div');
    div.className = 'slide' + (i === 0 ? ' activo' : '');
    div.innerHTML = `
      <span class="cat">${n.categoria} · ${n.fuente}</span>
      <h3>${n.titulo}</h3>
      <p>${n.resumen}</p>
    `;
    cont.appendChild(div);
  });

  const puntos = document.createElement('div');
  puntos.className = 'puntos';
  destacadas.forEach((_, i) => {
    const p = document.createElement('div');
    p.className = 'punto' + (i === 0 ? ' activo' : '');
    p.onclick = () => irSlide(i);
    puntos.appendChild(p);
  });
  cont.appendChild(puntos);
}

function irSlide(i) {
  const slides = document.querySelectorAll('.slide');
  const puntos = document.querySelectorAll('.punto');
  if (!slides.length) return;
  slides[slideActual].classList.remove('activo');
  puntos[slideActual].classList.remove('activo');
  slideActual = i % slides.length;
  slides[slideActual].classList.add('activo');
  puntos[slideActual].classList.add('activo');
}

function iniciarCarrusel() {
  if (intervaloCarrusel) clearInterval(intervaloCarrusel);
  intervaloCarrusel = setInterval(() => irSlide(slideActual + 1), 6000);
}

// --- CALIENTES ---
function renderCalientes() {
  const cont = document.getElementById('calientes');
  const calientes = [...noticias]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
  cont.innerHTML = '';
  calientes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'caliente-card';
    div.innerHTML = `
      <span class="cat">🔥 ${n.categoria}</span>
      <h4>${n.titulo}</h4>
      <small>${n.fuente}</small>
    `;
    cont.appendChild(div);
  });
}

// --- NOTICIAS ---
function renderNoticias() {
  const cont = document.getElementById('noticias');
  let lista = noticias;

  if (filtroActual !== 'todas') {
    lista = lista.filter(n => n.fuente_tipo === filtroActual);
  }

  if (busqueda.trim()) {
    const q = busqueda.toLowerCase();
    lista = lista.filter(n =>
      n.titulo.toLowerCase().includes(q) ||
      n.resumen.toLowerCase().includes(q) ||
      n.categoria.toLowerCase().includes(q)
    );
  }

  cont.innerHTML = '';
  if (!lista.length) {
    cont.innerHTML = '<p style="color:var(--texto-suave)">No hay noticias para mostrar.</p>';
    return;
  }

  lista.forEach(n => {
    const art = document.createElement('article');
    art.className = 'noticia';
    art.dataset.tipo = n.fuente_tipo;
    art.innerHTML = `
      <span class="categoria">${n.categoria}</span>
      <h2>${n.titulo}</h2>
      <p>${n.resumen}</p>
      <small>${n.fuente} · ${n.fuente_tipo}</small>
      <br>
      <button class="btn-audio" onclick="reproducir('${n.titulo.replace(/'/g, "\\'")}')">🎧 Escuchar</button>
    `;
    cont.appendChild(art);
  });
}

// --- PODCAST ---
function renderPodcast() {
  const cont = document.getElementById('podcast');
  cont.innerHTML = '';
  noticias.slice(0, 5).forEach(n => {
    const div = document.createElement('div');
    div.className = 'podcast-item';
    div.innerHTML = `
      <span>${n.titulo}</span>
      <button onclick="reproducir('${n.titulo.replace(/'/g, "\\'")}')">▶</button>
    `;
    cont.appendChild(div);
  });
}

// --- REPRODUCTOR ---
function reproducir(titulo) {
  const rep = document.getElementById('reproductor');
  document.getElementById('rep-titulo').textContent = titulo;
  rep.classList.remove('oculto');
}

document.getElementById('rep-cerrar').onclick = () => {
  document.getElementById('reproductor').classList.add('oculto');
};

document.getElementById('rep-play').onclick = () => {
  alert('Aquí se reproducirá el audio de la noticia.');
};

// --- FILTROS ---
document.querySelectorAll('.chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.chip').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    filtroActual = btn.dataset.filtro;
    renderNoticias();
  };
});

// --- BÚSQUEDA ---
document.getElementById('buscador').oninput = (e) => {
  busqueda = e.target.value;
  renderNoticias();
};

// --- MODO OSCURO ---
document.getElementById('btn-tema').onclick = () => {
  document.body.classList.toggle('oscuro');
  const btn = document.getElementById('btn-tema');
  btn.textContent = document.body.classList.contains('oscuro') ? '☀️' : '🌙';
};
