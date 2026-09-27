import urllib.request
import xml.etree.ElementTree as ET
import json
import re
from datetime import datetime

FUENTES = [
    {"url": "https://www.cubadebate.cu/feed/", "fuente": "Cubadebate", "tipo": "oficial"},
    {"url": "https://www.granma.cu/rss.xml", "fuente": "Granma", "tipo": "oficial"},
    {"url": "https://www.prensa-latina.cu/feed", "fuente": "Prensa Latina", "tipo": "oficial"},
]

CATEGORIAS = {
    "energia": ["apagón", "apagon", "energía", "energia", "une", "déficit", "mw", "eléctrica"],
    "economia": ["economía", "economia", "mipyme", "precio", "dólar", "dolar", "banco"],
    "salud": ["salud", "medicamento", "hospital", "médico", "medico"],
    "transporte": ["transporte", "ómnibus", "omnibus", "ferrocarril", "vía", "via"],
    "sociedad": ["sociedad", "educación", "educacion", "cultura"],
    "politica": ["gobierno", "díaz-canel", "diaz-canel", "partido", "ministro"],
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

def leer_feed(f):
    noticias = []
    try:
        req = urllib.request.Request(f["url"], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            xml = r.read()
        root = ET.fromstring(xml)
        items = root.findall(".//item")[:10]
        for item in items:
            titulo = item.findtext("title") or ""
            desc = limpiar(item.findtext("description") or "")
            link = item.findtext("link") or "#"
            fecha = item.findtext("pubDate") or ""
            cat = clasificar(titulo + " " + desc)
            noticias.append({
                "categoria": cat,
                "fuente": f["fuente"],
                "fuente_tipo": f["tipo"],
                "titulo": titulo.strip(),
                "resumen": desc,
                "audio_url": "",
                "imagen_url": "",
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
    for i, n in enumerate(todas):
        n["id"] = i + 1
    # Marcar las 5 primeras como destacadas
    for n in todas[:5]:
        n["destacada"] = True
    salida = {
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "noticias": todas
    }
    with open("data/noticias.json", "w", encoding="utf-8") as fp:
        json.dump(salida, fp, ensure_ascii=False, indent=2)
    print(f"Guardadas {len(todas)} noticias")

if __name__ == "__main__":
    main()
