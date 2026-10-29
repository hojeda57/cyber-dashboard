# Cyber Threat Dashboard

Dashboard interactivo y estático (GitHub Pages) sobre ataques cibernéticos, que combina varias fuentes:

| Fuente | Cómo se usa |
|---|---|
| **ransomware.live** | Feed en vivo de víctimas de ransomware (país, sector, grupo) |
| **abuse.ch Feodo Tracker** | Feed en vivo de servidores C2 de botnets |
| **CISA KEV** | Catálogo de vulnerabilidades explotadas activamente |
| **Kaggle** | Dataset histórico, convertido con `scripts/kaggle_to_json.py` |
| **Kaspersky** | Mapa en tiempo real embebido (widget oficial) |
| **Fortinet, Check Point, Radware, Bitdefender** | Enlaces a sus mapas (no permiten iframe) |
| **Shodan** | Opcional: exposición de hosts en Argentina con API key |
| **IntelX / CNCS Argentina** | Enlaces de referencia |

Funciones: filtros por fecha, tipo, severidad, país, sector, fuente y texto; mapa clicable; gráficos que filtran al hacer clic; filtros guardados en la URL (enlaces compartibles); exportación CSV; pestaña de CISA KEV con sus propios filtros.

## Estructura

```
cyber-dashboard/
├── index.html                  # Página principal (4 pestañas)
├── css/styles.css              # Tema oscuro
├── js/
│   ├── config.js               # Países, colores, fuentes, mapas externos
│   └── app.js                  # Carga de datos, filtros, mapa, gráficos, tablas
├── data/
│   ├── base_events.json        # Muestra sintética o Kaggle convertido
│   ├── events.json             # base + feeds en vivo (lo genera update_feeds.py)
│   ├── kev.json                # CISA KEV
│   ├── meta.json               # Fecha y estado de cada feed
│   └── shodan.json             # (opcional) si configurás SHODAN_API_KEY
├── scripts/
│   ├── update_feeds.py         # Descarga feeds (solo biblioteca estándar)
│   ├── generate_sample.py      # Genera datos sintéticos
│   └── kaggle_to_json.py       # Convierte un CSV de Kaggle
├── .github/workflows/
│   └── update-and-deploy.yml   # Actualiza cada 6 h y publica en Pages
├── .nojekyll
└── README.md
```

## Probar en local

```bash
cd cyber-dashboard
python3 scripts/update_feeds.py        # baja los feeds reales (necesita Internet)
python3 -m http.server 8000
# abrir http://localhost:8000
```

> Con doble clic sobre `index.html` (file://) no funciona: el navegador bloquea `fetch` de los JSON.

## Publicar en GitHub (cuenta hojeda57)

```bash
cd cyber-dashboard
git init -b main
git add .
git commit -m "Cyber Threat Dashboard inicial"
gh repo create hojeda57/cyber-dashboard --public --source=. --push
# sin gh CLI: crear el repo vacío en github.com y luego
# git remote add origin https://github.com/hojeda57/cyber-dashboard.git && git push -u origin main
```

Luego en GitHub:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. **Actions → "Actualizar feeds y publicar" → Run workflow** (primera carga de datos reales)
3. Abrir **https://hojeda57.github.io/cyber-dashboard/**

Desde ahí se actualiza solo cada 6 horas.

### Shodan (opcional)

**Settings → Secrets and variables → Actions → New repository secret**
Nombre: `SHODAN_API_KEY` — valor: tu clave. Aparece una tarjeta con puertos y productos más expuestos en Argentina.
Nunca pongas la clave en `js/`: todo lo que está en el frontend es público.

## Usar el dataset de Kaggle

```bash
pip install kaggle                     # requiere ~/.kaggle/kaggle.json
kaggle datasets download -d tannubarot/cybersecurity-attack-and-defence-dataset --unzip -p /tmp/kaggle
python3 scripts/kaggle_to_json.py /tmp/kaggle/*.csv --limit 5000
python3 scripts/update_feeds.py        # une Kaggle + feeds en vivo
git add data && git commit -m "data: dataset Kaggle" && git push
```

El script detecta columnas comunes; si no reconoce alguna, indicala:
`--map type="Attack Type" --map date=Timestamp --map severity="Severity Level"`

## Formato de evento

```json
{"date":"2026-10-28","type":"Ransomware","severity":"Crítica","country":"AR",
 "sector":"Salud","target":"empresa.com","detail":"Grupo: X","source":"ransomware.live"}
```

Severidades válidas: `Crítica`, `Alta`, `Media`, `Baja`. País en ISO-2 (los que no están en `js/config.js` no aparecen en el mapa pero sí en tablas y gráficos).

## Notas

- Los eventos de muestra son **sintéticos**; desactivalos borrando `data/base_events.json` o reemplazándolo con Kaggle.
- Ventana de feeds en vivo: 90 días (variable `DAYS_WINDOW`).
- Si un feed falla, se conservan sus datos anteriores y `meta.json` lo marca con ✖ en el encabezado.
