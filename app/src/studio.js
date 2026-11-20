// Palmera Cover Studio — the editor.
//
// Wires the page to the renderer: it holds the cover's state (size,
// layout, caption, and one fill / grade / framing per panel), loads the
// sample photos and any photos the reader adds — read locally with the
// FileReader API, never uploaded — and redraws the live preview on every
// change. The Export button renders the same state once more at full
// post size and downloads it as a PNG.

import {
  POST_SIZES, LAYOUTS, GRADES, SCENES,
  layoutPolygons, renderCover,
} from './render.js';

// The samples are the studio's own photographs, made with an image
// model for this app and free to use; they open the studio on a
// finished cover so the first export is one click away.
const SAMPLE_PHOTOS = [
  { src: 'samples/duo.jpg', name: 'Sample photo — the duo & the convertible' },
  { src: 'samples/skyline.jpg', name: 'Sample photo — neon skyline' },
  { src: 'samples/boat.jpg', name: 'Sample photo — speedboat' },
  { src: 'samples/beach.jpg', name: 'Sample photo — lifeguard tower' },
];

const photoFill = (index) => ({ type: 'photo', index });
const sceneFill = (id) => ({ type: 'scene', id });
const makePanel = (fill, grade) => ({ fill, grade, fx: 0.5, fy: 0.38, zoom: 1 });

// The house styles: each layout opens with fills that show it off.
function defaultPanels(layout, bucket) {
  if (layout === 'showcase' && bucket === 'wide') {
    return [
      makePanel(photoFill(0), 'sunset'),
      makePanel(photoFill(1), 'clean'),
      makePanel(sceneFill('sunset'), 'clean'),
      makePanel(photoFill(2), 'gold'),
    ];
  }
  if (layout === 'showcase' && bucket === 'portrait') {
    return [
      makePanel(photoFill(0), 'sunset'),
      makePanel(photoFill(3), 'gold'),
      makePanel(sceneFill('skyline'), 'clean'),
      makePanel(photoFill(2), 'clean'),
    ];
  }
  if (layout === 'showcase') {
    return [
      makePanel(photoFill(0), 'sunset'),
      makePanel(photoFill(1), 'clean'),
      makePanel(photoFill(2), 'gold'),
    ];
  }
  if (layout === 'mosaic') {
    return [
      makePanel(photoFill(3), 'gold'),
      makePanel(photoFill(0), 'sunset'),
      makePanel(photoFill(2), 'clean'),
      makePanel(sceneFill('sunset'), 'clean'),
    ];
  }
  return [
    makePanel(photoFill(0), 'sunset'),
    makePanel(photoFill(3), 'clean'),
    makePanel(photoFill(2), 'gold'),
  ];
}

const state = {
  size: 'portrait',
  layout: 'showcase',
  title: 'Neon Shores',
  tagline: 'One last ride down the coast.',
  badge: true,
  barcode: true,
  panels: defaultPanels('showcase', 'portrait'),
  selected: 0,
};

const photos = []; // HTMLImageElement per loaded photo, in list order
const photoNames = [];

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const ctx = canvas.getContext('2d');

function currentPanelCount() {
  return layoutPolygons(state.layout, state.size).length;
}

function reconcilePanels() {
  const count = currentPanelCount();
  const defaults = defaultPanels(state.layout, state.size);
  while (state.panels.length < count) state.panels.push(defaults[state.panels.length]);
  state.panels.length = count;
  if (state.selected >= count) state.selected = 0;
}

function redraw() {
  const { width, height } = POST_SIZES[state.size];
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  renderCover(ctx, width, height, state, photos);
  $('sizeReadout').textContent = `${width} × ${height} PNG`;
}

// ------------------------------------------------------------ chip rows

function buildChips(container, entries, current, onPick) {
  container.textContent = '';
  for (const [value, label] of entries) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = label;
    btn.setAttribute('aria-pressed', String(value === current));
    btn.addEventListener('click', () => onPick(value));
    container.appendChild(btn);
  }
}

function refreshControls() {
  buildChips($('layoutChips'),
    Object.entries(LAYOUTS).map(([key, def]) => [key, def.label]),
    state.layout,
    (layout) => { state.layout = layout; reconcilePanels(); refreshControls(); redraw(); });
  buildChips($('sizeChips'),
    Object.entries(POST_SIZES).map(([key, def]) => [key, def.label.split(' · ')[0]]),
    state.size,
    (size) => { state.size = size; reconcilePanels(); refreshControls(); redraw(); });
  buildChips($('panelChips'),
    state.panels.map((_, i) => [String(i), `Panel ${i + 1}`]),
    String(state.selected),
    (i) => { state.selected = Number(i); refreshControls(); });
  const panel = state.panels[state.selected];
  const fillSelect = $('fillSelect');
  fillSelect.textContent = '';
  photoNames.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = `photo:${i}`;
    opt.textContent = name.replace(/^Sample photo — /, 'Photo — ');
    fillSelect.appendChild(opt);
  });
  for (const [id, def] of Object.entries(SCENES)) {
    const opt = document.createElement('option');
    opt.value = `scene:${id}`;
    opt.textContent = def.label;
    fillSelect.appendChild(opt);
  }
  fillSelect.value = panel.fill.type === 'scene' ? `scene:${panel.fill.id}` : `photo:${panel.fill.index}`;
  const gradeSelect = $('gradeSelect');
  gradeSelect.textContent = '';
  for (const [id, def] of Object.entries(GRADES)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = def.label;
    gradeSelect.appendChild(opt);
  }
  gradeSelect.value = panel.grade;
  $('focusX').value = Math.round(panel.fx * 100);
  $('focusY').value = Math.round(panel.fy * 100);
  $('zoom').value = Math.round(panel.zoom * 100);
  $('focusXOut').textContent = `${Math.round(panel.fx * 100)}%`;
  $('focusYOut').textContent = `${Math.round(panel.fy * 100)}%`;
  $('zoomOut').textContent = `${panel.zoom.toFixed(2)}×`;
  const list = $('photoList');
  list.textContent = '';
  photoNames.forEach((name, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${name}`;
    list.appendChild(li);
  });
}

// ---------------------------------------------------------------- events

$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
$('badgeCheck').addEventListener('change', (e) => { state.badge = e.target.checked; redraw(); });
$('barcodeCheck').addEventListener('change', (e) => { state.barcode = e.target.checked; redraw(); });

$('fillSelect').addEventListener('change', (e) => {
  const [type, key] = e.target.value.split(':');
  state.panels[state.selected].fill = type === 'scene' ? sceneFill(key) : photoFill(Number(key));
  redraw();
});
$('gradeSelect').addEventListener('change', (e) => {
  state.panels[state.selected].grade = e.target.value;
  redraw();
});
$('focusX').addEventListener('input', (e) => {
  state.panels[state.selected].fx = Number(e.target.value) / 100;
  $('focusXOut').textContent = `${e.target.value}%`;
  redraw();
});
$('focusY').addEventListener('input', (e) => {
  state.panels[state.selected].fy = Number(e.target.value) / 100;
  $('focusYOut').textContent = `${e.target.value}%`;
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value) / 100;
  $('zoomOut').textContent = `${state.panels[state.selected].zoom.toFixed(2)}×`;
  redraw();
});

$('photoInput').addEventListener('change', (e) => {
  for (const file of e.target.files) addPhoto(URL.createObjectURL(file), `Your photo — ${file.name}`);
  e.target.value = '';
});

$('exportBtn').addEventListener('click', () => {
  const { width, height } = POST_SIZES[state.size];
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  renderCover(out.getContext('2d'), width, height, state, photos);
  out.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `palmera-cover-${state.size}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }, 'image/png');
});

// Dragging on the stage frames the panel under the pointer: press to
// select that panel, move to slide its photo's focal point.
function pointerPanel(event) {
  const rect = canvas.getBoundingClientRect();
  const nx = (event.clientX - rect.left) / rect.width;
  const ny = (event.clientY - rect.top) / rect.height;
  const polys = layoutPolygons(state.layout, state.size);
  for (let i = 0; i < polys.length; i++) {
    const poly = polys[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [ax, ay] = poly[a];
      const [bx, by] = poly[b];
      if ((ay > ny) !== (by > ny) && nx < ((bx - ax) * (ny - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return { index: i, nx, ny };
  }
  return null;
}

let dragStart = null;
canvas.addEventListener('pointerdown', (event) => {
  const hit = pointerPanel(event);
  if (!hit) return;
  state.selected = hit.index;
  const panel = state.panels[state.selected];
  dragStart = { nx: hit.nx, ny: hit.ny, fx: panel.fx, fy: panel.fy };
  canvas.setPointerCapture(event.pointerId);
  refreshControls();
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragStart) return;
  const hit = pointerPanel(event);
  if (!hit) return;
  const panel = state.panels[state.selected];
  panel.fx = Math.min(1, Math.max(0, dragStart.fx - (hit.nx - dragStart.nx)));
  panel.fy = Math.min(1, Math.max(0, dragStart.fy - (hit.ny - dragStart.ny)));
  $('focusX').value = Math.round(panel.fx * 100);
  $('focusY').value = Math.round(panel.fy * 100);
  $('focusXOut').textContent = `${Math.round(panel.fx * 100)}%`;
  $('focusYOut').textContent = `${Math.round(panel.fy * 100)}%`;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragStart = null; });

// ------------------------------------------------------------ photo load

function addPhoto(src, name) {
  const img = new Image();
  img.addEventListener('load', () => {
    photos.push(img);
    photoNames.push(name);
    refreshControls();
    redraw();
  });
  img.src = src;
}

// ----------------------------------------------------------------- start
//
// ?shot=cover renders one cover full-window (the way the screenshots in
// screenshots/ were framed); ?shot=editor opens the studio. Plain visits
// get the studio with the samples loaded.

const params = new URLSearchParams(location.search);
if (params.get('shot') === 'cover') {
  document.body.classList.add('shot-cover');
  if (params.get('size')) state.size = params.get('size');
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('title')) { state.title = params.get('title'); $('titleInput').value = state.title; }
  if (params.get('tagline')) { state.tagline = params.get('tagline'); $('taglineInput').value = state.tagline; }
  state.panels = defaultPanels(state.layout, state.size);
}

for (const sample of SAMPLE_PHOTOS) addPhoto(sample.src, sample.name);
refreshControls();
redraw();
if (document.fonts?.ready) {
  document.fonts.load('100px "Palmera Display"').catch(() => {});
  document.fonts.load('40px "Palmera Text"').catch(() => {});
  document.fonts.ready.then(() => redraw());
}
