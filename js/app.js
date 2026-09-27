let noticias = [];
let filtroActual = 'todas';
let busqueda = '';
let slideActual = 0;
let intervaloCarrusel = null;
let audioActual = null;

fetch('data/noticias.json?v=' + Date.now())
  .then(res => res.json())
  .then(data => {
    noticias = data.noticias || [];
    renderCarrusel();
    renderCalientes();
    renderNoticias();
    renderPodcast();
    iniciarCarrusel();
    iniciarMetricas();
  })
  .catch(err => console.error('Error:', err));

// --- CARRUSEL ---
function renderCarrusel() {
  const destacadas = noticias.filter(n => n.destacada).slice(0, 5);
  const cont = document.getElementById('carrusel');
  cont.innerHTML = '';
  if (!destacadas.length) return;

  destacadas.forEach((n, i) => {
    const div = document.createElement('div');
    div.className = 'slide' + (i === 0 ? ' activo' : '');
    const imgHtml = n.imagen_url ? `<div class="img-fondo" style="background-image:url('${n.imagen_url}')"></div>` : '';
    div.innerHTML = `
      ${imgHtml}
      <div class="contenido">
        <span class="cat">${n.categoria} · ${n.fuente}</span>
        <h3>${n.titulo}</h3>
        <p>${n.resumen}</p>
      </div>
    `;
    div.onclick = () => window.open(n.enlace_original, '_blank');
    cont.appendChild(div);
  });

  const puntos = document.createElement('div');
  puntos.className = 'puntos';
  destacadas.forEach((_, i) => {
    const p = document.createElement('div');
    p.className = 'punto' + (i === 0 ? ' activo' : '');
    p.onclick = (e) => { e.stopPropagation(); irSlide(i); };
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
  const calientes = [...noticias].slice(0, 6);
  cont.innerHTML = '';
  calientes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'caliente-card';
    div.innerHTML = `
      <span class="cat">🔥 ${n.categoria}</span>
      <h4>${n.titulo}</h4>
      <small>${n.fuente}</small>
    `;
    div.onclick = () => window.open(n.enlace_original, '_blank');
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
    const imgHtml = n.imagen_url ? `<img class="img" src="${n.imagen_url}" loading="lazy" onerror="this.style.display='none'">` : '';
    art.innerHTML = `
      ${imgHtml}
      <div class="cuerpo">
        <span class="categoria">${n.categoria}</span>
        <h2><a href="${n.enlace_original}" target="_blank" rel="noopener">${n.titulo}</a></h2>
        <p>${n.resumen}</p>
        <small>${n.fuente} · ${n.fuente_tipo}</small>
        <br>
        <button class="btn-audio">🎧 Escuchar</button>
      </div>
    `;
    art.querySelector('.btn-audio').onclick = (e) => {
      e.stopPropagation();
      reproducir(n);
    };
    cont.appendChild(art);
  });
}

// --- PODCAST ---
function renderPodcast() {
  const cont = document.getElementById('podcast');
  cont.innerHTML = '';
  noticias.slice(0, 6).forEach(n => {
    const div = document.createElement('div');
    div.className = 'podcast-item';
    div.innerHTML = `
      <span>${n.titulo}</span>
      <button>▶</button>
    `;
    div.querySelector('button').onclick = () => reproducir(n);
    cont.appendChild(div);
  });
}

// --- REPRODUCTOR ---
function reproducir(n) {
  const rep = document.getElementById('reproductor');
  document.getElementById('rep-titulo').textContent = n.titulo;
  rep.classList.remove('oculto');

  if (audioActual) {
    audioActual.pause();
    audioActual = null;
  }

  if (n.audio_url) {
    audioActual = new Audio(n.audio_url);
    audioActual.play().catch(e => console.log('Audio error:', e));
  } else {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(n.titulo + '. ' + n.resumen);
      const voces = window.speechSynthesis.getVoices();
      const vozEs = voces.find(v => v.lang.startsWith('es'));
 if (vozEs) u.voice = vozEs;
      u.lang = 'es-ES';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
      audioActual = { pause: () => window.speechSynthesis.cancel() };
    }
  }
}

document.getElementById('rep-cerrar').onclick = () => {
  if (audioActual) { audioActual.pause(); audioActual = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  document.getElementById('reproductor').classList.add('oculto');
};

document.getElementById('rep-play').onclick = () => {
  if ('speechSynthesis' in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
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
  const oscuro = document.body.classList.contains('oscuro');
  btn.textContent = oscuro ? '☀️' : '🌙';
  localStorage.setItem('tema', oscuro ? 'oscuro' : 'claro');
};

if (localStorage.getItem('tema') === 'oscuro') {
  document.body.classList.add('oscuro');
  document.getElementById('btn-tema').textContent = '☀️';
}

// --- MÉTRICAS (localStorage) ---
function iniciarMetricas() {
  const vistas = JSON.parse(localStorage.getItem('vistas') || '{}');
  const hora = new Date().getHours();
  vistas[hora] = (vistas[hora] || 0) + 1;
  localStorage.setItem('vistas', JSON.stringify(vistas));
}
