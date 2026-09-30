let noticias = [];
let filtroActual = 'todas';
let busqueda = '';
let slideActual = 0;
let intervaloCarrusel = null;
let audioActual = null;
let maxCarrusel = 9;
let maxTemasPerspectivas = 2;

fetch('data/config.json?v=' + Date.now())
  .then(r => r.json())
  .then(c => {
    if (c.max_temas_perspectivas) maxTemasPerspectivas = c.max_temas_perspectivas;
    if (c.destacadas_carrusel) maxCarrusel = c.destacadas_carrusel;
  })
  .catch(() => {});

fetch('data/noticias.json?v=' + Date.now())
  .then(res => res.json())
  .then(data => {
    noticias = data.noticias || [];
    renderCarrusel();
    renderCalientes();
    renderPerspectivas();
    renderNoticias();
    renderPodcast();
    iniciarCarrusel();
    iniciarMetricas();
  })
  .catch(err => console.error('Error:', err));

// --- CARRUSEL ---

function renderCarrusel() {
  const cont = document.getElementById('carrusel');
  cont.innerHTML = '';

  const porTipo = { oficial: [], alternativa: [], internacional: [] };
  noticias.forEach(n => {
    if (porTipo[n.fuente_tipo]) porTipo[n.fuente_tipo].push(n);
  });

  // Intercalar: uno de cada tipo, en ronda
  const seleccion = [];
  const maxPorTipo = maxCarrusel;
  let i = 0;
  while (seleccion.length < maxCarrusel) {
    let agregoAlguno = false;
    for (const tipo of ['oficial', 'alternativa', 'internacional']) {
      if (porTipo[tipo][i]) {
        seleccion.push(porTipo[tipo][i]);
        agregoAlguno = true;
        if (seleccion.length >= maxCarrusel) break;
      }
    }
    if (!agregoAlguno) break;
    i++;
  }

  // Si aún falta, rellenar con las que sobren
  if (seleccion.length < maxCarrusel) {
    const idsEnSeleccion = new Set(seleccion.map(n => n.id));
    for (const n of noticias) {
      if (seleccion.length >= maxCarrusel) break;
      if (!idsEnSeleccion.has(n.id)) seleccion.push(n);
    }
  }

  const destacadas = seleccion;

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
  intervaloCarrusel = setInterval(() => irSlide(slideActual + 1), 10000);
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

// Mezclar fuentes para que no salgan agrupadas
lista = lista.sort((a, b) => {
  if (a.fuente === b.fuente) return 0;
   return 0.5 - Math.random();
});
  
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
          <div class="votacion" data-id="${n.id}">
         <button class="voto-btn" data-voto="confirmada">✅ Confirmada</button>
         <button class="voto-btn" data-voto="dudosa">❓ Dudosa</button>
         <button class="voto-btn" data-voto="falsa">⚠️ Falsa</button>
         <span class="voto-total"></span>
         </div>
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
 inicializarVotaciones();
  
}

// --- PODCAST ---
let colaAudio = [];
let indiceCola = 0;
let audioReproduciendo = false;
let vozActual = null;

function renderPodcast() {
  const selectFuente = document.getElementById('podcast-fuente');
  if (!selectFuente) return;
  const fuentes = [...new Set(noticias.map(n => n.fuente))].sort();
  selectFuente.innerHTML = '<option value="">Todas las fuentes</option>' +
    fuentes.map(f => `<option value="${f}">${f}</option>`).join('');

  document.getElementById('podcast-play').onclick = () => {
    construirCola();
    if (!colaAudio.length) return;
    indiceCola = 0;
    reproducirSiguiente();
  };

  document.getElementById('podcast-pause').onclick = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (audioReproduciendo && vozActual) vozActual.pause();
    audioReproduciendo = false;
  };

  document.getElementById('podcast-next').onclick = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (vozActual) vozActual.pause();
    indiceCola++;
    reproducirSiguiente();
  };

  document.getElementById('podcast-filtro').onchange = construirCola;
  document.getElementById('podcast-fuente').onchange = construirCola;
}

function construirCola() {
  const tipo = document.getElementById('podcast-filtro').value;
  const fuente = document.getElementById('podcast-fuente').value;

  colaAudio = noticias.filter(n => {
    if (tipo === 'aleatorio') return Math.random() > 0.5;
    if (tipo !== 'todas' && n.fuente_tipo !== tipo) return false;
    if (fuente && n.fuente !== fuente) return false;
    return true;
  });

  const listaCont = document.getElementById('podcast-lista');
  listaCont.innerHTML = colaAudio.map((n, i) => `
    <div class="podcast-lista-item" data-i="${i}">
      <span>${n.titulo}</span>
      <small>${n.fuente}</small>
    </div>
  `).join('');

  listaCont.querySelectorAll('.podcast-lista-item').forEach(el => {
    el.onclick = () => {
      indiceCola = parseInt(el.dataset.i);
      reproducirSiguiente();
    };
  });
}

function reproducirSiguiente() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (indiceCola >= colaAudio.length) {
    document.getElementById('podcast-titulo').textContent = 'Fin de la lista';
    document.getElementById('podcast-fuente-actual').textContent = '';
    return;
  }
  const n = colaAudio[indiceCola];
  document.getElementById('podcast-titulo').textContent = n.titulo;
  document.getElementById('podcast-fuente-actual').textContent = n.fuente + ' · ' + n.categoria;

  document.querySelectorAll('.podcast-lista-item').forEach(el => {
    el.classList.toggle('actual', parseInt(el.dataset.i) === indiceCola);
  });

  if (n.audio_url) {
    vozActual = new Audio(n.audio_url);
    vozActual.onended = () => { indiceCola++; reproducirSiguiente(); };
    vozActual.play();
  } else if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(n.titulo + '. ' + n.resumen);
    const voces = window.speechSynthesis.getVoices();
    const vozEs = voces.find(v => v.lang.startsWith('es'));
    if (vozEs) u.voice = vozEs;
    u.lang = 'es-ES';
    u.rate = 0.95;
    u.onend = () => { indiceCola++; reproducirSiguiente(); };
    window.speechSynthesis.speak(u);
  }
  audioReproduciendo = true;
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

// --- PERSPECTIVAS ---

function renderPerspectivas() {
  const cont = document.getElementById('perspectivas');
  if (!cont) return;

  const porTema = {};
  noticias.forEach(n => {
    const t = (n.tema || '').toLowerCase();
    if (!t || t.length < 4) return;
    if (!porTema[t]) porTema[t] = [];
    porTema[t].push(n);
  });

  const bloques = Object.entries(porTema)
    .filter(([_, arr]) => {
      const tipos = new Set(arr.map(n => n.fuente_tipo));
      return tipos.size >= 2;
    })
    .slice(0, maxTemasPerspectivas);

  cont.innerHTML = '';
  if (!bloques.length) {
    cont.innerHTML = '<p style="color:var(--texto-suave)">Aún no hay temas con múltiples perspectivas.</p>';
    return;
  }

  bloques.forEach(([tema, arr]) => {
    const porTipo = {};
    arr.forEach(n => {
      if (!porTipo[n.fuente_tipo]) porTipo[n.fuente_tipo] = n;
    });
    const versiones = Object.values(porTipo).slice(0, 3);

    const div = document.createElement('div');
    div.className = 'tema-bloque';
    div.innerHTML = `
      <div class="tema-titulo">${tema}</div>
      <div class="tema-versiones">
        ${versiones.map(n => `
          <div class="version" data-tipo="${n.fuente_tipo}">
            <small>${n.fuente} · ${n.fuente_tipo}</small>
            <h4>${n.titulo}</h4>
            <p>${n.resumen}</p>
          </div>
        `).join('')}
      </div>
    `;
    cont.appendChild(div);
  });
}

function mostrarInfo() {
  document.getElementById('modal-info').classList.remove('oculto');
}

function cerrarInfo() {
  document.getElementById('modal-info').classList.add('oculto');
}

document.getElementById('modal-info').addEventListener('click', (e) => {
  if (e.target.id === 'modal-info') cerrarInfo();
});

// --- SUPABASE ---
const SUPABASE_URL = 'https://dffizzmftestjyghmjct.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aj1OUORko0Ojn_kNhhPuww_GlgY-HUP';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let votosGlobales = {};

// --- VOTACIÓN ---
function claveVoto(id) { return 'voto_' + id; }

function cargarVotos() {
  return JSON.parse(localStorage.getItem('votos') || '{}');
}

function guardarVotos(v) {
  localStorage.setItem('votos', JSON.stringify(v));
}

async function votar(id, tipo) {
  const todos = cargarVotos();
  if (!todos[id]) todos[id] = {};
  const anterior = todos[id]['yo'];

  // Si el usuario ya votó lo mismo, no hacer nada
  if (anterior === tipo) return;

  // Actualizar localStorage
  todos[id]['yo'] = tipo;
  guardarVotos(todos);
  actualizarVotacion(id);

  if (!supabaseClient) return;

  // Si había un voto anterior, borrarlo de Supabase
  if (anterior) {
    await supabaseClient.from('votes')
      .delete()
      .eq('news_id', String(id))
      .eq('vote_type', anterior);
  }

  // Insertar el nuevo voto
  const { error } = await supabaseClient.from('votes').insert({
    news_id: String(id),
    vote_type: tipo
  });

  if (error) console.log('Error enviando voto:', error);
  cargarVotosGlobales();
}
}

async function cargarVotosGlobales() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('votes').select('news_id, vote_type');
  if (error) { console.log('Error votos globales:', error); return; }

  votosGlobales = {};
  data.forEach(v => {
    const id = v.news_id;
    if (!votosGlobales[id]) votosGlobales[id] = { confirmada: 0, dudosa: 0, falsa: 0 };
    if (votosGlobales[id][v.vote_type] !== undefined) votosGlobales[id][v.vote_type]++;
  });

  document.querySelectorAll('.votacion').forEach(cont => {
    actualizarVotacion(cont.dataset.id);
  });
}

function actualizarVotacion(id) {
  const cont = document.querySelector(`.votacion[data-id="${id}"]`);
  if (!cont) return;
  const v = cargarVotos()[id] || {};
  const mi = v['yo'];

  const global = votosGlobales[String(id)] || { confirmada: 0, dudosa: 0, falsa: 0 };
  const total = global.confirmada + global.dudosa + global.falsa;

  cont.querySelectorAll('.voto-btn').forEach(b => {
    b.classList.toggle('activo', b.dataset.voto === mi);
  });

  const span = cont.querySelector('.voto-total');
  if (total === 0) {
    span.textContent = 'Sé el primero en votar';
  } else {
    span.textContent = `${total} ${total === 1 ? 'voto' : 'votos'}`;
  }
}

function inicializarVotaciones() {
  document.querySelectorAll('.votacion').forEach(cont => {
    const id = cont.dataset.id;
    cont.querySelectorAll('.voto-btn').forEach(b => {
      b.onclick = () => votar(id, b.dataset.voto);
    });
    actualizarVotacion(id);
  });

// Cargar votos globales después de renderizar
setTimeout(cargarVotosGlobales, 1500);
