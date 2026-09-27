fetch('data/noticias.json')
  .then(res => res.json())
  .then(data => {
    const contenedor = document.getElementById('noticias');
    data.noticias.forEach(n => {
      const card = document.createElement('article');
      card.className = 'noticia';
      card.innerHTML = `
        <span class="categoria">${n.categoria}</span>
        <h2>${n.titulo}</h2>
        <p>${n.resumen}</p>
        <small>${n.fuente} · ${n.fuente_tipo}</small>
      `;
      contenedor.appendChild(card);
    });
  })
  .catch(err => console.error('Error cargando noticias:', err));
