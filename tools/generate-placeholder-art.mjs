#!/usr/bin/env node
/**
 * Placeholder art generator.
 *
 * Reads every manifest in content/art/manifest/ and writes one atmospheric
 * SVG per slot into apps/web/public/art/<slot>.svg — layered gradient sky,
 * ground band, fog, grain, and a scene silhouette chosen from keywords in the
 * slot id.
 *
 * These are PLACEHOLDERS. Real frames are generated offline with the locked
 * prompt prefix and seed, dropped in as <slot>.png, and win automatically
 * (BeatArt's fallback chain is png → svg → gradient).
 *
 * Art slots are a FLAT namespace across every adventure, because they resolve
 * to one directory. This script fails loudly on a duplicate slot rather than
 * letting one adventure silently overwrite another's frame.
 *
 * Run: node tools/generate-placeholder-art.mjs
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST_DIR = 'content/art/manifest';
const OUT_DIR = 'apps/web/public/art';
const W = 800;
const H = 450;

/** Deterministic per-slot rng so re-running is a no-op diff. */
function rng(seedStr) {
  let h = 0x811c9dc5;
  for (const ch of seedStr) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Palettes, one register per adventure ---------------------------------

const PALETTES = {
  // Saltmire — muted North Sea
  sea: { sky: ['#2a3438', '#1a2124'], ground: '#141c1e', mist: '#8a9a96', key: '#c8b088' },
  interior: { sky: ['#241f1a', '#151210'], ground: '#0e0c0a', mist: '#a08a5a', key: '#d9a441' },
  crypt: { sky: ['#181a20', '#0c0d12'], ground: '#08090c', mist: '#5a6a8a', key: '#7a8aaa' },
  // Emberfall — soot and ember against cold shadow
  forge: { sky: ['#2b1d14', '#140d09'], ground: '#0f0a07', mist: '#c07038', key: '#ff9a3c' },
  industry: { sky: ['#33302a', '#1b1814'], ground: '#12100d', mist: '#9a8a70', key: '#e0a850' },
  // Shattered Vale — drowned, votive, gold-leaf
  drowned: { sky: ['#123038', '#07171c'], ground: '#051014', mist: '#4fa8b8', key: '#e8d08a' },
  votive: { sky: ['#16232b', '#0a1116'], ground: '#070d11', mist: '#6fbccc', key: '#f0dCa0' },
  // Shattered Meridian — pale violet-grey, doubled edges
  meridian: { sky: ['#3a3448', '#1d1a26'], ground: '#15131c', mist: '#9a90b8', key: '#cfc0e8' },
  archive: { sky: ['#2e2a24', '#17150f'], ground: '#100e0a', mist: '#b0a080', key: '#e8c880' },
};

/**
 * Generated library adventures carry their tone tags in the manifest, so their
 * palette comes from the tone rather than from hand-written slot keywords —
 * there is no way to enumerate slot names for content that does not exist yet.
 */
const TONE_PALETTE = {
  'gothic-horror': 'crypt', 'survival-horror': 'crypt', 'cosmic-horror': 'meridian',
  'arctic-survival': 'sea', 'nautical': 'sea', 'jungle-survival': 'drowned',
  'exploration': 'sea', 'west-marches': 'sea', 'sandbox': 'industry',
  'urban-intrigue': 'industry', 'heist': 'industry', 'political-fantasy': 'archive',
  'mystery': 'archive', 'anthology': 'archive', 'beginner-classic': 'interior',
  'infernal-war': 'forge', 'high-adventure': 'forge', 'epic-finale': 'forge',
  'megadungeon': 'crypt', 'whimsical-fey': 'votive',
};
let SLOT_TONE = new Map();

function paletteFor(s) {
  const t = SLOT_TONE.get(s);
  if (t && PALETTES[TONE_PALETTE[t] ?? '']) return PALETTES[TONE_PALETTE[t]];
  // Meridian
  if (/(waking-scarred|scar-visions|scar-crossing|absent-gate|alternate-selves|unmade-regent|meridian-|dawnbound-court)/.test(s))
    return PALETTES.meridian;
  if (/(the-calendar|duskhollow-archive|memory-market|chronoseptor-cell|stolen-hour)/.test(s))
    return PALETTES.archive;
  // Vale
  if (/(inland-sea|long-stair|resonance-halls|heart-chamber|heart-fragment|covenant-ritual|ending-drowned|ending-archive|ending-brokered|convergence)/.test(s))
    return PALETTES.drowned;
  if (/(null-shrine|sereph-road|syndicate-camp|dawnward-picket|seren-breaks)/.test(s))
    return PALETTES.votive;
  // Emberfall
  if (/(ruined-forge|slag-fields|dawnfire-array|pylons|embers-heart|tunnels|vault-descent|ending-living-forge|ending-unmade|ending-restored)/.test(s))
    return PALETTES.forge;
  if (/(emberwatch|guildhall|evidence-vault|varrin|broadcast|city-chaos)/.test(s))
    return PALETTES.industry;
  // Saltmire
  if (/(crypt|hollow|grave|descent)/.test(s)) return PALETTES.crypt;
  if (/(harbor-row|nave|belfry|stair)/.test(s)) return PALETTES.interior;
  return PALETTES.sea;
}

// --- Scene primitives -----------------------------------------------------

const tower = (x, w, h) =>
  `<path d="M${x} ${H} L${x} ${H - h} L${x + w * 0.15} ${H - h - w * 0.3} L${x + w * 0.85} ${H - h - w * 0.3} L${x + w} ${H - h} L${x + w} ${H} Z"/>
   <rect x="${x + w * 0.35}" y="${H - h + w * 0.2}" width="${w * 0.3}" height="${w * 0.45}" rx="${w * 0.15}" fill="rgba(0,0,0,0.5)"/>`;

const bell = (cx, cy, r) =>
  `<path d="M${cx - r} ${cy + r * 0.8} Q${cx - r} ${cy - r} ${cx} ${cy - r} Q${cx + r} ${cy - r} ${cx + r} ${cy + r * 0.8} L${cx + r * 1.15} ${cy + r} L${cx - r * 1.15} ${cy + r} Z"/>
   <circle cx="${cx}" cy="${cy + r * 1.15}" r="${r * 0.16}"/>`;

const roofline = (y, r) => {
  let d = `M0 ${H} L0 ${y}`;
  let x = 0;
  while (x < W) {
    const w = 40 + r() * 80;
    d += ` L${x + w * 0.5} ${y - 10 - r() * 35} L${x + w} ${y + (r() - 0.5) * 14}`;
    x += w;
  }
  return `<path d="${d} L${W} ${H} Z"/>`;
};

/** Industrial skyline: roofline plus chimney stacks. */
const stacks = (y, r) => {
  let out = roofline(y, r);
  for (let i = 0; i < 6; i++) {
    const x = 40 + r() * (W - 80);
    const h = 60 + r() * 120;
    out += `<rect x="${x}" y="${y - h}" width="${10 + r() * 10}" height="${h}"/>`;
  }
  return out;
};

const stones = (y, n, r) => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = 30 + r() * (W - 60);
    const h = 14 + r() * 42;
    out += `<rect x="${x}" y="${y - h}" width="${10 + r() * 16}" height="${h}" rx="4" transform="rotate(${(r() - 0.5) * 16} ${x} ${y})"/>`;
  }
  return out;
};

const stair = (r, x0 = W * 0.62) => {
  let out = '';
  let y = H - 20;
  let x = x0;
  for (let i = 0; i < 12; i++) {
    const w = 130 - i * 8;
    out += `<rect x="${x - w / 2}" y="${y}" width="${w}" height="9" rx="3" transform="rotate(${(r() - 0.5) * 5} ${x} ${y})"/>`;
    y -= 34;
    x += (r() - 0.5) * 30;
  }
  return out;
};

const causeway = (r) => {
  let out = '';
  for (let i = 0; i < 9; i++) {
    const t = i / 9;
    out += `<ellipse cx="${W / 2 + (r() - 0.5) * 24}" cy="${H * 0.62 + t * (H * 0.36)}" rx="${(60 + t * 260) / 2}" ry="${5 + t * 9}"/>`;
  }
  return out;
};

/** Concentric focusing rings — the Dawnfire Array. */
const rings = (cx, cy, key) => {
  let out = '';
  for (let i = 6; i > 0; i--) {
    const rr = i * 34;
    out += `<ellipse cx="${cx}" cy="${cy}" rx="${rr}" ry="${rr * 0.34}" fill="none" stroke="rgba(6,8,9,0.9)" stroke-width="9"/>`;
  }
  return out + `<circle cx="${cx}" cy="${cy}" r="16" fill="${key}"/>`;
};

/** Three pylons around a held point of light. */
const pylons = (key) => {
  const pts = [
    [W * 0.28, H * 0.86],
    [W * 0.72, H * 0.86],
    [W * 0.5, H * 0.58],
  ];
  let out = pts.map(([x, y]) => `<path d="M${x - 20} ${y} L${x - 11} ${y - 170} L${x + 11} ${y - 170} L${x + 20} ${y} Z"/>`).join('');
  return out + `<circle cx="${W * 0.5}" cy="${H * 0.5}" r="24" fill="${key}"/>`;
};

/** A furnace mouth / forge glow. */
const hearth = (cx, cy, key) =>
  `<rect x="${cx - 62}" y="${cy - 46}" width="124" height="92" rx="6"/>
   <path d="M${cx - 16} ${cy + 28} Q${cx - 20} ${cy - 8} ${cx} ${cy - 26} Q${cx + 18} ${cy - 6} ${cx + 14} ${cy + 28} Z" fill="${key}" opacity="0.9"/>`;

/** Submerged colonnade. */
const columns = (r) => {
  let out = '';
  for (let i = 0; i < 7; i++) {
    const x = 50 + i * 110 + (r() - 0.5) * 20;
    const h = 150 + r() * 120;
    out += `<rect x="${x}" y="${H * 0.9 - h}" width="26" height="${h}"/><rect x="${x - 8}" y="${H * 0.9 - h - 12}" width="42" height="12"/>`;
  }
  return out;
};

/** Market stalls: awnings in a row. */
const stalls = (r) => {
  let out = '';
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 130 + (r() - 0.5) * 20;
    const y = H * 0.62 + (r() - 0.5) * 30;
    out += `<path d="M${x} ${y} L${x + 55} ${y - 26} L${x + 110} ${y} Z"/><rect x="${x + 6}" y="${y}" width="98" height="${H - y}"/>`;
  }
  return out;
};

/** Archive: stacked shelving. */
const shelves = (r) => {
  let out = '';
  for (let i = 0; i < 5; i++) {
    const x = 20 + i * 160;
    out += `<rect x="${x}" y="${H * 0.22}" width="120" height="${H * 0.68}"/>`;
    for (let j = 0; j < 6; j++)
      out += `<rect x="${x + 6}" y="${H * 0.24 + j * 44}" width="108" height="6" fill="rgba(255,255,255,0.10)"/>`;
  }
  return out;
};

/** A free-standing threshold with light behind it. */
const gateway = (key) =>
  `<rect x="${W * 0.5 - 96}" y="${H * 0.3}" width="192" height="${H * 0.6}" fill="${key}" opacity="0.55"/>
   <path d="M${W * 0.5 - 120} ${H * 0.92} L${W * 0.5 - 120} ${H * 0.3} L${W * 0.5 - 96} ${H * 0.24} L${W * 0.5 + 96} ${H * 0.24} L${W * 0.5 + 120} ${H * 0.3} L${W * 0.5 + 120} ${H * 0.92} Z" fill="none" stroke="rgba(6,8,9,0.92)" stroke-width="26"/>`;

/** Mirrored figures approaching. */
const figures = (n, r) => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = W * 0.28 + i * (W * 0.44) / Math.max(1, n - 1) + (r() - 0.5) * 24;
    const h = 90 + r() * 30;
    const y = H * 0.9;
    out += `<ellipse cx="${x}" cy="${y - h}" rx="13" ry="15"/><path d="M${x - 17} ${y} L${x - 12} ${y - h + 12} L${x + 12} ${y - h + 12} L${x + 17} ${y} Z"/>`;
  }
  return out;
};

/** A seam: an unclosed vertical cut across the frame. */
const seam = (key) =>
  `<path d="M${W * 0.5 - 6} 0 L${W * 0.5 + 10} ${H * 0.4} L${W * 0.5 - 8} ${H * 0.7} L${W * 0.5 + 6} ${H}" fill="none" stroke="${key}" stroke-width="5" opacity="0.9"/>`;

/** An open page / register. */
const page = (key) =>
  `<rect x="${W * 0.22}" y="${H * 0.34}" width="${W * 0.56}" height="${H * 0.5}" rx="4" fill="${key}" opacity="0.22"/>
   <rect x="${W * 0.22}" y="${H * 0.34}" width="${W * 0.56}" height="${H * 0.5}" rx="4" fill="none" stroke="rgba(6,8,9,0.85)" stroke-width="6"/>
   <line x1="${W * 0.5}" y1="${H * 0.34}" x2="${W * 0.5}" y2="${H * 0.84}" stroke="rgba(6,8,9,0.7)" stroke-width="4"/>`;

function scene(s, r, p) {
  // --- Emberfall ---
  if (/ruined-forge/.test(s)) return roofline(H * 0.66, r) + hearth(W * 0.5, H * 0.74, p.key);
  if (/emberwatch-road/.test(s)) return stacks(H * 0.62, r);
  if (/slag-fields/.test(s)) return stones(H * 0.88, 16, r);
  if (/emberwatch-gates/.test(s)) return `<rect x="0" y="${H * 0.28}" width="${W}" height="${H * 0.72}"/>` + gateway(p.key);
  if (/guildhall/.test(s)) return shelves(r) + hearth(W * 0.5, H * 0.7, p.key);
  if (/tunnels/.test(s)) return columns(r);
  if (/dawnfire-array/.test(s)) return rings(W * 0.5, H * 0.55, p.key);
  if (/evidence-vault/.test(s)) return shelves(r) + page(p.key);
  if (/varrin/.test(s)) return figures(1, r) + page(p.key);
  if (/broadcast-approach/.test(s)) return tower(W * 0.4, 190, 300);
  if (/broadcast-tower/.test(s)) return tower(W * 0.36, 220, 320) + `<g fill="${p.key}" opacity="0.9">${bell(W * 0.5, H * 0.36, 44)}</g>`;
  if (/city-chaos/.test(s)) return stacks(H * 0.58, r) + figures(4, r);
  if (/vault-descent/.test(s)) return stair(r, W * 0.5);
  if (/pylons/.test(s)) return pylons(p.key);
  if (/embers-heart/.test(s)) return `<circle cx="${W / 2}" cy="${H * 0.52}" r="70" fill="${p.key}"/><circle cx="${W / 2}" cy="${H * 0.52}" r="130" fill="${p.key}" opacity="0.18"/>`;
  if (/ending-unmade/.test(s)) return stacks(H * 0.6, r);
  if (/ending-restored/.test(s)) return pylons(p.key);
  if (/ending-living-forge/.test(s)) return figures(1, r);

  // --- Shattered Vale ---
  if (/null-shrine/.test(s)) return `<rect x="${W * 0.38}" y="${H * 0.52}" width="${W * 0.24}" height="${H * 0.38}"/>` + stones(H * 0.9, 6, r);
  if (/sereph-road/.test(s)) return causeway(r) + stones(H * 0.86, 4, r);
  if (/inland-sea/.test(s)) return columns(r);
  if (/syndicate-camp/.test(s)) return stalls(r);
  if (/dawnward-picket/.test(s)) return figures(4, r);
  if (/seren-breaks/.test(s)) return figures(1, r);
  if (/long-stair/.test(s)) return stair(r, W * 0.5);
  if (/resonance-halls/.test(s)) return columns(r) + gateway(p.key);
  if (/covenant-ritual/.test(s)) return `<circle cx="${W / 2}" cy="${H * 0.66}" r="120" fill="none" stroke="rgba(6,8,9,0.9)" stroke-width="10"/>` + figures(3, r);
  if (/heart-chamber|heart-fragment|ending-archive/.test(s))
    return `<circle cx="${W / 2}" cy="${H * 0.5}" r="52" fill="${p.key}"/><circle cx="${W / 2}" cy="${H * 0.5}" r="110" fill="none" stroke="${p.key}" stroke-width="3" opacity="0.55"/>`;
  if (/convergence/.test(s)) return figures(5, r) + columns(r);
  if (/ending-drowned/.test(s)) return causeway(r);
  if (/ending-brokered/.test(s)) return figures(2, r);

  // --- Shattered Meridian ---
  if (/waking-scarred/.test(s)) return `<rect x="${W * 0.14}" y="${H * 0.2}" width="${W * 0.24}" height="${H * 0.4}" fill="${p.key}" opacity="0.35"/><rect x="${W * 0.62}" y="${H * 0.2}" width="${W * 0.24}" height="${H * 0.4}" fill="${p.key}" opacity="0.35"/>`;
  if (/the-calendar/.test(s)) return shelves(r) + page(p.key);
  if (/scar-visions/.test(s)) return figures(1, r) + seam(p.key);
  if (/dawnbound-court/.test(s)) return columns(r) + figures(4, r);
  if (/duskhollow-archive/.test(s)) return shelves(r);
  if (/memory-market/.test(s)) return stalls(r);
  if (/scar-crossing/.test(s)) return stones(H * 0.88, 8, r) + seam(p.key);
  if (/chronoseptor-cell/.test(s)) return stalls(r) + `<rect x="${W * 0.44}" y="${H * 0.62}" width="${W * 0.12}" height="${H * 0.1}" rx="4"/>`;
  if (/stolen-hour/.test(s)) return `<rect x="${W * 0.32}" y="${H * 0.42}" width="${W * 0.36}" height="${H * 0.3}" rx="6" fill="${p.key}" opacity="0.5"/><rect x="${W * 0.32}" y="${H * 0.42}" width="${W * 0.36}" height="${H * 0.3}" rx="6" fill="none" stroke="rgba(6,8,9,0.9)" stroke-width="14"/>`;
  if (/absent-gate/.test(s)) return gateway(p.key);
  if (/alternate-selves/.test(s)) return figures(4, r);
  if (/unmade-regent/.test(s)) return columns(r) + figures(1, r);
  if (/meridian-choice/.test(s)) return seam(p.key) + stones(H * 0.9, 5, r);
  if (/meridian-restored/.test(s)) return roofline(H * 0.6, r) + figures(5, r);
  if (/meridian-rewritten/.test(s)) return figures(1, r) + `<ellipse cx="${W / 2}" cy="${H * 0.42}" rx="120" ry="150" fill="none" stroke="rgba(6,8,9,0.8)" stroke-width="10"/>`;
  if (/meridian-severed/.test(s)) return page(p.key);

  // --- Saltmire (original set) ---
  if (/belfry|silent-bell|ending-keeper/.test(s))
    return tower(W * 0.36, 220, 300) + `<g fill="${p.key}" opacity="0.9">${bell(W * 0.5, H * 0.34, 46)}</g>`;
  if (/graveyard|sextons-grave/.test(s)) return stones(H * 0.86, 14, r) + causeway(r);
  if (/tower-stair|crypt-descent/.test(s)) return stair(r);
  if (/harbor-row/.test(s)) return roofline(H * 0.55, r) + hearth(W * 0.68, H * 0.72, p.key);
  if (/nave/.test(s)) return columns(r);
  if (/causeway|tideline/.test(s)) return causeway(r) + tower(W * 0.72, 90, 150);
  if (/village-edge|church-square/.test(s)) return roofline(H * 0.6, r) + tower(W * 0.6, 110, 220);
  if (/drowned-crypt/.test(s)) return stones(H * 0.9, 8, r) + `<ellipse cx="${W / 2}" cy="${H * 0.55}" rx="150" ry="60" fill="rgba(0,0,0,0.55)"/>`;
  if (/ending-tide/.test(s)) return causeway(r);
  if (/ending-silence/.test(s)) return `<g opacity="0.6">${bell(W / 2, H * 0.78, 50)}</g>`;

  return roofline(H * 0.62, r);
}

function render(slot) {
  const r = rng(slot);
  const p = paletteFor(slot);
  const horizon = H * (0.5 + r() * 0.12);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/>
    </linearGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${Math.floor(r() * 100)}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer><feComposite operator="over" in2="SourceGraphic"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="${p.ground}"/>
  <rect y="${horizon - 26}" width="${W}" height="52" fill="${p.mist}" opacity="0.10"/>
  <rect y="${horizon - 8}" width="${W}" height="16" fill="${p.mist}" opacity="0.14"/>
  <g fill="rgba(6,8,9,0.88)">${scene(slot, r, p)}</g>
  <rect width="${W}" height="${H}" fill="transparent" filter="url(#grain)"/>
  <rect width="${W}" height="${H}" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="6"/>
</svg>\n`;
}

mkdirSync(OUT_DIR, { recursive: true });

// Collect first so duplicate slots fail before anything is written.
const owner = new Map();
for (const file of readdirSync(MANIFEST_DIR)) {
  if (!file.endsWith('.json')) continue;
  const manifest = JSON.parse(readFileSync(join(MANIFEST_DIR, file), 'utf8'));
  for (const { slot } of manifest.slots ?? []) {
    if (owner.has(slot)) {
      console.error(
        `DUPLICATE ART SLOT '${slot}' claimed by both '${owner.get(slot)}' and '${manifest.adventure}'.\n` +
          `Slots resolve to one flat directory, so this would silently overwrite a frame. Rename one.`,
      );
      process.exit(1);
    }
    owner.set(slot, manifest.adventure);
  }
}

for (const slot of owner.keys()) writeFileSync(join(OUT_DIR, `${slot}.svg`), render(slot));
console.log(`wrote ${owner.size} placeholder SVGs across ${new Set(owner.values()).size} adventures`);
