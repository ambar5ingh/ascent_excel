/* ═══════════════════════════════════════════════════════
   ASCENT GHG Viewer — charts.js
   Plotly-based chart builders for each page
   ═══════════════════════════════════════════════════════ */

const PALETTE = {
  teal:   '#00a896',
  navy:   '#0d1e3d',
  amber:  '#f39c12',
  red:    '#e74c3c',
  blue:   '#2980b9',
  purple: '#8e44ad',
  green:  '#27ae60',
  grey:   '#95a5a6',
};

const SECTOR_COLORS = {
  'Energy Sector': '#2980b9',
  'Transport':     '#f39c12',
  'Waste':         '#8e44ad',
  'Wastewater':    '#00a896',
  'AFOLU':         '#27ae60',
  'IPPU':          '#e74c3c',
  'Other':         '#95a5a6',
};

const LAYOUT_BASE = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  margin:        { t: 20, r: 20, b: 50, l: 60 },
  font:          { family: 'Inter, Segoe UI, sans-serif', size: 12, color: '#1c2b3a' },
  legend:        { orientation: 'h', y: -0.18, x: 0, font: { size: 11 } },
  xaxis:         { gridcolor: '#eef0f4', tickfont: { size: 11 } },
  yaxis:         { gridcolor: '#eef0f4', tickfont: { size: 11 } },
};

const CONFIG = { displayModeBar: false, responsive: true };

function fmt(v, digits=2) {
  if (v == null || isNaN(v)) return '—';
  if (Math.abs(v) >= 1e6) return (v/1e6).toFixed(digits) + ' Mt';
  if (Math.abs(v) >= 1e3) return (v/1e3).toFixed(digits) + ' kt';
  return v.toFixed(digits) + ' t';
}

function fmtMt(v, d=2) {
  if (v == null || isNaN(v)) return '—';
  return (v/1e6).toFixed(d);
}

function pct(a, b) {
  if (!b) return 0;
  return ((a - b) / b * 100).toFixed(1);
}

/* ────────────────────────────────────────────────────────
   BAU PROFILE CHARTS
──────────────────────────────────────────────────────── */

function drawSectorPie(elementId, sectorTotals) {
  const sectors = Object.keys(sectorTotals).filter(s => sectorTotals[s].base > 0);
  const values  = sectors.map(s => sectorTotals[s].base);
  const colors  = sectors.map(s => SECTOR_COLORS[s] || PALETTE.grey);

  Plotly.newPlot(elementId, [{
    type:    'pie',
    labels:  sectors,
    values:  values,
    marker:  { colors },
    textinfo: 'label+percent',
    hovertemplate: '<b>%{label}</b><br>%{value:,.0f} tCO₂e<br>%{percent}<extra></extra>',
    hole:    0.4,
  }], {
    ...LAYOUT_BASE,
    margin: { t: 10, r: 10, b: 10, l: 10 },
    showlegend: true,
    legend: { orientation: 'h', y: -0.12, x: 0 },
  }, CONFIG);
}

function drawSectorBar(elementId, dashboard, years) {
  // Group by sector, subsector → stacked bar per milestone year
  const milestones = ['base', 'y2030', 'y2040', 'y2050'];
  const yearLabels = ['Base Year', '2030', '2040', '2050'];

  // Collect all unique subsectors per sector
  const map = {};
  dashboard.forEach(row => {
    const key = `${row.sector} – ${row.subsector}`;
    if (!map[key]) map[key] = { sector: row.sector, subsector: row.subsector, vals: [0,0,0,0] };
    milestones.forEach((m, i) => { map[key].vals[i] += (row[m] || 0); });
  });

  const traces = Object.values(map).map(item => ({
    name:  item.subsector,
    type:  'bar',
    x:     yearLabels,
    y:     item.vals.map(v => v / 1e6),
    marker: { color: SECTOR_COLORS[item.sector] || PALETTE.grey, opacity: 0.85 },
    hovertemplate: `<b>${item.subsector}</b><br>%{y:.3f} MtCO₂e<extra></extra>`,
  }));

  Plotly.newPlot(elementId, traces, {
    ...LAYOUT_BASE,
    barmode: 'stack',
    yaxis: { ...LAYOUT_BASE.yaxis, title: 'MtCO₂e' },
    legend: { orientation: 'h', y: -0.2 },
  }, CONFIG);
}

function drawSectorTrend(elementId, sectorTotals, years) {
  const sectors = Object.keys(sectorTotals).filter(s => (sectorTotals[s].base || 0) > 0);
  const xLabels = ['Base Year', '2030', '2040', '2050'];
  const keys    = ['base', 'y2030', 'y2040', 'y2050'];

  const traces = sectors.map(s => ({
    name: s,
    type: 'scatter',
    mode: 'lines+markers',
    x:    xLabels,
    y:    keys.map(k => (sectorTotals[s][k] || 0) / 1e6),
    line: { color: SECTOR_COLORS[s] || PALETTE.grey, width: 2.5 },
    marker: { size: 7 },
    hovertemplate: `<b>${s}</b><br>%{y:.3f} MtCO₂e<extra></extra>`,
  }));

  Plotly.newPlot(elementId, traces, {
    ...LAYOUT_BASE,
    yaxis: { ...LAYOUT_BASE.yaxis, title: 'MtCO₂e' },
  }, CONFIG);
}

function drawPerCapita(elementId, dashboard, population) {
  const keys    = ['base', 'y2030', 'y2040', 'y2050'];
  const xLabels = ['Base Year', '2030', '2040', '2050'];
  let totals = [0, 0, 0, 0];
  dashboard.forEach(r => keys.forEach((k, i) => { totals[i] += (r[k] || 0); }));
  const perCap = totals.map(v => population > 0 ? v / population : 0);

  Plotly.newPlot(elementId, [{
    type: 'bar',
    x: xLabels,
    y: perCap,
    marker: { color: [PALETTE.teal, PALETTE.blue, PALETTE.amber, PALETTE.red] },
    text: perCap.map(v => v.toFixed(2) + ' t'),
    textposition: 'outside',
    hovertemplate: '<b>%{x}</b><br>%{y:.3f} tCO₂e/person<extra></extra>',
  }], {
    ...LAYOUT_BASE,
    yaxis: { ...LAYOUT_BASE.yaxis, title: 'tCO₂e per capita' },
  }, CONFIG);
}

/* ────────────────────────────────────────────────────────
   TARGET SETTING CHARTS
──────────────────────────────────────────────────────── */

function drawTargetTrajectory(elementId, targets) {
  const years = Object.keys(targets).map(Number).sort();
  const bauY  = years.map(y => targets[y].bau);
  const tgtY  = years.map(y => targets[y].allowable);

  Plotly.newPlot(elementId, [
    {
      name: 'BAU Trajectory',
      type: 'scatter', mode: 'lines+markers',
      x: years, y: bauY,
      line: { color: PALETTE.red, width: 2.5, dash: 'dot' },
      marker: { size: 8 },
      hovertemplate: 'BAU %{x}: <b>%{y:.2f} MtCO₂e</b><extra></extra>',
    },
    {
      name: 'Allowable / Target',
      type: 'scatter', mode: 'lines+markers',
      x: years, y: tgtY,
      line: { color: PALETTE.teal, width: 2.5 },
      marker: { size: 8 },
      fill: 'tonexty',
      fillcolor: 'rgba(231,76,60,0.08)',
      hovertemplate: 'Target %{x}: <b>%{y:.2f} MtCO₂e</b><extra></extra>',
    },
  ], {
    ...LAYOUT_BASE,
    yaxis: { ...LAYOUT_BASE.yaxis, title: 'MtCO₂e' },
    xaxis: { ...LAYOUT_BASE.xaxis, title: 'Year', dtick: 5 },
    legend: { orientation: 'h', y: -0.2 },
  }, CONFIG);
}

function drawTargetWaterfall(elementId, targets) {
  const years = [2025, 2030, 2040, 2050].filter(y => targets[y]);
  const measures = ['absolute', ...years.slice(1).map(() => 'relative')];
  const values   = [];
  const text     = [];

  let prev = targets[years[0]]?.bau || 0;
  values.push(prev);
  text.push(prev.toFixed(2) + ' Mt');

  years.slice(1).forEach(y => {
    const cur = targets[y]?.allowable ?? 0;
    const diff = cur - prev;
    values.push(diff);
    text.push((diff > 0 ? '+' : '') + diff.toFixed(2) + ' Mt');
    prev = cur;
  });

  Plotly.newPlot(elementId, [{
    type: 'waterfall',
    orientation: 'v',
    measure: measures,
    x: years,
    y: values,
    text, textposition: 'outside',
    connector: { line: { color: PALETTE.navy, width: 1, dash: 'dot' } },
    increasing: { marker: { color: PALETTE.red } },
    decreasing: { marker: { color: PALETTE.green } },
    totals:     { marker: { color: PALETTE.teal } },
    hovertemplate: '%{x}: <b>%{y:.2f} Mt</b><extra></extra>',
  }], {
    ...LAYOUT_BASE,
    yaxis: { ...LAYOUT_BASE.yaxis, title: 'MtCO₂e' },
  }, CONFIG);
}

/* ────────────────────────────────────────────────────────
   DASHBOARD BAU CHARTS
──────────────────────────────────────────────────────── */

function drawDashGroupedBar(elementId, sectorTotals) {
  const sectors = Object.keys(sectorTotals);
  const keys    = ['base', 'y2030', 'y2040', 'y2050'];
  const labels  = ['Base Year', '2030', '2040', '2050'];
  const colors  = [PALETTE.teal, PALETTE.blue, PALETTE.amber, PALETTE.red];

  const traces = labels.map((lbl, li) => ({
    name: lbl,
    type: 'bar',
    x:    sectors,
    y:    sectors.map(s => (sectorTotals[s][keys[li]] || 0) / 1e6),
    marker: { color: colors[li] },
    hovertemplate: `<b>${lbl}</b> – %{x}<br>%{y:.3f} MtCO₂e<extra></extra>`,
  }));

  Plotly.newPlot(elementId, traces, {
    ...LAYOUT_BASE,
    barmode: 'group',
    yaxis: { ...LAYOUT_BASE.yaxis, title: 'MtCO₂e' },
    xaxis: { ...LAYOUT_BASE.xaxis, tickangle: -20 },
  }, CONFIG);
}

function drawDashSankey(elementId, dashboard) {
  // Build a simple flow: sectors → subsectors at base year
  const sectors    = [...new Set(dashboard.map(r => r.sector).filter(Boolean))];
  const subsectors = [...new Set(dashboard.map(r => r.subsector).filter(Boolean))];
  const allNodes   = [...sectors, ...subsectors];
  const idxOf = n => allNodes.indexOf(n);

  const source = [], target = [], value = [], label = [];
  allNodes.forEach(n => label.push(n));

  dashboard.forEach(r => {
    if ((r.base || 0) > 0) {
      source.push(idxOf(r.sector));
      target.push(idxOf(r.subsector));
      value.push(r.base / 1e6);
    }
  });

  Plotly.newPlot(elementId, [{
    type: 'sankey',
    orientation: 'h',
    node: {
      pad: 15, thickness: 20,
      label,
      color: allNodes.map((n, i) => {
        if (SECTOR_COLORS[n]) return SECTOR_COLORS[n];
        // subsector: inherit sector color with opacity
        const row = dashboard.find(r => r.subsector === n);
        return row ? (SECTOR_COLORS[row.sector] || PALETTE.grey) + 'bb' : PALETTE.grey + 'bb';
      }),
    },
    link: { source, target, value,
      color: source.map(s => (Object.values(SECTOR_COLORS)[s % 6] || PALETTE.grey) + '44'),
    },
  }], {
    ...LAYOUT_BASE,
    margin: { t: 10, r: 20, b: 10, l: 20 },
  }, CONFIG);
}

/* ────────────────────────────────────────────────────────
   EMISSION REDUCTION CHARTS
──────────────────────────────────────────────────────── */

function drawERTimeline(elementId, timeline) {
  const years = [2025, 2030, 2040, 2050];
  const scenarios = {
    'BAU':            { color: PALETTE.red,    dash: 'dot',   key: 'BAU' },
    'E&P Scenario':   { color: PALETTE.blue,   dash: 'solid', key: 'E&P' },
    'High Ambition':  { color: PALETTE.purple, dash: 'solid', key: 'High - Ambition' },
    'Target':         { color: PALETTE.green,  dash: 'dash',  key: 'Target' },
  };

  const traces = Object.entries(scenarios)
    .filter(([, cfg]) => timeline[cfg.key] && timeline[cfg.key].length >= 4)
    .map(([name, cfg]) => ({
      name,
      type: 'scatter', mode: 'lines+markers',
      x: years,
      y: timeline[cfg.key],
      line:   { color: cfg.color, width: 2.5, dash: cfg.dash },
      marker: { size: 8, color: cfg.color },
      hovertemplate: `<b>${name}</b> %{x}: %{y:.2f} MtCO₂e<extra></extra>`,
    }));

  Plotly.newPlot(elementId, traces, {
    ...LAYOUT_BASE,
    yaxis: { ...LAYOUT_BASE.yaxis, title: 'MtCO₂e', rangemode: 'tozero' },
    xaxis: { ...LAYOUT_BASE.xaxis, title: 'Year', tickvals: years },
    legend: { orientation: 'h', y: -0.22 },
  }, CONFIG);
}

function drawERSectorBar(elementId, subsectors, yearKey) {
  // yearKey: '2030' | '2040' | '2050'
  const yr = yearKey;
  const sectors = [...new Set(subsectors.map(r => r.sector))];

  const bauKey    = `bau_${yr}`;
  const epAbsKey  = `ep_abs_${yr}`;
  const ambAbsKey = `amb_abs_${yr}`;

  const bauVals   = sectors.map(s => subsectors.filter(r => r.sector===s).reduce((a,r) => a+(r[bauKey]||0),0)/1e6);
  const epVals    = sectors.map(s => subsectors.filter(r => r.sector===s).reduce((a,r) => a+(r[epAbsKey]||0),0)/1e6);
  const ambVals   = sectors.map(s => subsectors.filter(r => r.sector===s).reduce((a,r) => a+(r[ambAbsKey]||0),0)/1e6);

  Plotly.newPlot(elementId, [
    { name: `BAU ${yr}`,      type:'bar', x:sectors, y:bauVals,  marker:{color:PALETTE.red},    hovertemplate:'BAU: %{y:.3f} Mt<extra></extra>' },
    { name: `E&P ${yr}`,      type:'bar', x:sectors, y:epVals,   marker:{color:PALETTE.blue},   hovertemplate:'E&P reduction: %{y:.3f} Mt<extra></extra>' },
    { name: `Ambitious ${yr}`,type:'bar', x:sectors, y:ambVals,  marker:{color:PALETTE.purple}, hovertemplate:'Ambitious reduction: %{y:.3f} Mt<extra></extra>' },
  ], {
    ...LAYOUT_BASE,
    barmode: 'group',
    yaxis: { ...LAYOUT_BASE.yaxis, title: 'MtCO₂e' },
    xaxis: { ...LAYOUT_BASE.xaxis, tickangle: -20 },
  }, CONFIG);
}

function drawERGapChart(elementId, subsectors) {
  const labels  = subsectors.map(r => r.subsector);
  const gap2030 = subsectors.map(r => ((r.bau_2030||0) - (r.amb_abs_2030||0)) / 1e6);
  const gap2050 = subsectors.map(r => ((r.bau_2050||0) - (r.amb_abs_2050||0)) / 1e6);

  Plotly.newPlot(elementId, [
    { name:'Gap 2030', type:'bar', orientation:'h', y:labels, x:gap2030, marker:{color:PALETTE.amber}, hovertemplate:'Gap 2030: %{x:.3f} Mt<extra></extra>' },
    { name:'Gap 2050', type:'bar', orientation:'h', y:labels, x:gap2050, marker:{color:PALETTE.red},   hovertemplate:'Gap 2050: %{x:.3f} Mt<extra></extra>' },
  ], {
    ...LAYOUT_BASE,
    barmode: 'group',
    margin: { t:20, r:30, b:50, l:160 },
    xaxis: { ...LAYOUT_BASE.xaxis, title:'MtCO₂e reduction gap' },
    yaxis: { ...LAYOUT_BASE.yaxis, tickfont:{size:10} },
  }, CONFIG);
}

/* ────────────────────────────────────────────────────────
   UPLOAD PAGE UX
──────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Drag-and-drop for upload
  const drop    = document.getElementById('dropZone');
  const fileIn  = document.getElementById('fileInput');
  const fileNm  = document.getElementById('fileName');
  const submitB = document.getElementById('submitBtn');
  const form    = document.getElementById('uploadForm');

  if (!drop) return;  // not on upload page

  ['dragenter','dragover'].forEach(ev => {
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(ev => {
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragover'); });
  });
  drop.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files.length) {
      fileIn.files = files;
      updateFileName(files[0].name);
    }
  });
  fileIn.addEventListener('change', () => {
    if (fileIn.files.length) updateFileName(fileIn.files[0].name);
  });

  function updateFileName(name) {
    fileNm.textContent = '📎 ' + name;
    submitB.disabled = false;
  }

  form.addEventListener('submit', () => {
    submitB.disabled = true;
    submitB.textContent = 'Parsing…';
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('active');
  });
});
