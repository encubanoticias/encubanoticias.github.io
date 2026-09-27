import urllib.request
import xml.etree.ElementTree as ET
import json
import re
from datetime import datetime

FUENTES = [
    {"url": "https://www.cubadebate.cu/feed/", "fuente": "Cubadebate", "tipo": "oficial"},
    {"url": "https://www.granma.cu/rss.xml", "fuente": "Granma", "tipo": "oficial"},
    {"url": "https://www.prensa-latina.cu/feed", "fuente": "Prensa Latina", "tipo": "oficial"},
    {"url": "https://oncubanews.com/feed/", "fuente": "OnCuba", "tipo": "alternativa"},
    {"url": "https://www.14ymedio.com/rss/", "fuente": "14ymedio", "tipo": "alternativa"},
    {"url": "https://www.cibercuba.com/rss.xml", "fuente": "CiberCuba", "tipo": "alternativa"},
]

CATEGORIAS = {
    "energia": ["apagón", "apagon", "energía", "energia", "une", "déficit", "mw", "eléctrica", "electricidad"],
    "economia": ["economía", "economia", "mipyme", "precio", "dólar", "dolar", "banco", "inflación"],
    "salud": ["salud", "medicamento", "hospital", "médico", "medico", "farmacia"],
    "transporte": ["transporte", "ómnibus", "omnibus", "ferrocarril", "vía", "via", "tren"],
    "sociedad": ["sociedad", "educación", "educacion", "cultura", "deporte"],
    "politica": ["gobierno", "díaz-canel", "diaz-canel", "partido", "ministro", "presidente"],
}

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
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto[:300]

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
PALABRAS_CUBA = [
    "cuba", "cubano", "cubana", "habana", "la habana", "díaz-canel", "diaz-canel",
    "miguel díaz-canel", "raul castro", "raúl castro", "cubadebate", "granma",
    "embargo", "bloqueo", "helms-burton", "balseros", "isla caribeña"
]

def es_de_cuba(texto):
    t = texto.lower()
    for p in PALABRAS_CUBA:
        if p in t:
            return True
    return False
    
def leer_feed(f):
    noticias = []
    try:
        req = urllib.request.Request(f["url"], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            xml = r.read()
        root = ET.fromstring(xml)
        items = root.findall(".//item")[:12]
        for item in items:
            titulo = (item.findtext("title") or "").strip()
            desc = limpiar(item.findtext("description") or "")
            link = item.findtext("link") or "#"
            fecha = item.findtext("pubDate") or ""
            img = extraer_imagen(item)
            fuentes_cubanas = ["Cubadebate", "Granma", "Prensa Latina", "OnCuba", "14ymedio", "CiberCuba"]
            if f["fuente"] not in fuentes_cubanas and not es_de_cuba(titulo + " " + desc):
            continue
            cat = clasificar(titulo + " " + desc)
            noticias.append({
                "categoria": cat,
                "fuente": f["fuente"],
                "fuente_tipo": f["tipo"],
                "titulo": titulo,
                "resumen": desc,
                "audio_url": "",
                "imagen_url": img,
                "enlace_original": link,
                "destacada": False,
                "fecha": fecha
            })
    except Exception as e:
        print(f"Error con {f['fuente']}: {e}")
    return noticias

def main():
    todas = []
    for f in FUENTES:
        todas.extend(leer_feed(f))

    # Eliminar duplicados por título
    vistos = set()
    unicas = []
    for n in todas:
        clave = n["titulo"].lower()[:50]
        if clave not in vistos:
            vistos.add(clave)
            unicas.append(n)

    for i, n in enumerate(unicas):
        n["id"] = i + 1

    # Marcar 5 destacadas (las primeras)
    for n in unicas[:5]:
        n["destacada"] = True

    salida = {
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "hora": datetime.now().strftime("%H:%M"),
        "total": len(unicas),
        "noticias": unicas
    }
    with open("data/noticias.json", "w", encoding="utf-8") as fp:
        json.dump(salida, fp, ensure_ascii=False, indent=2)
    print(f"Guardadas {len(unicas)} noticias")

if __name__ == "__main__":
    main()
