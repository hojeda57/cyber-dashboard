import { COUNTRIES, SEVERITIES, SEV_COLORS, PALETTE, SOURCES, EXTERNAL_MAPS } from './config.js';

// ============================================================
//  Estado y utilidades
// ============================================================
const $ = (id) => document.getElementById(id);
const FILTER_KEYS = ['from', 'to', 'type', 'severity', 'country', 'sector', 'source', 'q'];
const LABELS = { from: 'Desde', to: 'Hasta', type: 'Tipo', severity: 'Severidad', country: 'País', sector: 'Sector', source: 'Fuente', q: 'Texto' };

const state = {
  events: [],
  kev: [],
  filters: Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])),
  charts: {},
  map: null,
  layer: null,
};

const countryName = (c) => COUNTRIES[c]?.[0] || c || '—';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmt = (n) => Number(n).toLocaleString('es-AR');
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function countBy(list, key) {
  const m = new Map();
  for (const e of list) {
    const k = typeof key === 'function' ? key(e) : e[key];
    if (k == null || k === '') continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

async function loadJSON(path, fallback = null) {
  try {
    const r = await fetch(path, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (err) {
    console.warn(`No se pudo cargar ${path}:`, err);
    return fallback;
  }
}

// ============================================================
//  Gráficos (Chart.js)
// ============================================================
Chart.defaults.color = '#8b95a7';
Chart.defaults.borderColor = '#243049';
Chart.defaults.font.family = '"Segoe UI", Roboto, system-ui, sans-serif';
Chart.defaults.plugins.legend.labels.boxWidth = 12;

function drawChart(id, config) {
  state.charts[id]?.destroy();
  state.charts[id] = new Chart($(id), config);
}

const pointer = (onPick) => (evt, els) => { evt.native.target.style.cursor = onPick && els.length ? 'pointer' : 'default'; };

function barConfig(entries, { horizontal = false, color = '#00e5ff', label = (k) => k, onPick } = {}) {
  return {
    type: 'bar',
    data: {
      labels: entries.map(([k]) => label(k)),
      datasets: [{ data: entries.map(([, v]) => v), backgroundColor: color, borderRadius: 4 }],
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      onClick: (evt, els) => { if (onPick && els.length) onPick(entries[els[0].index][0]); },
      onHover: pointer(onPick),
    },
  };
}

function doughnutConfig(entries, { colors = PALETTE, onPick } = {}) {
  return {
    type: 'doughnut',
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{ data: entries.map(([, v]) => v), backgroundColor: colors, borderColor: '#121826', borderWidth: 2 }],
    },
    options: {
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: { legend: { position: 'right' } },
      onClick: (evt, els) => { if (onPick && els.length) onPick(entries[els[0].index][0]); },
      onHover: pointer(onPick),
    },
  };
}

// ============================================================
//  Filtros
// ============================================================
function filtered() {
  const f = state.filters;
  const q = f.q.trim().toLowerCase();
  return state.events.filter((e) =>
    (!f.from || e.day >= f.from) &&
    (!f.to || e.day <= f.to) &&
    (!f.type || e.type === f.type) &&
    (!f.severity || e.severity === f.severity) &&
    (!f.country || e.country === f.country) &&
    (!f.sector || e.sector === f.sector) &&
    (!f.source || e.source === f.source) &&
    (!q || e._text.includes(q)));
}

function setFilter(key, value) {
  state.filters[key] = value ?? '';
  const input = $(`f-${key}`);
  if (input) input.value = state.filters[key];
  renderAll();
}

const toggleFilter = (key) => (value) => setFilter(key, state.filters[key] === value ? '' : value);

function fillSelect(id, values, label = (v) => v) {
  const sel = $(id);
  const first = sel.options[0];
  sel.innerHTML = '';
  sel.appendChild(first);
  for (const v of values) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label(v);
    sel.appendChild(o);
  }
}

function populateFilters() {
  const uniq = (k) => [...new Set(state.events.map((e) => e[k]).filter(Boolean))];
  fillSelect('f-type', uniq('type').sort());
  fillSelect('f-severity', SEVERITIES.filter((s) => uniq('severity').includes(s)));
  fillSelect('f-country', uniq('country').sort((a, b) => countryName(a).localeCompare(countryName(b))), (c) => countryName(c));
  fillSelect('f-sector', uniq('sector').sort());
  fillSelect('f-source', uniq('source').sort());

  const days = state.events.map((e) => e.day).sort();
  if (days.length) {
    for (const id of ['f-from', 'f-to']) { $(id).min = days[0]; $(id).max = days.at(-1); }
  }

  for (const k of FILTER_KEYS) {
    const el = $(`f-${k}`);
    el.value = state.filters[k];
    const handler = () => { state.filters[k] = el.value; renderAll(); };
    el.addEventListener(k === 'q' ? 'input' : 'change', k === 'q' ? debounce(handler) : handler);
  }

  $('btn-reset').addEventListener('click', () => {
    for (const k of FILTER_KEYS) { state.filters[k] = ''; $(`f-${k}`).value = ''; }
    renderAll();
  });
  $('btn-export').addEventListener('click', exportCSV);
}

function renderChips() {
  const box = $('active-filters');
  box.innerHTML = '';
  for (const k of FILTER_KEYS) {
    const v = state.filters[k];
    if (!v) continue;
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `${LABELS[k]}: ${k === 'country' ? countryName(v) : v}`;
    chip.title = 'Quitar filtro';
    chip.addEventListener('click', () => setFilter(k, ''));
    box.appendChild(chip);
  }
}

// Filtros en la URL (#type=Ransomware&country=AR) -> enlaces compartibles
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  for (const k of FILTER_KEYS) if (p.has(k)) state.filters[k] = p.get(k);
}
function writeHash() {
  const p = new URLSearchParams();
  for (const k of FILTER_KEYS) if (state.filters[k]) p.set(k, state.filters[k]);
  const h = p.toString();
  history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search);
}

// ============================================================
//  Render del Resumen
// ============================================================
function renderKPIs(list) {
  $('kpi-total').textContent = fmt(list.length);
  $('kpi-crit').textContent = fmt(list.filter((e) => e.severity === 'Crítica').length);
  $('kpi-countries').textContent = fmt(new Set(list.map((e) => e.country).filter(Boolean)).size);
  $('kpi-toptype').textContent = countBy(list, 'type')[0]?.[0] || '—';
  $('kpi-ar').textContent = fmt(list.filter((e) => e.country === 'AR').length);
}

function initMap() {
  state.map = L.map('map', { worldCopyJump: true, minZoom: 2 }).setView([10, -20], 2);
  // Mapa base oscuro sin API key (Esri). Si falla, cambia a OpenStreetMap.
  const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap', maxZoom: 16,
  });
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 10,
  });
  let errors = 0;
  esri.on('tileerror', () => {
    if (++errors === 5 && state.map.hasLayer(esri)) { state.map.removeLayer(esri); osm.addTo(state.map); }
  });
  esri.addTo(state.map);
  L.control.layers({ 'Oscuro (Esri)': esri, 'OpenStreetMap': osm }, null, { position: 'topright' }).addTo(state.map);
  state.layer = L.layerGroup().addTo(state.map);
}

function renderMap(list) {
  state.layer.clearLayers();
  const by = new Map();
  for (const e of list) {
    if (!COUNTRIES[e.country]) continue;
    const o = by.get(e.country) || { total: 0, crit: 0, types: new Map() };
    o.total++;
    if (e.severity === 'Crítica') o.crit++;
    o.types.set(e.type, (o.types.get(e.type) || 0) + 1);
    by.set(e.country, o);
  }
  const max = Math.max(1, ...[...by.values()].map((o) => o.total));
  for (const [code, o] of by) {
    const [name, lat, lon] = COUNTRIES[code];
    const ratio = o.crit / o.total;
    const color = ratio > 0.4 ? SEV_COLORS['Crítica'] : ratio > 0.2 ? SEV_COLORS['Alta'] : '#00e5ff';
    const top = [...o.types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([t, n]) => `${esc(t)}: ${fmt(n)}`).join('<br>');
    L.circleMarker([lat, lon], {
      radius: 5 + 25 * Math.sqrt(o.total / max),
      color, fillColor: color, fillOpacity: 0.35, weight: code === state.filters.country ? 3 : 1.5,
    })
      .bindTooltip(`<b>${esc(name)}</b><br>${fmt(o.total)} eventos · ${fmt(o.crit)} críticos<hr style="border-color:#243049">${top}`)
      .on('click', () => toggleFilter('country')(code))
      .addTo(state.layer);
  }
}

function renderCharts(list) {
  const sev = SEVERITIES.map((s) => [s, list.filter((e) => e.severity === s).length]).filter(([, n]) => n);
  drawChart('ch-severity', doughnutConfig(sev, { colors: sev.map(([s]) => SEV_COLORS[s]), onPick: toggleFilter('severity') }));
  drawChart('ch-source', doughnutConfig(countBy(list, 'source'), { onPick: toggleFilter('source') }));

  // Línea de tiempo apilada por severidad
  const days = [...new Set(list.map((e) => e.day))].sort();
  const idx = new Map(days.map((d, i) => [d, i]));
  const series = Object.fromEntries(SEVERITIES.map((s) => [s, new Array(days.length).fill(0)]));
  for (const e of list) if (series[e.severity]) series[e.severity][idx.get(e.day)]++;
  drawChart('ch-timeline', {
    type: 'bar',
    data: {
      labels: days,
      datasets: SEVERITIES.map((s) => ({ label: s, data: series[s], backgroundColor: SEV_COLORS[s], stack: 'sev' })),
    },
    options: {
      maintainAspectRatio: false,
      scales: { x: { stacked: true, ticks: { maxTicksLimit: 15 } }, y: { stacked: true } },
      plugins: { tooltip: { mode: 'index', intersect: false } },
      onClick: (evt, els) => {
        if (!els.length) return;
        const d = days[els[0].index];
        state.filters.from = state.filters.to = d;
        $('f-from').value = $('f-to').value = d;
        renderAll();
      },
      onHover: pointer(true),
    },
  });

  drawChart('ch-type', barConfig(countBy(list, 'type').slice(0, 12), { horizontal: true, color: '#7b61ff', onPick: toggleFilter('type') }));
  drawChart('ch-sector', barConfig(countBy(list, 'sector').slice(0, 12), { horizontal: true, color: '#00e5ff', onPick: toggleFilter('sector') }));
  drawChart('ch-country', barConfig(countBy(list, 'country').slice(0, 10), { horizontal: true, color: '#ff8c42', label: countryName, onPick: toggleFilter('country') }));
}

const MAX_ROWS = 500;
function renderTable(list) {
  $('table-count').textContent = list.length > MAX_ROWS ? `(mostrando ${MAX_ROWS} de ${fmt(list.length)})` : `(${fmt(list.length)})`;
  $('events-body').innerHTML = list.slice(0, MAX_ROWS).map((e) => `
    <tr>
      <td>${esc(e.day)}</td>
      <td>${esc(e.type)}</td>
      <td><span class="sev sev-${esc(e.severity)}">${esc(e.severity)}</span></td>
      <td>${esc(countryName(e.country))}</td>
      <td>${esc(e.sector)}</td>
      <td>${esc(e.target)}</td>
      <td>${esc(e.detail)}</td>
      <td>${esc(e.source)}</td>
    </tr>`).join('') || '<tr><td colspan="8" class="muted">Sin resultados para los filtros elegidos.</td></tr>';
}

function renderAll() {
  const list = filtered();
  renderChips();
  renderKPIs(list);
  renderMap(list);
  renderCharts(list);
  renderTable(list);
  writeHash();
}

function exportCSV() {
  const cols = ['date', 'type', 'severity', 'country', 'sector', 'target', 'detail', 'source'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [cols.join(','), ...filtered().map((e) => cols.map((c) => q(e[c])).join(','))];
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `eventos_${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ============================================================
//  Shodan (opcional)
// ============================================================
function renderShodan(data) {
  if (!data?.total) return;
  $('shodan-card').hidden = false;
  $('shodan-total').textContent = `(${fmt(data.total)} hosts · ${esc(data.updated || '')})`;
  const toEntries = (arr) => (arr || []).map((x) => [String(x.value), x.count]);
  drawChart('ch-shodan-ports', barConfig(toEntries(data.ports), { color: '#e056fd', label: (p) => `Puerto ${p}` }));
  drawChart('ch-shodan-products', barConfig(toEntries(data.products), { horizontal: true, color: '#4ea8de' }));
}

// ============================================================
//  CISA KEV
// ============================================================
function initKEV() {
  const vendors = countBy(state.kev, 'vendorProject').map(([v]) => v);
  fillSelect('kev-vendor', vendors.slice().sort());
  const years = [...new Set(state.kev.map((k) => (k.dateAdded || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  fillSelect('kev-year', years);
  $('kev-q').addEventListener('input', debounce(renderKEV));
  for (const id of ['kev-vendor', 'kev-year', 'kev-ransom']) $(id).addEventListener('change', renderKEV);
  renderKEV();
}

function renderKEV() {
  const q = $('kev-q').value.trim().toLowerCase();
  const vendor = $('kev-vendor').value;
  const year = $('kev-year').value;
  const ransom = $('kev-ransom').checked;
  const list = state.kev.filter((k) =>
    (!vendor || k.vendorProject === vendor) &&
    (!year || (k.dateAdded || '').startsWith(year)) &&
    (!ransom || k.knownRansomwareCampaignUse === 'Known') &&
    (!q || k._text.includes(q)));

  $('kev-count').textContent = `(${fmt(list.length)})`;

  drawChart('ch-kev', barConfig(countBy(list, 'vendorProject').slice(0, 10), {
    horizontal: true, color: '#ff3b5c',
    onPick: (v) => { $('kev-vendor').value = $('kev-vendor').value === v ? '' : v; renderKEV(); },
  }));

  const months = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const byMonth = new Map(countBy(list, (k) => (k.dateAdded || '').slice(0, 7)));
  drawChart('ch-kev-month', barConfig(months.map((m) => [m, byMonth.get(m) || 0]), { color: '#ffd166' }));

  $('kev-body').innerHTML = list.slice(0, MAX_ROWS).map((k) => `
    <tr>
      <td>${esc(k.dateAdded)}</td>
      <td><a href="https://nvd.nist.gov/vuln/detail/${encodeURIComponent(k.cveID)}" target="_blank" rel="noopener">${esc(k.cveID)}</a></td>
      <td>${esc(k.vendorProject)}</td>
      <td>${esc(k.product)}</td>
      <td title="${esc(k.shortDescription)}">${esc(k.vulnerabilityName)}</td>
      <td><span class="tag ${k.knownRansomwareCampaignUse === 'Known' ? 'yes' : ''}">${k.knownRansomwareCampaignUse === 'Known' ? 'Sí' : 'No conocido'}</span></td>
      <td>${esc(k.dueDate)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="muted">Sin resultados.</td></tr>';
}

// ============================================================
//  Pestañas, fuentes y mapas externos
// ============================================================
function initTabs() {
  document.querySelectorAll('.tab').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${btn.dataset.tab}`));
    if (btn.dataset.tab === 'resumen') setTimeout(() => state.map.invalidateSize(), 50);
  }));
}

function renderStaticCards() {
  $('sources-list').innerHTML = SOURCES.map((s) => `
    <div class="card src-card">
      <h3>${esc(s.name)}</h3>
      <span class="badge">${esc(s.badge)}</span>
      <p>${esc(s.desc)}</p>
      <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>
    </div>`).join('');

  $('external-maps').innerHTML = EXTERNAL_MAPS.map((m) => `
    <div class="card src-card">
      <h3>${esc(m.name)}</h3>
      <p>${esc(new URL(m.url).hostname)}</p>
      <a class="btn" style="text-align:center;text-decoration:none" href="${esc(m.url)}" target="_blank" rel="noopener">Abrir mapa ↗</a>
    </div>`).join('');
}

function renderMeta(meta) {
  if (!meta) { $('last-update').textContent = 'Sin metadatos'; return; }
  const when = meta.updated ? new Date(meta.updated).toLocaleString('es-AR', { hour12: false, dateStyle: 'short', timeStyle: 'short' }) : '—';
  const feeds = Object.entries(meta.sources || {})
    .map(([name, s]) => `${name} ${s.ok ? '✔' : '✖'}`).join(' · ');
  $('last-update').textContent = `Actualizado: ${when}${feeds ? ' · ' + feeds : ''}`;
}

// ============================================================
//  Inicio
// ============================================================
async function init() {
  const [events, kev, meta, shodan] = await Promise.all([
    loadJSON('data/events.json', { events: [] }),
    loadJSON('data/kev.json', []),
    loadJSON('data/meta.json'),
    loadJSON('data/shodan.json'),
  ]);

  state.events = (events.events || events)
    .filter((e) => e && e.date)
    .map((e) => ({
      ...e,
      day: String(e.date).slice(0, 10),
      country: (e.country || '').toUpperCase(),
      _text: [e.type, e.target, e.detail, e.sector, e.source, countryName((e.country || '').toUpperCase())].join(' ').toLowerCase(),
    }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));

  state.kev = (kev.vulnerabilities || kev)
    .map((k) => ({ ...k, _text: [k.cveID, k.vendorProject, k.product, k.vulnerabilityName, k.shortDescription].join(' ').toLowerCase() }))
    .sort((a, b) => ((a.dateAdded || '') < (b.dateAdded || '') ? 1 : -1));

  readHash();
  renderMeta(meta);
  renderStaticCards();
  initTabs();
  initMap();
  populateFilters();
  renderAll();
  initKEV();
  renderShodan(shodan);
}

init();
