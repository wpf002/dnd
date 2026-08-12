#!/usr/bin/env node
/**
 * The homescreen icons the manifest promises.
 *
 *   node tools/generate-icons.mjs
 *
 * manifest.webmanifest has always named icon-192.png and icon-512.png and the
 * directory has always been empty, which means the install prompt never
 * appeared: a manifest whose icons 404 is not installable. Drawn here rather
 * than committed as opaque binaries nobody can regenerate — deterministic, no
 * dependencies, same two files every run.
 */
// The homescreen icon: a lantern, drawn as a rounded frame with a lit core.
// Deterministic, no dependencies — the same two files every time.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const INK = [0x0b, 0x0a, 0x09];
const EMBER = [0xd9, 0xa0, 0x5b];
const GLOW = [0xf5, 0xe0, 0xb8];

function draw(size) {
  const px = (x, y) => (y * size + x) * 4;
  const buf = Buffer.alloc(size * size * 4);
  const set = ([r, g, b], i, a = 255) => {
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };
  for (let i = 0; i < size * size; i++) set(INK, i * 4);

  const c = size / 2;
  const bodyW = size * 0.30;
  const bodyTop = size * 0.30;
  const bodyBot = size * 0.76;
  const stroke = Math.max(2, size * 0.035);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - c);
      const dy = y;
      const i = px(x, y);

      // The flame: a soft radial core inside the housing.
      const fd = Math.hypot(x - c, y - (bodyTop + bodyBot) / 2);
      const fr = size * 0.11;
      if (fd < fr) {
        const t = 1 - fd / fr;
        set(GLOW, i, Math.round(255 * Math.min(1, t * 1.6)));
        continue;
      }
      if (fd < fr * 2.1) {
        const t = 1 - (fd - fr) / (fr * 1.1);
        set(EMBER, i, Math.round(90 * Math.max(0, t)));
      }

      // The housing: two uprights, a cap and a base.
      const onUpright = Math.abs(dx - bodyW) < stroke && dy > bodyTop && dy < bodyBot;
      const onCap = Math.abs(dy - bodyTop) < stroke && dx < bodyW + stroke;
      const onBase = Math.abs(dy - bodyBot) < stroke && dx < bodyW + stroke;
      // The hoop above it.
      const hd = Math.hypot(x - c, y - size * 0.20);
      const onHoop = Math.abs(hd - size * 0.085) < stroke * 0.8 && y < bodyTop;
      if (onUpright || onCap || onBase || onHoop) set(EMBER, i);
    }
  }

  // PNG: one filter byte per scanline, then deflate.
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    buf.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let TABLE;
function crc32(buf) {
  if (!TABLE) {
    TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TABLE[n] = c;
    }
  }
  let c = -1;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

for (const size of [192, 512]) {
  writeFileSync(`apps/web/public/icons/icon-${size}.png`, draw(size));
  console.log(`icon-${size}.png`);
}
