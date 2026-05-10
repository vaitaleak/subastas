#!/usr/bin/env python3
"""
Scraper de subastas publicas de Espana.
Fuentes:
  1. BOE (SUB-JA, SUB-JV, SUB-RC) - subastas.boe.es - refresh existing IDs
  2. Seguridad Social (TGSS) - w6.seg-social.es/subastas - full scrape

Estrategia BOE: el search esta bloqueado asi que refrescamos los IDs que ya tenemos
+ probeamos IDs nuevos secuenciales.
Estrategia SS: scrape completo via curl --next (sesiones con cookies).
"""
import re, html, json, time, sys, subprocess
from datetime import datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DATA_PATH = REPO_ROOT / "public" / "data.json"


def curl(args, timeout=20):
    """Run curl and return stdout."""
    r = subprocess.run(
        ["curl", "-sL", "--max-time", str(timeout), "-k"] + args,
        capture_output=True, text=True, timeout=timeout + 5, errors="replace"
    )
    return r.stdout


def parse_price_text(text):
    """Parse Spanish price: 138.757,82"""
    text = re.sub(r"<[^>]+>", "", text).strip()
    text = html.unescape(text).replace("\xa0", "").strip()
    text = text.replace("&euro;", "").replace("\u20ac", "").strip()
    if not text or "Sin" in text:
        return 0
    try:
        return int(float(text.replace(".", "").replace(",", ".")))
    except:
        return 0


PROV_NORM = {
    "Alicante/Alacant": "Alicante",
    "Castell\u00f3n/Castell\u00f3": "Castell\u00f3n",
    "Valencia/Val\u00e8ncia": "Valencia",
    "Illes Balears": "Baleares",
    "Araba/\u00c1lava": "\u00c1lava",
    "Bizkaia": "Vizcaya",
    "Gipuzkoa": "Guip\u00fazcoa",
    "A Coru\u00f1a": "Coru\u00f1a",
    "Rioja, La": "Rioja",
    "La Rioja": "Rioja",
}


def norm_prov(name):
    name = html.unescape(name).strip()
    for k, v in PROV_NORM.items():
        if k in name:
            return v
    # Title case
    return " ".join(w.capitalize() for w in name.split())


def decode_html(obj):
    if isinstance(obj, str):
        return html.unescape(obj)
    elif isinstance(obj, dict):
        return {k: decode_html(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decode_html(i) for i in obj]
    return obj


# ============================================================
# BOE SCRAPER - refresh existing + probe new
# ============================================================
def scrape_boe():
    print("=== Scraping BOE ===")

    # Load existing BOE IDs
    existing_ids = set()
    if DATA_PATH.exists():
        with open(DATA_PATH, encoding="utf-8") as f:
            old = json.load(f)
        for a in old.get("auctions", []):
            if a.get("source") != "seguridad_social":
                sid = a.get("source_id", "")
                if sid and "-" in sid:
                    existing_ids.add(sid)

    print(f"  Existing BOE IDs: {len(existing_ids)}")

    # Also probe new IDs around known ranges
    # Extract the numeric part from existing IDs to find the range
    ranges_to_probe = set()
    for sid in existing_ids:
        m = re.match(r"(SUB-[A-Z]+-\d+)-(\d+)", sid)
        if m:
            prefix = m.group(1)
            num = int(m.group(2))
            for offset in range(-5, 6):
                if offset != 0:
                    ranges_to_probe.add(f"{prefix}-{num + offset:06d}")

    # Add sequential probes for current year
    import datetime as dt
    year = dt.datetime.now().year
    for num in range(255000, 265000, 10):
        ranges_to_probe.add(f"SUB-JA-{year}-{num:06d}")
    for num in range(100, 500, 10):
        ranges_to_probe.add(f"SUB-RC-{year}-{num:06d}")

    all_probe_ids = existing_ids | ranges_to_probe
    print(f"  Total IDs to probe: {len(all_probe_ids)}")

    # Try BOE search first (might work from GitHub Actions)
    search_url = (
        "https://subastas.boe.es/subastas_ava.php?"
        "campo%5B2%5D=SUBASTA.ESTADO.CODIGO&dato%5B2%5D=EJ"
        "&opcion=2&numr=200&pagina=1"
    )
    search = curl(["-H", "User-Agent: Mozilla/5.0", search_url], timeout=15)
    found_search = re.findall(r"idSub=(SUB-[A-Z]+-\d+-\d+)", search)
    found_search += re.findall(r"idSubasta=(SUB-[A-Z]+-\d+-\d+)", search)
    if found_search:
        print(f"  Search returned {len(found_search)} IDs")
        all_probe_ids = all_probe_ids | set(found_search)

    # Probe detail pages
    auctions = []
    checked = 0
    for sid in sorted(all_probe_ids):
        checked += 1
        if checked % 100 == 0:
            print(f"  Probed {checked}/{len(all_probe_ids)}, found {len(auctions)} auctions")
            time.sleep(1)

        d1 = curl([f"https://subastas.boe.es/detalleSubasta.php?idSub={sid}&ver=1"], timeout=8)
        if "no existe" in d1.lower() or len(d1) < 3000:
            continue

        # This auction exists! Get details
        d3 = curl([f"https://subastas.boe.es/detalleSubasta.php?idSub={sid}&ver=3"], timeout=8)
        d2 = curl([f"https://subastas.boe.es/detalleSubasta.php?idSub={sid}&ver=2"], timeout=8)

        # Price
        valor = re.search(r"Valor subasta[^0-9]*([\d.,]+)\s*(?:\u20ac|&#x20AC;)", d1)
        if not valor:
            valor = re.search(r"Tasaci[\xf3o]n[^0-9]*([\d.,]+)\s*(?:\u20ac|&#x20AC;)", d1)
        precio = 0
        if valor:
            try:
                precio = int(float(valor.group(1).replace(".", "").replace(",", ".")))
            except:
                pass

        # Bienes (ver=3)
        text3 = html.unescape(re.sub(r"<[^>]+>", " | ", d3))
        text3 = re.sub(r"\s+", " ", text3)

        tipo_m = re.search(r"Bien \d+\s*-\s*(?:Inmueble|Mueble|Derecho)[^)]*\(([^)]+)\)", text3)
        tipo = tipo_m.group(1).strip() if tipo_m else "Otro"
        prov_m = re.search(r"Provincia\s*\|\s*\|\s*([^|]+)", text3)
        prov = prov_m.group(1).strip() if prov_m else ""
        desc_m = re.search(r"Descripci[\xf3o]n\s*\|\s*\|\s*([^|]+)", text3)
        desc = desc_m.group(1).strip() if desc_m else ""
        loc_m = re.search(r"Localidad\s*\|\s*\|\s*([^|]+)", text3)
        loc = loc_m.group(1).strip() if loc_m else prov

        # Authority (ver=2)
        text2 = html.unescape(re.sub(r"<[^>]+>", " | ", d2))
        text2 = re.sub(r"\s+", " ", text2)
        auth_m = re.search(r"Descripci[\xf3o]n\s*\|\s*\|\s*([^|]+)", text2)
        authority = auth_m.group(1).strip() if auth_m else ""

        # Date
        fecha_m = re.search(r"Fecha de conclusi[\xf3o]n[^0-9]*(\d{2})/(\d{2})/(\d{4})", d1)
        if fecha_m:
            fecha_fin = f"{fecha_m.group(3)}-{fecha_m.group(2)}-{fecha_m.group(1)}"
        else:
            fecha_fin = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

        # Source
        juz_lower = authority.lower()
        if "RC-" in sid or any(kw in juz_lower for kw in ["diputaci", "ayuntamiento", "consell", "recaudaci"]):
            source = "hacienda"
        elif "secci" in juz_lower and "social" in juz_lower:
            source = "seguridad_social"
        elif "AT-" in sid or "aeat" in juz_lower or "u.r. subastas" in juz_lower:
            source = "hacienda"
        else:
            source = "judicial"

        # Normalize tipo
        t = tipo
        if "rustica" in t.lower() or "rstica" in t.lower():
            tipo = "Finca r\u00fastica"
        if tipo in ("Otro", "Otros"):
            tipo = "Otro"
        if tipo == "Local comercial":
            tipo = "Local"
        if tipo == "Veh\u00edculo" or "Veh" in t:
            tipo = "Veh\u00edculo"

        auctions.append({
            "tipo_bien": tipo,
            "provincia": norm_prov(html.unescape(prov)),
            "localidad": html.unescape(loc) or html.unescape(prov),
            "descripcion": html.unescape(desc) or f"Subasta {sid}",
            "direccion": "",
            "precio_salida": precio or 50000,
            "puja_minima": int((precio or 50000) * 0.5),
            "fecha_fin": fecha_fin,
            "fecha_inicio": (datetime.strptime(fecha_fin, "%Y-%m-%d") - timedelta(days=30)).strftime("%Y-%m-%d"),
            "estado": "activa",
            "source": source,
            "url_detalle": f"https://subastas.boe.es/detalleSubasta.php?idSub={sid}",
            "juzgado": html.unescape(authority),
            "source_id": sid,
            "codigo_postal": "",
            "municipio": html.unescape(loc) or html.unescape(prov),
        })

    print(f"  BOE: {len(auctions)} active auctions")
    return auctions


# ============================================================
# SEGURIDAD SOCIAL SCRAPER
# ============================================================
def scrape_seguridad_social():
    print("=== Scraping Seguridad Social ===")

    all_ss = []

    for page in range(1, 50):
        sf = f"/tmp/ss_gh{page}.txt"

        cmd = (
            f'curl -sL --max-time 30 -k '
            f'-c "{sf}" '
            f'"https://w6.seg-social.es/subastas/SubaSeControladorInter?opcion=3&avanzada=0" '
            f'--next -sL --max-time 15 -k '
            f'-b "{sf}" -c "{sf}" '
            f'-d "opcion=10&EMB_TIPOBIEN=0101&EMB_TIPOBIEN=0102&EMB_TIPOBIEN=0211" '
            f'"https://w6.seg-social.es/subastas/SubaSeControladorInter" '
            f'--next -sL --max-time 20 -k '
            f'-b "{sf}" -c "{sf}" '
            f'"https://w6.seg-social.es/subastas/SubaSeControladorInter?pagina={page}&opcion=8&tipoOperacion=1"'
        )

        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60, errors="replace")
        content = r.stdout

        if len(content) < 3000 or "<caption>" not in content:
            if page == 1:
                print("  WARNING: Could not get SS page 1, skipping SS")
                return []
            break

        tables = re.split(r"<table[^>]*>", content)
        page_count = 0

        prov_fixes = {
            "alacant/alicante": "Alicante", "araba": "\u00c1lava",
            "bizkaia": "Vizcaya", "gipuzkoa": "Guip\u00fazcoa",
            "illes balears": "Baleares", "val\u00e8ncia/valencia": "Valencia",
            "a coru\u00f1a": "Coru\u00f1a", "s.c. de tenerife": "Santa Cruz de Tenerife",
            "la rioja": "Rioja",
        }

        for table in tables:
            cap_m = re.match(r"\s*<caption>([^<]+)</caption>", table)
            if not cap_m:
                continue
            caption = html.unescape(cap_m.group(1))

            cap_parts = caption.split(" - ")
            prov_raw = cap_parts[1].strip() if len(cap_parts) >= 2 else ""
            prov = html.unescape(prov_raw)

            for k, v in prov_fixes.items():
                if k in prov.lower():
                    prov = v
                    break

            if "stica" in caption or "rustica" in caption.lower():
                tipo = "Finca r\u00fastica"
            elif "Urbana" in caption:
                tipo = "Vivienda"
            elif "Veh" in caption:
                tipo = "Veh\u00edculo"
            else:
                tipo = "Otro"

            rows = re.findall(r"<tr[^>]*>(.*?)</tr>", table, re.DOTALL)
            for row in rows:
                cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL)
                if len(cells) < 6:
                    continue

                link_m = re.search(r"EMB_ID=(\d+)", cells[0])
                emb_id = link_m.group(1) if link_m else ""
                addr = html.unescape(re.sub(r"<[^>]+>", "", cells[0])).strip()
                addr_clean = re.sub(r"IDUFIR\s+\S+\s*", "", addr).strip()
                loc_m = re.search(r"\(([^)]+)\)", addr)
                locality = loc_m.group(1).strip() if loc_m else prov

                precio = parse_price_text(cells[2])
                puja = parse_price_text(cells[5]) if len(cells) > 5 else 0

                fecha_text = re.sub(r"<[^>]+>", "", cells[6]).strip() if len(cells) > 6 else ""
                fecha_m = re.match(r"(\d{2})/(\d{2})/(\d{4})", fecha_text)
                fecha_iso = f"{fecha_m.group(3)}-{fecha_m.group(2)}-{fecha_m.group(1)}" if fecha_m else "2026-06-15"

                url = f"https://w6.seg-social.es/subastas/SubaSeControladorInter?opcion=13&EMB_ID={emb_id}&opcion2=1&tipoOperacion=1" if emb_id else ""

                all_ss.append({
                    "tipo_bien": tipo, "provincia": prov, "localidad": locality,
                    "descripcion": f"{addr_clean}, {locality}", "direccion": addr_clean,
                    "precio_salida": precio or 50000, "puja_minima": puja or int((precio or 50000) * 0.5),
                    "fecha_fin": fecha_iso, "fecha_inicio": "2026-05-10", "estado": "activa",
                    "source": "seguridad_social", "url_detalle": url,
                    "juzgado": "Tesorer\u00eda General de la Seguridad Social",
                    "source_id": f"SS-{emb_id}", "codigo_postal": "", "municipio": locality,
                })
                page_count += 1

        print(f"  Page {page}: +{page_count} (total: {len(all_ss)})")

        total_m = re.search(r"total de\s*(\d+)", content)
        total = int(total_m.group(1)) if total_m else 0
        if page * 20 >= total:
            break
        time.sleep(0.5)

    print(f"  SS: {len(all_ss)} auctions scraped")
    return all_ss


# ============================================================
# MAIN
# ============================================================
def main():
    print(f"Starting scraper at {datetime.now().isoformat()}")

    boe_auctions = scrape_boe()
    ss_auctions = scrape_seguridad_social()

    all_auctions = boe_auctions + ss_auctions

    # If BOE returned 0 (search blocked + existing expired), keep old BOE data
    if len(boe_auctions) == 0 and DATA_PATH.exists():
        with open(DATA_PATH, encoding="utf-8") as f:
            old = json.load(f)
        old_boe = [a for a in old.get("auctions", []) if a.get("source") != "seguridad_social"]
        if old_boe:
            print(f"  Keeping {len(old_boe)} old BOE auctions (BOE search blocked)")
            all_auctions = old_boe + ss_auctions

    for i, a in enumerate(all_auctions):
        a["id"] = i + 1

    # Deep decode
    all_auctions = decode_html(all_auctions)

    # Fix tipo consistency
    for a in all_auctions:
        t = a["tipo_bien"]
        if "rustica" in t.lower() or "rstica" in t.lower():
            a["tipo_bien"] = "Finca r\u00fastica"
        if a["tipo_bien"] in ("Otro", "Otros"):
            a["tipo_bien"] = "Otro"
        if a["tipo_bien"] == "Local comercial":
            a["tipo_bien"] = "Local"
        if "Veh" in a["tipo_bien"] and a["tipo_bien"] != "Veh\u00edculo":
            a["tipo_bien"] = "Veh\u00edculo"

    # Normalize provinces
    for a in all_auctions:
        p = a.get("provincia", "")
        if "Castell" in p:
            a["provincia"] = "Castell\u00f3n"

    sources = {}
    types = {}
    provs = set()
    for a in all_auctions:
        sources[a["source"]] = sources.get(a["source"], 0) + 1
        types[a["tipo_bien"]] = types.get(a["tipo_bien"], 0) + 1
        if a.get("provincia"):
            provs.add(a["provincia"])

    data = {
        "auctions": all_auctions,
        "stats": {
            "totalActive": len(all_auctions),
            "totalProvinces": len(provs),
            "newToday": 0,
            "lastUpdated": datetime.now().isoformat(),
        },
        "provincias": sorted(provs),
        "tipos_bien": list(dict.fromkeys(a["tipo_bien"] for a in all_auctions)),
    }

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"\n=== FINAL ===")
    print(f"Total: {len(all_auctions)}")
    for s, c in sorted(sources.items(), key=lambda x: -x[1]):
        print(f"  {c:>4} {s}")
    print(f"Provincias: {len(provs)}")
    print(f"Saved to {DATA_PATH}")

    return len(all_auctions)


if __name__ == "__main__":
    count = main()
    sys.exit(0 if count > 0 else 1)
