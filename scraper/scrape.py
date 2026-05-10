#!/usr/bin/env python3
"""
Scraper de subastas publicas de Espana.
Fuentes:
  1. BOE Judicial (SUB-JA) - subastas.boe.es
  2. BOE Hacienda/Recaudacion (SUB-RC) - subastas.boe.es  
  3. Seguridad Social (TGSS) - w6.seg-social.es/subastas

Genera public/data.json con todas las subastas activas.
"""
import subprocess, re, html, json, time, sys
from datetime import datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DATA_PATH = REPO_ROOT / "public" / "data.json"

def curl(args, timeout=20):
    """Run curl and return stdout."""
    r = subprocess.run(
        ["curl", "-sL", "--max-time", str(timeout)] + args,
        capture_output=True, text=True, timeout=timeout + 5, errors="replace"
    )
    return r.stdout

def parse_price(text):
    text = re.sub(r"<[^>]+>", "", text).strip()
    text = html.unescape(text).replace("\xa0", "").strip()
    text = text.replace("&euro;", "").replace("\u20ac", "").replace("\u20ac", "").strip()
    if not text or "Sin" in text:
        return 0
    try:
        return int(float(text.replace(".", "").replace(",", ".")))
    except:
        return 0

PROV_NORM = {
    "Alicante/Alacant": "Alicante", "Castell\u00f3n/Castell\u00f3": "Castell\u00f3n",
    "Valencia/Val\u00e8ncia": "Valencia", "Illes Balears": "Baleares",
    "Araba/\u00c1lava": "\u00c1lava", "Bizkaia": "Vizcaya", "Gipuzkoa": "Guip\u00fazcoa",
    "A Coru\u00f1a": "Coru\u00f1a",
}

def norm_prov(name):
    name = html.unescape(name).strip()
    for k, v in PROV_NORM.items():
        if k in name:
            return v
    return name

# ============================================================
# BOE SCRAPER
# ============================================================
def scrape_boe():
    """Scrape active auctions from subastas.boe.es."""
    print("=== Scraping BOE ===")
    
    # Step 1: Get the search results page
    url = (
        "https://subastas.boe.es/subastas_ava.php?"
        "campo%5B2%5D=SUBASTA.ESTADO.CODIGO&dato%5B2%5D=EJ"
        "&campo%5B3%5D=BIEN.TIPO&dato%5B3%5D=I"
        "&campo%5B4%5D=SUBASTA.FECHA_FIN.YMD"
        "&opcion=2&pagina=1&numr=200"
    )
    page = curl(["-H", "User-Agent: Mozilla/5.0", url], timeout=20)
    
    # Extract IDs from search results
    ids = re.findall(r"idSubasta=(SUB-[A-Z]{2}-\d+-\d+)", page)
    ids = list(dict.fromkeys(ids))  # deduplicate preserving order
    
    if not ids:
        # Fallback: try detail page links
        ids = re.findall(r"detalleSubasta\.php\?idSub=(SUB-[A-Z]{2}-\d+-\d+)", page)
        ids = list(dict.fromkeys(ids))
    
    # Also try without the type filter to get more
    url2 = (
        "https://subastas.boe.es/subastas_ava.php?"
        "campo%5B2%5D=SUBASTA.ESTADO.CODIGO&dato%5B2%5D=EJ"
        "&campo%5B4%5D=SUBASTA.FECHA_FIN.YMD"
        "&opcion=2&pagina=1&numr=200"
    )
    page2 = curl(["-H", "User-Agent: Mozilla/5.0", url2], timeout=20)
    ids2 = re.findall(r"idSubasta=(SUB-[A-Z]{2}-\d+-\d+)", page2)
    ids2 += re.findall(r"detalleSubasta\.php\?idSub=(SUB-[A-Z]{2}-\d+-\d+)", page2)
    
    all_ids = list(dict.fromkeys(ids + ids2))
    print(f"  Found {len(all_ids)} IDs from search")
    
    # Paginate if needed
    for pg in range(2, 10):
        url_pg = url2.replace("pagina=1", f"pagina={pg}")
        pg_content = curl(["-H", "User-Agent: Mozilla/5.0", url_pg], timeout=20)
        pg_ids = re.findall(r"idSubasta=(SUB-[A-Z]{2}-\d+-\d+)", pg_content)
        pg_ids += re.findall(r"detalleSubasta\.php\?idSub=(SUB-[A-Z]{2}-\d+-\d+)", pg_content)
        if not pg_ids:
            break
        before = len(all_ids)
        all_ids = list(dict.fromkeys(all_ids + pg_ids))
        if len(all_ids) == before:
            break
        time.sleep(0.3)
    
    print(f"  Total unique IDs: {len(all_ids)}")
    
    # Scrape detail pages
    auctions = []
    for i, sub_id in enumerate(all_ids):
        if i > 0 and i % 50 == 0:
            print(f"  Scraped {i}/{len(all_ids)}...")
            time.sleep(1)  # Rate limit
        
        # Get general info (ver=1)
        detail1 = curl([f"https://subastas.boe.es/detalleSubasta.php?idSub={sub_id}&ver=1"], timeout=10)
        if "no existe" in detail1.lower() or len(detail1) < 3000:
            continue
        
        # Get bienes info (ver=3)
        detail3 = curl([f"https://subastas.boe.es/detalleSubasta.php?idSub={sub_id}&ver=3"], timeout=10)
        
        # Get authority (ver=2)
        detail2 = curl([f"https://subastas.boe.es/detalleSubasta.php?idSub={sub_id}&ver=2"], timeout=10)
        
        # Parse price
        valor = re.search(r"Valor subasta[^0-9]*([\d.,]+)\s*(?:\u20ac|&#x20AC;)", detail1)
        if not valor:
            valor = re.search(r"Tasaci[oó]n[^0-9]*([\d.,]+)\s*(?:\u20ac|&#x20AC;)", detail1)
        precio = 0
        if valor:
            try:
                precio = int(float(valor.group(1).replace(".", "").replace(",", ".")))
            except:
                pass
        
        # Parse bienes
        text3 = html.unescape(re.sub(r"<[^>]+>", " | ", detail3))
        text3 = re.sub(r"\s+", " ", text3)
        
        tipo_m = re.search(r"Bien \d+\s*-\s*(Inmueble|Mueble|Derecho)[^|]*\(([^)]+)\)", text3)
        tipo = tipo_m.group(2).strip() if tipo_m else "Otro"
        prov_m = re.search(r"Provincia\s*\|\s*\|\s*([^|]+)", text3)
        prov = html.unescape(prov_m.group(1).strip()) if prov_m else ""
        desc_m = re.search(r"Descripci[oó]n\s*\|\s*\|\s*([^|]+)", text3)
        desc = html.unescape(desc_m.group(1).strip()) if desc_m else ""
        loc_m = re.search(r"Localidad\s*\|\s*\|\s*([^|]+)", text3)
        loc = html.unescape(loc_m.group(1).strip()) if loc_m else ""
        
        # Parse authority
        text2 = html.unescape(re.sub(r"<[^>]+>", " | ", detail2))
        text2 = re.sub(r"\s+", " ", text2)
        auth_m = re.search(r"Descripci[oó]n\s*\|\s*\|\s*([^|]+)", text2)
        authority = html.unescape(auth_m.group(1).strip()) if auth_m else ""
        
        # Parse date
        fecha_m = re.search(r"Fecha de conclusión[^0-9]*(\d{2}/\d{2}/\d{4})", detail1)
        if fecha_m:
            parts = fecha_m.group(1).split("/")
            fecha_fin = f"{parts[2]}-{parts[1]}-{parts[0]}"
        else:
            fecha_fin = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Determine source
        juz_lower = authority.lower()
        if "RC-" in sub_id or "diputaci" in juz_lower or "ayuntamiento" in juz_lower or "consell" in juz_lower or "recaudaci" in juz_lower:
            source = "hacienda"
        elif "secci" in juz_lower and "social" in juz_lower:
            source = "seguridad_social"
        elif "AT-" in sub_id or "aeat" in juz_lower or "u.r. subastas" in juz_lower:
            source = "hacienda"
        else:
            source = "judicial"
        
        # Fix tipo
        if "rustica" in tipo.lower() or "rstica" in tipo.lower():
            tipo = "Finca rústica"
        if tipo in ("Otro", "Otros"):
            tipo = "Otro"
        if tipo == "Local comercial":
            tipo = "Local"
        
        auctions.append({
            "tipo_bien": tipo,
            "provincia": norm_prov(prov),
            "localidad": loc or prov,
            "descripcion": desc or f"Subasta {sub_id}",
            "direccion": "",
            "precio_salida": precio or 50000,
            "puja_minima": int((precio or 50000) * 0.5),
            "fecha_fin": fecha_fin,
            "fecha_inicio": (datetime.strptime(fecha_fin, "%Y-%m-%d") - timedelta(days=30)).strftime("%Y-%m-%d"),
            "estado": "activa",
            "source": source,
            "url_detalle": f"https://subastas.boe.es/detalleSubasta.php?idSub={sub_id}",
            "juzgado": authority,
            "source_id": sub_id,
            "codigo_postal": "",
            "municipio": loc or prov,
        })
    
    print(f"  BOE: {len(auctions)} auctions scraped")
    return auctions


# ============================================================
# SEGURIDAD SOCIAL SCRAPER
# ============================================================
def scrape_seguridad_social():
    """Scrape active auctions from w6.seg-social.es/subastas."""
    print("=== Scraping Seguridad Social ===")
    
    all_ss = []
    
    # Use --next chain to maintain session across 3 requests
    # Each page gets its own session to be safe
    for page in range(1, 40):
        session_file = f"/tmp/ss_pg{page}.txt"
        
        cmd = (
            f"curl -sL --max-time 30 "
            f"-c {session_file} "
            f"'https://w6.seg-social.es/subastas/SubaSeControladorInter?opcion=3&avanzada=0' "
            f"--next -sL --max-time 15 "
            f"-b {session_file} -c {session_file} "
            f"-d 'opcion=10&EMB_TIPOBIEN=0101&EMB_TIPOBIEN=0102&EMB_TIPOBIEN=0211' "
            f"'https://w6.seg-social.es/subastas/SubaSeControladorInter' "
            f"--next -sL --max-time 20 "
            f"-b {session_file} -c {session_file} "
            f"'https://w6.seg-social.es/subastas/SubaSeControladorInter?pagina={page}&opcion=8&tipoOperacion=1'"
        )
        
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=45, errors="replace")
        content = r.stdout
        
        if len(content) < 3000 or "<caption>" not in content:
            if page == 1:
                print("  WARNING: Could not get SS page 1, skipping SS")
                return []
            break
        
        tables = re.split(r"<table[^>]*>", content)
        page_count = 0
        
        for table in tables:
            cap_m = re.match(r"\s*<caption>([^<]+)</caption>", table)
            if not cap_m:
                continue
            caption = html.unescape(cap_m.group(1))
            
            cap_parts = caption.split(" - ")
            prov_raw = cap_parts[1].strip() if len(cap_parts) >= 2 else "Desconocida"
            prov = norm_prov(html.unescape(prov_raw))
            
            # Fix common broken names
            prov_fixes = {
                "Alacant/Alicante": "Alicante", "Araba/Álava": "Álava",
                "Bizkaia": "Vizcaya", "Gipuzkoa": "Guipúzcoa",
                "Illes Balears": "Baleares", "València/Valencia": "Valencia",
                "A Coruña": "Coruña", "S.C. De Tenerife": "Santa Cruz de Tenerife",
                "La Rioja": "Rioja",
            }
            for k, v in prov_fixes.items():
                if k.lower() in prov.lower():
                    prov = v
                    break
            
            if "stica" in caption:
                tipo = "Finca rústica"
            elif "Urbana" in caption:
                tipo = "Vivienda"
            elif "Veh" in caption:
                tipo = "Vehículo"
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
                
                precio = parse_price(cells[2])
                puja = parse_price(cells[5]) if len(cells) > 5 else 0
                
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
                    "juzgado": "Tesorería General de la Seguridad Social",
                    "source_id": f"SS-{emb_id}", "codigo_postal": "", "municipio": locality,
                })
                page_count += 1
        
        print(f"  Page {page}: {page_count} (total: {len(all_ss)})")
        
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
    
    # Scrape all sources
    boe_auctions = scrape_boe()
    ss_auctions = scrape_seguridad_social()
    
    # Merge
    all_auctions = boe_auctions + ss_auctions
    
    # Re-index
    for i, a in enumerate(all_auctions):
        a["id"] = i + 1
    
    # Final normalization
    for a in all_auctions:
        a["provincia"] = html.unescape(a.get("provincia", ""))
        a["localidad"] = html.unescape(a.get("localidad", a["provincia"]))
        a["descripcion"] = html.unescape(a.get("descripcion", ""))
        a["direccion"] = html.unescape(a.get("direccion", ""))
        a["juzgado"] = html.unescape(a.get("juzgado", ""))
    
    # Stats
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
