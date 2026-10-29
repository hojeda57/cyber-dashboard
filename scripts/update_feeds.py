#!/usr/bin/env python3
"""
Descarga feeds públicos de amenazas y genera los JSON que consume el dashboard.

Salidas (carpeta data/):
  events.json  -> base_events.json (muestra o Kaggle) + ransomware.live + Feodo Tracker
  kev.json     -> catálogo CISA KEV
  meta.json    -> fecha de actualización y estado de cada feed
  shodan.json  -> (opcional) exposición en Argentina si existe SHODAN_API_KEY

Solo usa la biblioteca estándar de Python (no requiere pip install).
Si un feed falla, se conservan los datos anteriores de ese feed.
"""
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
HEADERS = {"User-Agent": "cyber-dashboard/1.0 (+https://github.com/hojeda57)"}
DAYS_WINDOW = int(os.getenv("DAYS_WINDOW", "90"))

SECTORS = {
    "Healthcare": "Salud", "Manufacturing": "Industria", "Technology": "Tecnología",
    "Education": "Educación", "Government": "Gobierno", "Public Sector": "Gobierno",
    "Financial Services": "Finanzas", "Finance": "Finanzas", "Business Services": "Servicios",
    "Construction": "Construcción", "Transportation/Logistics": "Transporte",
    "Transportation": "Transporte", "Energy": "Energía", "Retail": "Comercio",
    "Consumer Services": "Comercio", "Telecommunication": "Telecomunicaciones",
    "Agriculture and Food Production": "Agroalimentos", "Hospitality and Tourism": "Turismo",
    "Not Found": "Desconocido", "": "Desconocido",
}


def get_json(url, timeout=60):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def load(name, default):
    p = DATA / name
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default


def save(name, obj):
    DATA.mkdir(exist_ok=True)
    (DATA / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def day(value):
    """Devuelve 'YYYY-MM-DD' a partir de varios formatos de fecha, o None."""
    if not value:
        return None
    s = str(value).strip()[:10]
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return s
    except ValueError:
        return None


# ------------------------------------------------------------------ feeds
def fetch_ransomware():
    last_err = None
    for url in ("https://api.ransomware.live/v2/recentvictims",
                "https://api.ransomware.live/recentvictims"):
        try:
            data = get_json(url)
            break
        except Exception as e:  # probar el siguiente endpoint
            last_err = e
    else:
        raise last_err

    out = []
    for v in data:
        d = day(v.get("attackdate") or v.get("discovered") or v.get("published"))
        if not d:
            continue
        activity = v.get("activity") or ""
        out.append({
            "date": d,
            "type": "Ransomware",
            "severity": "Crítica",
            "country": (v.get("country") or "").upper()[:2],
            "sector": SECTORS.get(activity, activity),
            "target": v.get("victim") or v.get("post_title") or "—",
            "detail": f"Grupo: {v.get('group') or v.get('group_name') or '?'}",
            "source": "ransomware.live",
        })
    return out


def fetch_feodo():
    data = get_json("https://feodotracker.abuse.ch/downloads/ipblocklist.json")
    out = []
    for x in data:
        d = day(x.get("last_online") or x.get("first_seen"))
        if not d:
            continue
        out.append({
            "date": d,
            "type": "Botnet C2",
            "severity": "Alta" if x.get("status") == "online" else "Media",
            "country": (x.get("country") or "").upper()[:2],
            "sector": "Hosting / ISP",
            "target": f"{x.get('ip_address')}:{x.get('port')}",
            "detail": f"{x.get('malware') or '?'} · {x.get('as_name') or ''}".strip(" ·"),
            "source": "abuse.ch Feodo",
        })
    return out


def fetch_kev():
    data = get_json("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json")
    keys = ["cveID", "vendorProject", "product", "vulnerabilityName", "dateAdded",
            "shortDescription", "dueDate", "knownRansomwareCampaignUse"]
    return [{k: v.get(k, "") for k in keys} for v in data.get("vulnerabilities", [])]


def fetch_shodan(key):
    params = urllib.parse.urlencode({"key": key, "query": "country:AR", "facets": "port:10,product:10"})
    data = get_json(f"https://api.shodan.io/shodan/host/count?{params}")
    facets = data.get("facets", {})
    return {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "query": "country:AR",
        "total": data.get("total", 0),
        "ports": facets.get("port", []),
        "products": facets.get("product", []),
    }


# ------------------------------------------------------------------ main
def main():
    meta = {"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "sources": {}}
    previous = load("events.json", {"events": []}).get("events", [])
    base = load("base_events.json", {"events": []}).get("events", [])
    cutoff = (datetime.now(timezone.utc) - timedelta(days=DAYS_WINDOW)).strftime("%Y-%m-%d")

    live = []
    for name, fn in (("ransomware.live", fetch_ransomware), ("abuse.ch Feodo", fetch_feodo)):
        try:
            rows = [r for r in fn() if r["date"] >= cutoff]
            meta["sources"][name] = {"ok": True, "count": len(rows)}
            print(f"[OK]  {name}: {len(rows)} eventos")
        except Exception as e:
            rows = [r for r in previous if r.get("source") == name]
            meta["sources"][name] = {"ok": False, "count": len(rows), "error": str(e)[:200]}
            print(f"[ERR] {name}: {e} (se conservan {len(rows)} eventos previos)")
        live.extend(rows)

    seen, merged = set(), []
    for e in base + live:
        k = (e.get("date"), e.get("source"), e.get("target"), e.get("type"))
        if k in seen:
            continue
        seen.add(k)
        merged.append(e)
    merged.sort(key=lambda e: e.get("date", ""), reverse=True)
    meta["sources"]["base"] = {"ok": True, "count": len(base)}
    save("events.json", {"generated": meta["updated"], "events": merged})
    print(f"events.json: {len(merged)} eventos")

    try:
        kev = fetch_kev()
        save("kev.json", kev)
        meta["sources"]["CISA KEV"] = {"ok": True, "count": len(kev)}
        print(f"[OK]  CISA KEV: {len(kev)} vulnerabilidades")
    except Exception as e:
        meta["sources"]["CISA KEV"] = {"ok": False, "count": len(load("kev.json", [])), "error": str(e)[:200]}
        print(f"[ERR] CISA KEV: {e} (se conserva kev.json anterior)")

    key = os.getenv("SHODAN_API_KEY", "").strip()
    if key:
        try:
            save("shodan.json", fetch_shodan(key))
            meta["sources"]["Shodan"] = {"ok": True}
            print("[OK]  Shodan")
        except Exception as e:
            meta["sources"]["Shodan"] = {"ok": False, "error": str(e)[:200]}
            print(f"[ERR] Shodan: {e}")

    save("meta.json", meta)


if __name__ == "__main__":
    main()
