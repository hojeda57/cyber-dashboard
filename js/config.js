// ============================================================
//  Configuración: países, colores, fuentes y mapas externos
// ============================================================

// ISO2 -> [nombre, lat, lon] (centroides aproximados)
export const COUNTRIES = {
  AR: ['Argentina', -38.4, -63.6], BR: ['Brasil', -14.2, -51.9], CL: ['Chile', -35.7, -71.5],
  UY: ['Uruguay', -32.5, -55.8], PY: ['Paraguay', -23.4, -58.4], BO: ['Bolivia', -16.3, -63.6],
  PE: ['Perú', -9.2, -75.0], CO: ['Colombia', 4.6, -74.3], VE: ['Venezuela', 6.4, -66.6],
  EC: ['Ecuador', -1.8, -78.2], MX: ['México', 23.6, -102.6], US: ['Estados Unidos', 39.8, -98.6],
  CA: ['Canadá', 56.1, -106.3], PA: ['Panamá', 8.5, -80.8], CR: ['Costa Rica', 9.7, -83.8],
  GT: ['Guatemala', 15.8, -90.2], DO: ['Rep. Dominicana', 18.7, -70.2], CU: ['Cuba', 21.5, -77.8],
  BZ: ['Belice', 17.2, -88.5], VG: ['Islas Vírgenes Brit.', 18.4, -64.6],
  GB: ['Reino Unido', 55.4, -3.4], IE: ['Irlanda', 53.4, -8.2], FR: ['Francia', 46.2, 2.2],
  ES: ['España', 40.5, -3.7], PT: ['Portugal', 39.4, -8.2], DE: ['Alemania', 51.2, 10.5],
  IT: ['Italia', 41.9, 12.6], NL: ['Países Bajos', 52.1, 5.3], BE: ['Bélgica', 50.5, 4.5],
  LU: ['Luxemburgo', 49.8, 6.1], CH: ['Suiza', 46.8, 8.2], AT: ['Austria', 47.5, 14.6],
  SE: ['Suecia', 60.1, 18.6], NO: ['Noruega', 60.5, 8.5], FI: ['Finlandia', 61.9, 25.7],
  DK: ['Dinamarca', 56.3, 9.5], PL: ['Polonia', 51.9, 19.1], CZ: ['Chequia', 49.8, 15.5],
  SK: ['Eslovaquia', 48.7, 19.7], HU: ['Hungría', 47.2, 19.5], RO: ['Rumania', 45.9, 25.0],
  BG: ['Bulgaria', 42.7, 25.5], RS: ['Serbia', 44.0, 21.0], GR: ['Grecia', 39.1, 21.8],
  LT: ['Lituania', 55.2, 23.9], LV: ['Letonia', 56.9, 24.6], EE: ['Estonia', 58.6, 25.0],
  MD: ['Moldavia', 47.4, 28.4], UA: ['Ucrania', 48.4, 31.2], RU: ['Rusia', 61.5, 105.3],
  TR: ['Turquía', 38.9, 35.2], IL: ['Israel', 31.0, 34.9], IR: ['Irán', 32.4, 53.7],
  SA: ['Arabia Saudita', 23.9, 45.1], AE: ['Emiratos Árabes', 23.4, 53.8], EG: ['Egipto', 26.8, 30.8],
  MA: ['Marruecos', 31.8, -7.1], NG: ['Nigeria', 9.1, 8.7], KE: ['Kenia', -0.02, 37.9],
  ZA: ['Sudáfrica', -30.6, 22.9], SC: ['Seychelles', -4.7, 55.5], IN: ['India', 20.6, 79.0],
  PK: ['Pakistán', 30.4, 69.3], CN: ['China', 35.9, 104.2], HK: ['Hong Kong', 22.3, 114.2],
  TW: ['Taiwán', 23.7, 121.0], JP: ['Japón', 36.2, 138.3], KR: ['Corea del Sur', 35.9, 127.8],
  KP: ['Corea del Norte', 40.3, 127.5], SG: ['Singapur', 1.35, 103.8], VN: ['Vietnam', 14.1, 108.3],
  TH: ['Tailandia', 15.9, 101.0], ID: ['Indonesia', -0.8, 113.9], MY: ['Malasia', 4.2, 102.0],
  PH: ['Filipinas', 12.9, 121.8], AU: ['Australia', -25.3, 133.8], NZ: ['Nueva Zelanda', -40.9, 174.9],
};

export const SEVERITIES = ['Crítica', 'Alta', 'Media', 'Baja'];
export const SEV_COLORS = { 'Crítica': '#ff3b5c', 'Alta': '#ff8c42', 'Media': '#ffd166', 'Baja': '#06d6a0' };
export const PALETTE = ['#00e5ff', '#7b61ff', '#ff3b5c', '#ffd166', '#06d6a0', '#ff8c42', '#4ea8de', '#e056fd', '#a3e635', '#94a3b8'];

// Fuentes (pestaña "Fuentes")
export const SOURCES = [
  { name: 'ransomware.live', badge: 'Feed en vivo', url: 'https://www.ransomware.live/',
    desc: 'Víctimas publicadas en sitios de filtración de grupos de ransomware (país, sector, grupo).' },
  { name: 'abuse.ch Feodo Tracker', badge: 'Feed en vivo', url: 'https://feodotracker.abuse.ch/',
    desc: 'Servidores C2 de botnets (Emotet, QakBot, Dridex, etc.) con país y ASN.' },
  { name: 'CISA KEV', badge: 'Feed en vivo', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    desc: 'Catálogo de vulnerabilidades explotadas activamente, con uso en ransomware.' },
  { name: 'Kaggle', badge: 'Dataset', url: 'https://www.kaggle.com/datasets/tannubarot/cybersecurity-attack-and-defence-dataset',
    desc: 'Cybersecurity Attack and Defence Dataset. Convertilo con scripts/kaggle_to_json.py.' },
  { name: 'Kaspersky Cybermap', badge: 'Mapa embebido', url: 'https://cybermap.kaspersky.com/es',
    desc: 'Mapa interactivo en tiempo real y estadísticas por país.' },
  { name: 'Fortinet FortiGuard', badge: 'Mapa externo', url: 'https://www.fortinet.com/lat/fortiguard/threat-intelligence/threat-map',
    desc: 'Threat Map de FortiGuard Labs con actividad maliciosa global.' },
  { name: 'Shodan', badge: 'API (opcional)', url: 'https://www.shodan.io/',
    desc: 'Dispositivos expuestos en Internet. Con SHODAN_API_KEY el workflow genera estadísticas de Argentina.' },
  { name: 'Intelligence X', badge: 'Consulta manual', url: 'https://intelx.io/',
    desc: 'Búsqueda de filtraciones y credenciales expuestas (API paga, no automatizado).' },
  { name: 'Centro Nacional de Ciberseguridad', badge: 'Oficial AR', url: 'https://www.argentina.gob.ar/ciberseguridad',
    desc: 'Directrices, alertas y medidas para infraestructuras críticas en Argentina.' },
];

// Mapas que bloquean iframes -> se abren en pestaña nueva
export const EXTERNAL_MAPS = [
  { name: 'Fortinet FortiGuard Threat Map', url: 'https://www.fortinet.com/lat/fortiguard/threat-intelligence/threat-map' },
  { name: 'Check Point ThreatCloud', url: 'https://threatmap.checkpoint.com/' },
  { name: 'Radware Live Threat Map', url: 'https://livethreatmap.radware.com/' },
  { name: 'Kaspersky – Estadísticas', url: 'https://cybermap.kaspersky.com/es/stats' },
  { name: 'Bitdefender Threat Map', url: 'https://threatmap.bitdefender.com/' },
  { name: 'ransomware.live – Mapa', url: 'https://www.ransomware.live/map' },
];
