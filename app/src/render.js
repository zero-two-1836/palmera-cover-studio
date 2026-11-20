// Palmera Cover Studio — the cover renderer.
//
// Everything on a finished cover is drawn here, on a 2D canvas, from the
// editor's state: a set of angled panels (the multi-panel poster look),
// each filled with a photo or with one of two illustrated scenes the
// studio draws itself, a colour grade and a gloss per panel, then the
// masthead — kicker, big condensed title with a gradient underline —
// the tagline, the age badge and the barcode. The same drawing is used
// for the on-screen preview and for the exported PNG, so what you frame
// is exactly what you get. All randomness comes from a seeded generator,
// so a given state always renders the same cover, byte for byte.

// ---------------------------------------------------------------- sizes

export const POST_SIZES = {
  square: { width: 1080, height: 1080, label: 'Square · 1080 × 1080' },
  portrait: { width: 1080, height: 1350, label: 'Portrait · 1080 × 1350' },
  wide: { width: 1920, height: 1080, label: 'Wide · 1920 × 1080' },
};

// ------------------------------------------------------------- randomness

// A tiny seeded generator (mulberry32): scenes and barcodes draw from it,
// so they never change between renders of the same cover.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromText(text) {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)) % 9973;
  return h;
}

// --------------------------------------------------------------- layouts
//
// A layout is a list of panels; a panel is a polygon of [x, y] points in
// cover fractions. The dividers slant — that slant is what makes a grid
// of photos read as a game cover instead of a contact sheet.

function showcasePanels(bucket) {
  if (bucket === 'wide') {
    const slant = (y) => 0.47 - 0.05 * y;
    return [
      [[0, 0], [slant(0), 0], [slant(1), 1], [0, 1]],
      [[slant(0), 0], [1, 0], [1, 0.34], [slant(0.34), 0.34]],
      [[slant(0.34), 0.34], [1, 0.34], [1, 0.67], [slant(0.67), 0.67]],
      [[slant(0.67), 0.67], [1, 0.67], [1, 1], [slant(1), 1]],
    ];
  }
  if (bucket === 'portrait') {
    const heroBottom = (x) => 0.465 - 0.055 * x;
    return [
      [[0, 0], [1, 0], [1, heroBottom(1)], [0, heroBottom(0)]],
      [[0, heroBottom(0)], [0.565, heroBottom(0.565)], [0.475, 0.72], [0, 0.72]],
      [[0.565, heroBottom(0.565)], [1, heroBottom(1)], [1, 0.72], [0.475, 0.72]],
      [[0, 0.72], [1, 0.72], [1, 1], [0, 1]],
    ];
  }
  const slant = (y) => 0.52 - 0.06 * y;
  return [
    [[0, 0], [slant(0), 0], [slant(1), 1], [0, 1]],
    [[slant(0), 0], [1, 0], [1, 0.5], [slant(0.5), 0.5]],
    [[slant(0.5), 0.5], [1, 0.5], [1, 1], [slant(1), 1]],
  ];
}

function mosaicPanels() {
  return [
    [[0, 0], [0.56, 0], [0.47, 0.52], [0, 0.52]],
    [[0.56, 0], [1, 0], [1, 0.52], [0.47, 0.52]],
    [[0, 0.52], [0.47, 0.52], [0.58, 1], [0, 1]],
    [[0.47, 0.52], [1, 0.52], [1, 1], [0.58, 1]],
  ];
}

function trioPanels() {
  const heroBottom = (x) => 0.64 - 0.06 * x;
  return [
    [[0, 0], [1, 0], [1, heroBottom(1)], [0, heroBottom(0)]],
    [[0, heroBottom(0)], [0.52, heroBottom(0.52)], [0.44, 1], [0, 1]],
    [[0.52, heroBottom(0.52)], [1, heroBottom(1)], [1, 1], [0.44, 1]],
  ];
}

export const LAYOUTS = {
  showcase: { label: 'Showcase', panels: showcasePanels },
  mosaic: { label: 'Mosaic', panels: () => mosaicPanels() },
  trio: { label: 'Hero Trio', panels: () => trioPanels() },
};

export function layoutPolygons(layout, bucket) {
  return LAYOUTS[layout].panels(bucket);
}

// ---------------------------------------------------------------- grades
//
// A grade is a filter pass over the photo plus a colour wash laid over
// the panel: the sunset and neon grades are the Vice City colour grade
// the bounty asks for; gold, noir and clean are the quieter options.

export const GRADES = {
  sunset: {
    label: 'Sunset', filter: 'saturate(1.28) contrast(1.06) brightness(1.02)',
    wash: [[0, 'rgba(255,110,64,0.30)'], [0.45, 'rgba(255,45,120,0.10)'], [1, 'rgba(28,0,58,0.40)']],
    washHorizontal: false,
  },
  neon: {
    label: 'Neon', filter: 'saturate(1.42) contrast(1.08)',
    wash: [[0, 'rgba(255,43,214,0.22)'], [0.5, 'rgba(90,0,140,0.05)'], [1, 'rgba(34,211,238,0.24)']],
    washHorizontal: true,
  },
  gold: {
    label: 'Gold', filter: 'saturate(1.15) sepia(0.18) brightness(1.03)',
    wash: [[0, 'rgba(255,196,64,0.16)'], [0.6, 'rgba(255,140,40,0.05)'], [1, 'rgba(112,44,0,0.30)']],
    washHorizontal: false,
  },
  noir: {
    label: 'Noir', filter: 'grayscale(1) contrast(1.12)',
    wash: [[0, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.34)']],
    washHorizontal: false,
  },
  clean: {
    label: 'Clean', filter: 'saturate(1.05)',
    wash: [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.12)']],
    washHorizontal: false,
  },
};

// ------------------------------------------------------- illustrated art
//
// Two scenes the studio draws itself, so a cover still looks like key
// art when a panel holds no photo: a retro sunset with palm silhouettes
// over the sea, and a neon skyline across the water at night.

function drawPalm(ctx, baseX, baseY, height, lean, width, colour) {
  const topX = baseX + lean * height;
  const topY = baseY - height;
  const midX = baseX + lean * height * 0.3;
  const midY = baseY - height * 0.55;
  ctx.fillStyle = colour;
  ctx.beginPath();
  const steps = 14;
  const leftEdge = [];
  const rightEdge = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * baseX + 2 * (1 - t) * t * midX + t * t * topX;
    const y = (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * midY + t * t * topY;
    const w = width * (1 - 0.72 * t);
    leftEdge.push([x - w, y]);
    rightEdge.push([x + w, y]);
  }
  ctx.moveTo(leftEdge[0][0], leftEdge[0][1]);
  for (const [x, y] of leftEdge) ctx.lineTo(x, y);
  for (const [x, y] of rightEdge.reverse()) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  // Fronds: eleven arcs fanning from the crown — a slight rise at the
  // root, then a long droop, longer at the sides than at the top — plus
  // a short skirt of dead fronds hanging under the crown.
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const angle = Math.PI * (0.04 + (0.92 * i) / 10);
    const reach = height * (0.26 + 0.16 * Math.abs(Math.sin(i * 1.7))) * (i % 2 ? 1.1 : 0.94);
    const endX = topX + Math.cos(angle) * reach;
    const endY = topY + Math.pow(Math.sin(angle), 1.6) * reach * 0.95 + height * 0.03;
    const ctrlX = topX + (endX - topX) * 0.35;
    const ctrlY = topY - height * 0.05;
    ctx.lineWidth = Math.max(2, width * 1.05);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.stroke();
  }
  for (const tilt of [-0.5, 0, 0.5]) {
    ctx.lineWidth = Math.max(2, width * 0.95);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + tilt * height * 0.08, topY + height * 0.03,
      topX + tilt * height * 0.16, topY + height * 0.13);
    ctx.stroke();
  }
}

export function drawSunsetScene(ctx, x, y, w, h) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h * 0.8);
  sky.addColorStop(0, '#2a1052');
  sky.addColorStop(0.35, '#7b2d8b');
  sky.addColorStop(0.58, '#e84393');
  sky.addColorStop(0.76, '#ff7e47');
  sky.addColorStop(1, '#ffd166');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h * 0.8);
  // The sun: a big disc sliced by the horizon haze, retro-poster style.
  const sunX = x + w * 0.66;
  const sunY = y + h * 0.68;
  const sunR = w * 0.17;
  const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, '#ffe9a8');
  sun.addColorStop(1, '#ff8c42');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(232,67,147,0.55)';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(sunX - sunR, sunY + sunR * (0.18 + i * 0.24), sunR * 2, sunR * 0.07);
  }
  // The sea, with seeded sparkle along the light.
  const sea = ctx.createLinearGradient(0, y + h * 0.8, 0, y + h);
  sea.addColorStop(0, '#ff9e5e');
  sea.addColorStop(1, '#46205e');
  ctx.fillStyle = sea;
  ctx.fillRect(x, y + h * 0.8, w, h * 0.2);
  const rng = seededRandom(41);
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 42; i++) {
    const sy = y + h * (0.815 + rng() * 0.17);
    const sx = x + w * (0.52 + rng() * 0.3);
    ctx.globalAlpha = 0.18 + rng() * 0.4;
    ctx.fillRect(sx, sy, w * (0.012 + rng() * 0.03), Math.max(1.5, h * 0.004));
  }
  ctx.globalAlpha = 1;
  // Three birds, far off over the water.
  ctx.strokeStyle = 'rgba(22,10,36,0.8)';
  ctx.lineWidth = Math.max(1.5, w * 0.0022);
  for (const [fx, fy, s] of [[0.3, 0.2, 1], [0.38, 0.15, 0.7], [0.24, 0.13, 0.55]]) {
    const cx = x + w * fx;
    const cy = y + h * fy;
    const r = w * 0.016 * s;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.quadraticCurveTo(cx - r * 0.4, cy - r * 0.7, cx, cy);
    ctx.quadraticCurveTo(cx + r * 0.4, cy - r * 0.7, cx + r, cy);
    ctx.stroke();
  }
  // Palms in silhouette, one leaning in from each side.
  drawPalm(ctx, x + w * 0.05, y + h * 1.01, h * 0.8, 0.22, w * 0.011, '#160a24');
  drawPalm(ctx, x + w * 0.99, y + h * 1.01, h * 0.62, -0.3, w * 0.009, '#160a24');
}

export function drawSkylineScene(ctx, x, y, w, h) {
  const horizon = y + h * 0.66;
  const sky = ctx.createLinearGradient(0, y, 0, horizon);
  sky.addColorStop(0, '#070b2a');
  sky.addColorStop(0.55, '#1d1450');
  sky.addColorStop(1, '#4b2178');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, horizon - y);
  // Moon and its halo.
  const moonX = x + w * 0.15;
  const moonY = y + h * 0.17;
  const halo = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, w * 0.11);
  halo.addColorStop(0, 'rgba(245,239,220,0.35)');
  halo.addColorStop(1, 'rgba(245,239,220,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(moonX - w * 0.11, moonY - w * 0.11, w * 0.22, w * 0.22);
  ctx.fillStyle = '#f5efdc';
  ctx.beginPath();
  ctx.arc(moonX, moonY, w * 0.038, 0, Math.PI * 2);
  ctx.fill();
  // Buildings along the shore, lit windows seeded so they never move.
  const rng = seededRandom(97);
  const litWindows = [];
  let bx = x + w * 0.02;
  ctx.fillStyle = '#131a42';
  while (bx < x + w * 0.97) {
    const bw = w * (0.05 + rng() * 0.06);
    const bh = h * (0.16 + rng() * 0.34);
    ctx.fillRect(bx, horizon - bh, bw, bh);
    const cols = Math.max(2, Math.floor(bw / (w * 0.016)));
    const rows = Math.max(3, Math.floor(bh / (h * 0.045)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rng() < 0.38) {
          const wx = bx + (c + 0.5) * (bw / cols);
          const wy = horizon - bh + (r + 0.5) * (bh / rows);
          litWindows.push([wx, wy, rng()]);
        }
      }
    }
    bx += bw + w * (0.006 + rng() * 0.014);
  }
  const windowColours = ['#ffd166', '#7df9ff', '#ff9ff3'];
  for (const [wx, wy, pick] of litWindows) {
    ctx.fillStyle = windowColours[Math.floor(pick * 3)];
    ctx.fillRect(wx - w * 0.0035, wy - h * 0.006, w * 0.007, h * 0.012);
  }
  // Water: dark below the shore, with the windows smeared down into it.
  const water = ctx.createLinearGradient(0, horizon, 0, y + h);
  water.addColorStop(0, '#1a1140');
  water.addColorStop(1, '#05060f');
  ctx.fillStyle = water;
  ctx.fillRect(x, horizon, w, y + h - horizon);
  for (const [wx, wy, pick] of litWindows) {
    if (wy < horizon - h * 0.05) continue;
    ctx.fillStyle = windowColours[Math.floor(pick * 3)];
    ctx.globalAlpha = 0.24;
    const len = h * (0.02 + pick * 0.05);
    ctx.fillRect(wx - w * 0.002, horizon + 2, w * 0.004, len);
  }
  ctx.globalAlpha = 1;
}

export const SCENES = {
  sunset: { label: 'Scene · sunset palms', draw: drawSunsetScene },
  skyline: { label: 'Scene · neon skyline', draw: drawSkylineScene },
};

// ---------------------------------------------------------------- panels

function polygonCentroid(poly) {
  let cx = 0;
  let cy = 0;
  for (const [px, py] of poly) { cx += px; cy += py; }
  return [cx / poly.length, cy / poly.length];
}

function shrinkPolygon(poly, width, height, inset) {
  const [cx, cy] = polygonCentroid(poly);
  return poly.map(([fx, fy]) => {
    const px = fx * width;
    const py = fy * height;
    const dx = cx * width - px;
    const dy = cy * height - py;
    const len = Math.hypot(dx, dy) || 1;
    const step = Math.min(inset, len * 0.4);
    return [px + (dx / len) * step, py + (dy / len) * step];
  });
}

function tracePolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [px, py] of points.slice(1)) ctx.lineTo(px, py);
  ctx.closePath();
}

function drawPhotoFitted(ctx, img, box, panel) {
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = box.x + (box.w - dw) * panel.fx;
  const dy = box.y + (box.h - dh) * panel.fy;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function fillGradient(ctx, box, stops, horizontal) {
  const grad = horizontal
    ? ctx.createLinearGradient(box.x, 0, box.x + box.w, 0)
    : ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  for (const [offset, colour] of stops) grad.addColorStop(offset, colour);
  ctx.fillStyle = grad;
  ctx.fillRect(box.x, box.y, box.w, box.h);
}

export function drawPanel(ctx, poly, panel, photos, width, height) {
  const gutter = Math.max(5, width * 0.006);
  const points = shrinkPolygon(poly, width, height, gutter / 2);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const box = {
    x: Math.min(...xs), y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
  };
  ctx.save();
  tracePolygon(ctx, points);
  ctx.clip();
  ctx.fillStyle = '#241028';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const grade = GRADES[panel.grade] ?? GRADES.clean;
  if (panel.fill.type === 'scene') {
    SCENES[panel.fill.id].draw(ctx, box.x, box.y, box.w, box.h);
  } else {
    const img = photos[panel.fill.index];
    if (img) {
      ctx.save();
      ctx.filter = grade.filter;
      drawPhotoFitted(ctx, img, box, panel);
      ctx.restore();
    }
  }
  if (panel.fill.type !== 'scene' || panel.grade !== 'clean') {
    fillGradient(ctx, box, grade.wash, grade.washHorizontal);
  }
  // A soft gloss across the top of every panel, like a printed poster.
  fillGradient(ctx, { x: box.x, y: box.y, w: box.w, h: box.h * 0.55 },
    [[0, 'rgba(255,255,255,0.13)'], [1, 'rgba(255,255,255,0)']], false);
  ctx.restore();
  // Keylines: a cream rule around the panel, with a dark hairline inside.
  tracePolygon(ctx, points);
  ctx.strokeStyle = '#f3ecd9';
  ctx.lineWidth = Math.max(3, width * 0.0075);
  ctx.lineJoin = 'round';
  ctx.stroke();
  const inner = shrinkPolygon(poly, width, height, gutter / 2 + width * 0.0075);
  tracePolygon(ctx, inner);
  ctx.strokeStyle = 'rgba(12,7,5,0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// -------------------------------------------------------------- masthead

export const KICKER_TEXT = 'P A L M E R A   C O V E R   S T U D I O';
export const DISPLAY_FONT = '"Palmera Display", "Noto Sans ExtraCondensed", sans-serif';
export const TEXT_FONT = '"Palmera Text", "Noto Sans Condensed", sans-serif';

// Split a title over one or two lines, keeping the two lines balanced.
export function fitTitleLines(ctx, title, maxWidth, startSize) {
  const words = title.split(/\s+/).filter(Boolean);
  let size = startSize;
  while (size > 22) {
    ctx.font = `${size}px ${DISPLAY_FONT}`;
    if (ctx.measureText(title).width <= maxWidth) return { lines: [title], size };
    let best = null;
    for (let cut = 1; cut < words.length; cut++) {
      const lines = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
      const widths = lines.map((line) => ctx.measureText(line).width);
      if (Math.max(...widths) <= maxWidth) {
        const balance = Math.abs(widths[0] - widths[1]);
        if (!best || balance < best.balance) best = { lines, balance };
      }
    }
    if (best) return { lines: best.lines, size };
    size *= 0.93;
  }
  ctx.font = `${size}px ${DISPLAY_FONT}`;
  return { lines: [title], size };
}

function drawTitle(ctx, title, width, height) {
  const { lines, size } = fitTitleLines(ctx, title, width * 0.92, width * 0.128);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let y = height * 0.062 + size;
  let lastWidth = 0;
  for (const line of lines) {
    const grad = ctx.createLinearGradient(0, y - size, 0, y + size * 0.12);
    grad.addColorStop(0, '#fffaf0');
    grad.addColorStop(0.62, '#ffe3ae');
    grad.addColorStop(1, '#ffb37a');
    ctx.font = `${size}px ${DISPLAY_FONT}`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1d0f08';
    ctx.lineWidth = size * 0.17;
    ctx.strokeText(line, width / 2 + size * 0.04, y + size * 0.05);
    ctx.fillStyle = grad;
    ctx.fillText(line, width / 2, y);
    lastWidth = ctx.measureText(line).width;
    y += size * 1.04;
  }
  // The gradient rule under the last line: orange into pink into cyan.
  const barHeight = Math.max(3, size * 0.085);
  const bar = ctx.createLinearGradient(width / 2 - lastWidth / 2, 0, width / 2 + lastWidth / 2, 0);
  bar.addColorStop(0, '#ff5e3a');
  bar.addColorStop(0.55, '#ff2e88');
  bar.addColorStop(1, '#22d3ee');
  ctx.fillStyle = bar;
  const barY = y - size * 1.04 + size * 0.18;
  ctx.beginPath();
  ctx.roundRect(width / 2 - lastWidth / 2, barY, lastWidth, barHeight, barHeight / 2);
  ctx.fill();
}

function drawAgeBadge(ctx, width, height) {
  const s = width * 0.088;
  const x = width * 0.03;
  const y = height - s - height * 0.078;
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = Math.max(3, s * 0.045);
  ctx.strokeRect(x, y, s, s);
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.font = `${s * 0.44}px ${DISPLAY_FONT}`;
  ctx.fillText('18+', x + s / 2, y + s * 0.5);
  ctx.font = `${s * 0.115}px ${TEXT_FONT}`;
  ctx.fillText('ADULTS ONLY', x + s / 2, y + s * 0.74);
  ctx.font = `${s * 0.1}px ${TEXT_FONT}`;
  ctx.fillText('PALMERA', x + s / 2, y + s * 0.89);
}

function drawBarcode(ctx, title, width, height) {
  const bw = width * 0.155;
  const bh = height * 0.052;
  const x = width - bw - width * 0.03;
  const y = height - bh - height * 0.032;
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(x, y, bw, bh);
  const rng = seededRandom(seedFromText(title));
  ctx.fillStyle = '#111111';
  let cursor = x + bw * 0.05;
  while (cursor < x + bw * 0.92) {
    const barWidth = 1 + Math.floor(rng() * 4);
    if (rng() > 0.3) ctx.fillRect(cursor, y + bh * 0.1, barWidth, bh * 0.62);
    cursor += barWidth + 2;
  }
  ctx.font = `${bh * 0.2}px ${TEXT_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('PALMERA · No. 06', x + bw / 2, y + bh * 0.93);
}

function drawFinish(ctx, width, height) {
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.78);
  vignette.addColorStop(0, 'rgba(10,4,16,0)');
  vignette.addColorStop(1, 'rgba(10,4,16,0.22)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

// ---------------------------------------------------------------- render

export function renderCover(ctx, width, height, state, photos) {
  ctx.fillStyle = '#0e0a14';
  ctx.fillRect(0, 0, width, height);
  const bucket = state.size;
  const polys = layoutPolygons(state.layout, bucket);
  polys.forEach((poly, i) => {
    const panel = state.panels[i];
    if (panel) drawPanel(ctx, poly, panel, photos, width, height);
  });
  // Masthead scrim, so the lettering holds over any photo.
  const scrim = ctx.createLinearGradient(0, 0, 0, height * 0.3);
  scrim.addColorStop(0, 'rgba(8,4,10,0.62)');
  scrim.addColorStop(1, 'rgba(8,4,10,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height * 0.3);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd9a0';
  ctx.font = `${Math.max(14, width * 0.02)}px ${TEXT_FONT}`;
  ctx.fillText(KICKER_TEXT, width / 2, height * 0.048);
  if (state.title) drawTitle(ctx, state.title.toUpperCase(), width, height);
  if (state.tagline) {
    ctx.textAlign = 'left';
    ctx.font = `${Math.max(15, width * 0.026)}px ${TEXT_FONT}`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10,5,2,0.9)';
    ctx.lineWidth = 4;
    const text = state.tagline.toUpperCase();
    ctx.strokeText(text, width * 0.032, height * 0.962);
    ctx.fillStyle = '#ffe9c9';
    ctx.fillText(text, width * 0.032, height * 0.962);
  }
  if (state.badge) drawAgeBadge(ctx, width, height);
  if (state.barcode) drawBarcode(ctx, state.title || 'PALMERA', width, height);
  drawFinish(ctx, width, height);
}
