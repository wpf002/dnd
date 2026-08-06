#!/usr/bin/env node
/**
 * Placeholder art generator.
 *
 * Reads every manifest in content/art/manifest/ and writes one atmospheric
 * SVG per slot into apps/web/public/art/<slot>.svg — layered gradient sky,
 * sea bands, fog, grain, and a scene silhouette chosen from keywords in the
 * slot id and brief.
 *
 * These are PLACEHOLDERS. Real frames are generated offline with the locked
 * prompt prefix and seed, dropped in as <slot>.png, and win over these
 * automatically (the BeatArt fallback chain is png → svg → gradient).
 *
 * Run: node tools/generate-placeholder-art.mjs
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST_DIR = 'content/art/manifest';
const OUT_DIR = 'apps/web/public/art';

const W = 800;
const H = 450;

/** Deterministic per-slot rng so re-running the script is a no-op diff. */
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

// Muted North-Sea register, per the manifest's suggested style.
const PALETTES = {
  exterior: { sky: ['#2a3438', '#1a2124'], sea: '#141c1e', mist: '#8a9a96' },
  interior: { sky: ['#241f1a', '#151210'], sea: '#0e0c0a', mist: '#a08a5a' },
  crypt: { sky: ['#181a20', '#0c0d12'], sea: '#08090c', mist: '#5a6a8a' },
  ending: { sky: ['#33302a', '#1c1a16'], sea: '#12100d', mist: '#c0a878' },
};

function paletteFor(slot) {
  if (/(crypt|hollow|grave|descent)/.test(slot)) return PALETTES.crypt;
  if (/(harbor-row|nave|belfry|stair)/.test(slot)) return PALETTES.interior;
  if (/ending/.test(slot)) return PALETTES.ending;
  return PALETTES.exterior;
}

// --- Scene silhouettes, chosen by keyword ---------------------------------

const tower = (x, w, h) =>
  `<path d="M${x} ${H} L${x} ${H - h} L${x + w * 0.15} ${H - h - w * 0.3} L${x + w * 0.85} ${H - h - w * 0.3} L${x + w} ${H - h} L${x + w} ${H} Z" />
   <rect x="${x + w * 0.35}" y="${H - h + w * 0.2}" width="${w * 0.3}" height="${w * 0.45}" rx="${w * 0.15}" fill="rgba(0,0,0,0.5)"/>`;

const bell = (cx, cy, r) =>
  `<path d="M${cx - r} ${cy + r * 0.8} Q${cx - r} ${cy - r} ${cx} ${cy - r} Q${cx + r} ${cy - r} ${cx + r} ${cy + r * 0.8} L${cx + r * 1.15} ${cy + r} L${cx - r * 1.15} ${cy + r} Z" />
   <circle cx="${cx}" cy="${cy + r * 1.15}" r="${r * 0.16}" />
   <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy - r * 1.8}" stroke-width="4" stroke="currentColor"/>`;

const roofline = (y, r) => {
  let d = `M0 ${H} L0 ${y}`;
  let x = 0;
  while (x < W) {
    const w = 40 + r() * 80;
    const peak = y - 10 - r() * 35;
    d += ` L${x + w * 0.5} ${peak} L${x + w} ${y + (r() - 0.5) * 14}`;
    x += w;
  }
  return `<path d="${d} L${W} ${H} Z" />`;
};

const stones = (y, n, r) => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = 30 + r() * (W - 60);
    const h2 = 14 + r() * 42;
    const w2 = 10 + r() * 16;
    const tilt = (r() - 0.5) * 16;
    out += `<rect x="${x}" y="${y - h2}" width="${w2}" height="${h2}" rx="4" transform="rotate(${tilt} ${x} ${y})"/>`;
  }
  return out;
};

const stair = (r) => {
  let out = '';
  let y = H - 20;
  let x = W * 0.62;
  for (let i = 0; i < 12; i++) {
    const w2 = 130 - i * 8;
    out += `<rect x="${x - w2 / 2}" y="${y}" width="${w2}" height="9" rx="3" transform="rotate(${(r() - 0.5) * 5} ${x} ${y})"/>`;
    y -= 34;
    x += (r() - 0.5) * 30;
  }
  return out;
};

const hearth = (cx, cy) =>
  `<rect x="${cx - 55}" y="${cy - 40}" width="110" height="80" rx="6"/>
   <path d="M${cx - 14} ${cy + 24} Q${cx - 18} ${cy - 6} ${cx} ${cy - 22} Q${cx + 16} ${cy - 4} ${cx + 12} ${cy + 24} Z" fill="#d9a441" opacity="0.85"/>`;

const causeway = (r) => {
  let out = '';
  for (let i = 0; i < 9; i++) {
    const t = i / 9;
    const y = H * 0.62 + t * (H * 0.36);
    const w2 = 60 + t * 260;
    out += `<ellipse cx="${W / 2 + (r() - 0.5) * 24}" cy="${y}" rx="${w2 / 2}" ry="${5 + t * 9}"/>`;
  }
  return out;
};

function scene(slot, r) {
  if (/belfry|silent-bell|ending-keeper/.test(slot))
    return tower(W * 0.36, 220, 300) + `<g fill="#c8b088" opacity="0.9">${bell(W * 0.5, H * 0.34, 46)}</g>`;
  if (/grave/.test(slot)) return stones(H * 0.86, 14, r) + causeway(r);
  if (/stair|descent/.test(slot)) return stair(r);
  if (/harbor-row/.test(slot)) return roofline(H * 0.55, r) + hearth(W * 0.68, H * 0.72);
  if (/nave/.test(slot)) return `<g>${stones(H * 0.8, 9, r)}</g>` + tower(W * 0.1, 120, 180);
  if (/causeway|tideline|shore/.test(slot)) return causeway(r) + tower(W * 0.72, 90, 150);
  if (/village|square|edge/.test(slot)) return roofline(H * 0.6, r) + tower(W * 0.6, 110, 220);
  if (/crypt|hollow/.test(slot)) return stones(H * 0.9, 8, r) + `<ellipse cx="${W / 2}" cy="${H * 0.55}" rx="150" ry="60" fill="rgba(0,0,0,0.55)"/>`;
  if (/ending-tide/.test(slot)) return causeway(r);
  if (/ending-silence/.test(slot)) return `<g opacity="0.6">${bell(W / 2, H * 0.78, 50)}</g>`;
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
  <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="${p.sea}"/>
  <rect y="${horizon - 26}" width="${W}" height="52" fill="${p.mist}" opacity="0.10"/>
  <rect y="${horizon - 8}" width="${W}" height="16" fill="${p.mist}" opacity="0.14"/>
  <g fill="rgba(6,8,9,0.88)">${scene(slot, r)}</g>
  <rect width="${W}" height="${H}" fill="transparent" filter="url(#grain)"/>
  <rect width="${W}" height="${H}" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="6"/>
</svg>\n`;
}

mkdirSync(OUT_DIR, { recursive: true });
let count = 0;
for (const file of readdirSync(MANIFEST_DIR)) {
  if (!file.endsWith('.json')) continue;
  const manifest = JSON.parse(readFileSync(join(MANIFEST_DIR, file), 'utf8'));
  for (const { slot } of manifest.slots ?? []) {
    writeFileSync(join(OUT_DIR, `${slot}.svg`), render(slot));
    count++;
  }
}
console.log(`wrote ${count} placeholder SVGs to ${OUT_DIR}`);
