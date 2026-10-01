import urllib.request
import xml.etree.ElementTree as ET
import json
import re
import os
from datetime import datetime

RUTAS_FEED = ["/feed/", "/rss/", "/rss.xml", "/feed", "/?feed=rss2", "/atom.xml"]

CATEGORIAS = {
    "energia": ["apagón", "apagon", "energía", "energia", "une", "déficit", "mw", "eléctrica", "electricidad"],
    "economia": ["economía", "economia", "mipyme", "precio", "dólar", "dolar", "banco", "inflación"],
    "salud": ["salud", "medicamento", "hospital", "médico", "medico", "farmacia"],
    "transporte": ["transporte", "ómnibus", "omnibus", "ferrocarril", "vía", "via", "tren"],
    "sociedad": ["sociedad", "educación", "educacion", "cultura", "deporte"],
    "politica": ["gobierno", "díaz-canel", "diaz-canel", "partido", "ministro", "presidente"],
}

PALABRAS_CUBA = [
    "cuba", "cubano", "cubana", "habana", "la habana", "díaz-canel", "diaz-canel",
    "raul castro", "raúl castro", "embargo", "bloqueo", "helms-burton", "balseros"
]

def clasificar(texto):
    t = texto.lower()
    for cat, palabras in CATEGORIAS.items():
        for p in palabras:
            if p in t:
                return cat
    return "sociedad"

def limpiar(html):
    if not html:
        return ""
    texto = re.sub(r'<[^>]+>', '', html)
    return re.sub(r'\s+', ' ', texto).strip()[:300]

def extraer_imagen(item):
    img = ""
    media = item.find("{http://search.yahoo.com/mrss/}content")
    if media is not None and media.get("url"):
        img = media.get("url")
    if not img:
        thumb = item.find("{http://search.yahoo.com/mrss/}thumbnail")
        if thumb is not None and thumb.get("url"):
            img = thumb.get("url")
    if not img:
        desc_raw = item.findtext("description") or ""
        m = re.search(r'<img[^>]+src="([^"]+)"', desc_raw)
        if m:
            img = m.group(1)
    return img

def es_de_cuba(texto):
    t = texto.lower()
    return any(p in t for p in PALABRAS_CUBA)

def probar_feed(base):
    for ruta in RUTAS_FEED:
        url = base.rstrip("/") + ruta
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as r:
                xml = r.read(5000)
            if b"<rss" in xml or b"<feed" in xml or b"<channel" in xml:
                return url
        except Exception:
            continue
    return None

def cargar_fuentes():
    if not os.path.exists("data/fuentes.json"):
        return []
    with open("data/fuentes.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    semillas = data.get("semilla", [])
    feeds = data.get("feeds", {})
    nuevos = {}
    for s in semillas:
        if s in feeds:
            continue
        url = probar_feed(s)
        if url:
            nuevos[s] = url
            print(f"Nuevo feed: {s} -> {url}")
    feeds.update(nuevos)
    with open("data/fuentes.json", "w", encoding="utf-8") as f:
        json.dump({"semilla": semillas, "feeds": feeds}, f, ensure_ascii=False, indent=2)
    return [(s, url) for s, url in feeds.items()]

def leer_feed(nombre, url):
    noticias = []
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            xml = r.read()
        root = ET.fromstring(xml)
        for item in root.findall(".//item")[:12]:
            titulo = (item.findtext("title") or "").strip()
            desc = limpiar(item.findtext("description") or "")
            if not es_de_cuba(titulo + " " + desc):
                continue
            noticias.append({
                "categoria": clasificar(titulo + " " + desc),
                "fuente": nombre,
                "fuente_tipo": "oficial" if any(x in nombre.lower() for x in ["cubadebate", "granma", "prensa"]) else "alternativa",
                "titulo": titulo,
                "resumen": desc,
                "imagen_url": extraer_imagen(item),
                "enlace_original": item.findtext("link") or "#",
                "destacada": False,
                "tema": "",
                "fecha": item.findtext("pubDate") or "",
            })
    except Exception as e:
        print(f"Error {nombre}: {e}")
    return noticias

def main():
    config = {"horas_entre_rastreos": 1, "max_por_fuente": 5}
    if os.path.exists("data/config.json"):
        with open("data/config.json") as f:
            config.update(json.load(f))

    ahora = datetime.now()
    if os.path.exists("data/ultimo.json"):
        with open("data/ultimo.json") as f:
            ultimo = datetime.fromisoformat(json.load(f)["ts"])
        horas = (ahora - ultimo).total_seconds() / 3600
        if horas < config["horas_entre_rastreos"]:
            print(f"Saltando. Faltan {config['horas_entre_rastreos'] - horas:.1f}h")
            return

    fuentes = cargar_fuentes()
    todas = []
    for nombre, url in fuentes:
        todas.extend(leer_feed(nombre, url))

    vistos = set()
    unicas = []
    for n in todas:
        clave = n["titulo"].lower()[:50]
        if clave not in vistos:
            vistos.add(clave)
            unicas.append(n)

    por_fuente = {}
    balanceadas = []
    for n in unicas:
        f = n["fuente"]
        por_fuente[f] = por_fuente.get(f, 0) + 1
        if por_fuente[f] <= config["max_por_fuente"]:
            balanceadas.append(n)
    unicas = balanceadas
   
    
    def extraer_tema(titulo):
      t = titulo.lower()
      temas_fijos = {
        "tipo_cambio": ["dólar", "dolar", "euro", "tasa de cambio", "divisa", "cambio de divisa", "bcc", "el toque"],
         "apagones": ["apagón", "apagon", "déficit eléctrico", "une"],
         "mipymes": ["mipyme", "cuentapropista", "pyme"],
         "transporte": ["ómnibus", "omnibus", "ferrocarril", "tren", "transporte"]
       }
      for tema, claves in temas_fijos.items():
        for c in claves:
            if c in t:
                return tema
        palabras = re.findall(r'\b[a-záéíóúñ]{5,}\b', t)
        stop = {"sobre", "desde", "hasta", "entre", "según", "mientras", "donde", "cuando", "tiene", "hacer", "puede", "tras", "ante"}
        palabras = [p for p in palabras if p not in stop]
        return palabras[0] if palabras else ""

    for n in unicas:
        n["tema"] = extraer_tema(n["titulo"])
    # Agrupar por tema (palabras clave comunes en el título)
    # Filtrar por antigüedad
    from email.utils import parsedate_to_datetime
    horas_max = config.get("horas_vida_noticias", 48)
    ahora_utc = datetime.utcnow()
    filtradas = []
    for n in unicas:
       try:
        fecha_pub = parsedate_to_datetime(n.get("fecha", ""))
        edad_horas = (ahora_utc - fecha_pub.replace(tzinfo=None)).total_seconds() / 3600
        if edad_horas <= horas_max:
          filtradas.append(n)
       except Exception:
         filtradas.append(n)
    unicas = filtradas 
    
    
    for i, n in enumerate(unicas):
        n["id"] = i + 1
    for n in unicas[:5]:
        n["destacada"] = True

    with open("data/noticias.json", "w", encoding="utf-8") as f:
        json.dump({"fecha": ahora.strftime("%Y-%m-%d"), "hora": ahora.strftime("%H:%M"), "total": len(unicas), "noticias": unicas}, f, ensure_ascii=False, indent=2)

    with open("data/ultimo.json", "w") as f:
        json.dump({"ts": ahora.isoformat()}, f)

    print(f"Guardadas {len(unicas)} noticias de {len(fuentes)} fuentes")

if __name__ == "__main__":
    main()
