#!/usr/bin/env python3
"""
Convierte un CSV de Kaggle (u otro dataset de ataques) a data/base_events.json.

Detecta automáticamente columnas comunes (fecha, tipo de ataque, severidad,
país, sector, objetivo...). Si tu CSV usa otros nombres, indicalos con --map.

Ejemplos:
  python scripts/kaggle_to_json.py dataset.csv
  python scripts/kaggle_to_json.py dataset.csv --map type="Attack Type" --map date=Timestamp
  python scripts/kaggle_to_json.py dataset.csv --limit 5000 --source "Kaggle"

Después corré:  python scripts/update_feeds.py   (para unirlo con los feeds en vivo)
"""
import argparse
import csv
import json
import sys
from datetime import datetime
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "base_events.json"

CANDIDATES = {
    "date": ["timestamp", "date", "datetime", "time", "fecha", "event time", "date_time"],
    "type": ["attack type", "attack_type", "attack category", "category", "type", "threat type", "tipo"],
    "severity": ["severity", "severity level", "severity_level", "risk", "priority", "severidad"],
    "country": ["country", "target country", "destination country", "geo", "pais", "país", "location"],
    "sector": ["sector", "industry", "target industry", "target sector", "affected industry"],
    "target": ["target", "target system", "destination ip", "dest ip", "destination ip address", "host", "objetivo"],
    "detail": ["description", "details", "attack signature", "payload", "scenario description", "malware", "detail"],
}

SEVERITY = {
    "critical": "Crítica", "crítica": "Crítica", "critica": "Crítica", "very high": "Crítica",
    "high": "Alta", "alta": "Alta", "medium": "Media", "moderate": "Media", "media": "Media",
    "low": "Baja", "baja": "Baja", "info": "Baja", "informational": "Baja",
}

COUNTRY_ISO = {
    "argentina": "AR", "brazil": "BR", "brasil": "BR", "chile": "CL", "uruguay": "UY", "paraguay": "PY",
    "bolivia": "BO", "peru": "PE", "perú": "PE", "colombia": "CO", "venezuela": "VE", "ecuador": "EC",
    "mexico": "MX", "méxico": "MX", "united states": "US", "usa": "US", "canada": "CA",
    "united kingdom": "GB", "uk": "GB", "ireland": "IE", "france": "FR", "spain": "ES", "españa": "ES",
    "portugal": "PT", "germany": "DE", "italy": "IT", "netherlands": "NL", "belgium": "BE",
    "switzerland": "CH", "austria": "AT", "sweden": "SE", "norway": "NO", "finland": "FI",
    "denmark": "DK", "poland": "PL", "romania": "RO", "ukraine": "UA", "russia": "RU", "turkey": "TR",
    "israel": "IL", "iran": "IR", "saudi arabia": "SA", "united arab emirates": "AE", "egypt": "EG",
    "south africa": "ZA", "nigeria": "NG", "kenya": "KE", "india": "IN", "pakistan": "PK", "china": "CN",
    "japan": "JP", "south korea": "KR", "north korea": "KP", "taiwan": "TW", "singapore": "SG",
    "vietnam": "VN", "thailand": "TH", "indonesia": "ID", "malaysia": "MY", "philippines": "PH",
    "australia": "AU", "new zealand": "NZ",
}

DATE_FORMATS = ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%m/%d/%Y",
                "%d/%m/%Y %H:%M", "%m/%d/%Y %H:%M", "%Y/%m/%d"]


def parse_date(v):
    s = (v or "").strip()
    if not s:
        return None
    s = s.replace("Z", "").split(".")[0]
    for f in DATE_FORMATS:
        for candidate in (s, s[:10]):
            try:
                return datetime.strptime(candidate, f).date().isoformat()
            except ValueError:
                continue
    try:
        return datetime.fromisoformat(s).date().isoformat()
    except ValueError:
        return None


def parse_severity(v):
    s = (v or "").strip().lower()
    if s in SEVERITY:
        return SEVERITY[s]
    try:  # escalas numéricas 1-10 o 0-1
        n = float(s)
        n = n * 10 if n <= 1 else n
        return "Crítica" if n >= 9 else "Alta" if n >= 7 else "Media" if n >= 4 else "Baja"
    except ValueError:
        return "Media"


def parse_country(v):
    s = (v or "").strip()
    if len(s) == 2:
        return s.upper()
    return COUNTRY_ISO.get(s.lower(), s)


def detect(headers, overrides):
    lower = {h.lower().strip(): h for h in headers}
    mapping = {}
    for field, names in CANDIDATES.items():
        if field in overrides:
            mapping[field] = overrides[field]
            continue
        mapping[field] = next((lower[n] for n in names if n in lower), None)
    return mapping


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv")
    ap.add_argument("--map", action="append", default=[], help='campo=Columna (ej: type="Attack Type")')
    ap.add_argument("--limit", type=int, default=0, help="máximo de filas (0 = todas)")
    ap.add_argument("--source", default="Kaggle")
    args = ap.parse_args()

    overrides = dict(m.split("=", 1) for m in args.map)
    with open(args.csv, newline="", encoding="utf-8-sig", errors="replace") as fh:
        reader = csv.DictReader(fh)
        mapping = detect(reader.fieldnames or [], overrides)
        print("Columnas detectadas:")
        for k, v in mapping.items():
            print(f"  {k:9} <- {v}")
        if not mapping["date"] or not mapping["type"]:
            sys.exit("ERROR: no se detectó la columna de fecha o de tipo. Usá --map date=... --map type=...")

        events, skipped = [], 0
        col = lambda row, f: row.get(mapping[f], "") if mapping[f] else ""
        for row in reader:
            d = parse_date(col(row, "date"))
            if not d:
                skipped += 1
                continue
            events.append({
                "date": d,
                "type": col(row, "type").strip() or "Desconocido",
                "severity": parse_severity(col(row, "severity")),
                "country": parse_country(col(row, "country")),
                "sector": col(row, "sector").strip() or "Desconocido",
                "target": col(row, "target").strip()[:120],
                "detail": col(row, "detail").strip()[:200],
                "source": args.source,
            })
            if args.limit and len(events) >= args.limit:
                break

    events.sort(key=lambda e: e["date"], reverse=True)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"events": events}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"\n{OUT.name}: {len(events)} eventos ({skipped} filas sin fecha válida descartadas)")


if __name__ == "__main__":
    main()
