#!/usr/bin/env python3
"""
Genera data/base_events.json con eventos SINTÉTICOS (formato tipo Kaggle)
para que el dashboard funcione desde el primer momento.

Uso:  python scripts/generate_sample.py [cantidad] [dias]
"""
import json
import random
import sys
from datetime import date, timedelta
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "base_events.json"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 1800
DAYS = int(sys.argv[2]) if len(sys.argv) > 2 else 90
random.seed(57)

TYPES = {  # tipo: (peso, severidades posibles con peso)
    "Phishing":                    (22, {"Media": 5, "Alta": 3, "Baja": 2}),
    "DDoS":                        (15, {"Alta": 5, "Media": 4, "Crítica": 1}),
    "Malware":                     (14, {"Alta": 5, "Media": 3, "Crítica": 2}),
    "Fuerza bruta":                (12, {"Baja": 4, "Media": 5, "Alta": 1}),
    "SQL Injection":               (8,  {"Alta": 5, "Media": 3, "Crítica": 2}),
    "XSS":                         (7,  {"Media": 6, "Baja": 3, "Alta": 1}),
    "Explotación de vulnerabilidad": (8, {"Crítica": 4, "Alta": 5, "Media": 1}),
    "Filtración de datos":         (6,  {"Crítica": 5, "Alta": 4}),
    "Ransomware":                  (5,  {"Crítica": 9, "Alta": 1}),
    "Escaneo de puertos":          (3,  {"Baja": 8, "Media": 2}),
}
COUNTRIES = {"US": 20, "AR": 10, "BR": 9, "MX": 6, "DE": 6, "GB": 6, "ES": 5, "FR": 5,
             "IN": 5, "CL": 4, "CO": 4, "IT": 3, "JP": 3, "CA": 3, "AU": 3, "UY": 2,
             "PE": 2, "NL": 2, "RU": 2, "CN": 2, "KR": 2, "ZA": 2, "TR": 1, "UA": 1}
SECTORS = {"Gobierno": 14, "Finanzas": 13, "Salud": 11, "Educación": 10, "Tecnología": 12,
           "Industria": 10, "Energía": 6, "Telecomunicaciones": 6, "Comercio": 9,
           "Transporte": 5, "Defensa": 4}
DETAILS = {
    "Phishing": ["Campaña de suplantación bancaria", "Correo con adjunto malicioso", "Robo de credenciales O365"],
    "DDoS": ["Inundación UDP", "SYN flood", "Ataque HTTP/2 Rapid Reset"],
    "Malware": ["Infostealer detectado", "Troyano de acceso remoto", "Loader en macro de Office"],
    "Fuerza bruta": ["Intentos SSH masivos", "Ataque RDP", "Password spraying en VPN"],
    "SQL Injection": ["Payload UNION SELECT", "Inyección ciega por tiempo", "Bypass de login"],
    "XSS": ["XSS reflejado en buscador", "XSS almacenado en comentarios"],
    "Explotación de vulnerabilidad": ["Explotación de VPN SSL", "RCE en servidor web", "Exploit de firewall perimetral"],
    "Filtración de datos": ["Base de clientes publicada", "Credenciales en foro", "Bucket expuesto"],
    "Ransomware": ["Cifrado de servidores", "Doble extorsión", "Cifrado de hipervisor ESXi"],
    "Escaneo de puertos": ["Escaneo masivo de puertos", "Reconocimiento Shodan-like"],
}


def pick(weights):
    return random.choices(list(weights), weights=list(weights.values()))[0]


def main():
    today = date.today()
    events = []
    for _ in range(N):
        t = pick({k: v[0] for k, v in TYPES.items()})
        c = pick(COUNTRIES)
        d = today - timedelta(days=int(random.triangular(0, DAYS, 0)))
        events.append({
            "date": d.isoformat(),
            "type": t,
            "severity": pick(TYPES[t][1]),
            "country": c,
            "sector": pick(SECTORS),
            "target": f"srv-{random.randint(1, 254)}.{c.lower()}.example",
            "detail": random.choice(DETAILS[t]),
            "source": "Muestra (formato Kaggle)",
        })
    events.sort(key=lambda e: e["date"], reverse=True)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"events": events}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{OUT.name}: {len(events)} eventos sintéticos ({DAYS} días)")


if __name__ == "__main__":
    main()
