// Génère les icônes PNG de l'appli (la tête du commissaire Parpaing), sans dépendance.
// Usage : node tools/make-icons.js
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const OUT = path.join(__dirname, '..', 'icons');
const N = 1024; // dessin suréchantillonné, puis réduit

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function draw(scale) {
  const px = new Float32Array(N * N * 3);
  const paint = (test, col) => {
    const c = hex(col);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      // coordonnées normalisées, recentrées pour la version « maskable »
      const u = 0.5 + ((x + 0.5) / N - 0.5) / scale, v = 0.5 + ((y + 0.5) / N - 0.5) / scale;
      if (test(u, v)) { const i = (y * N + x) * 3; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; }
    }
  };
  const rrect = (x0, y0, x1, y1, r) => (u, v) => {
    if (u < x0 || u > x1 || v < y0 || v > y1) return false;
    const dx = Math.max(x0 + r - u, 0, u - (x1 - r)), dy = Math.max(y0 + r - v, 0, v - (y1 - r));
    return dx * dx + dy * dy <= r * r;
  };
  const circ = (cx, cy, r) => (u, v) => (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
  const rot = (cx, cy, w, h, a, r) => { const t = rrect(-w / 2, -h / 2, w / 2, h / 2, r), c = Math.cos(a), s = Math.sin(a); return (u, v) => { const dx = u - cx, dy = v - cy; return t(dx * c + dy * s, -dx * s + dy * c); }; };

  // fond bleu police, liseré gyrophare en bas
  const all = () => true;
  for (let i = 0; i < N * N; i++) { const c = hex('#3d6fd6'); px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2]; }
  paint((u, v) => v > 0.93 && u < 0.5, '#ff4b5c'); paint((u, v) => v > 0.93 && u >= 0.5, '#1b2a5c');
  void all;
  // le parpaing
  paint(rrect(0.17, 0.38, 0.83, 0.88, 0.05), '#a3a8b0');
  paint(rrect(0.17, 0.82, 0.83, 0.88, 0.03), '#8d929b');
  paint(rrect(0.24, 0.45, 0.46, 0.66, 0.02), '#4b4f57');
  paint(rrect(0.54, 0.45, 0.76, 0.66, 0.02), '#4b4f57');
  paint(circ(0.35, 0.555, 0.08), '#ffffff'); paint(circ(0.65, 0.555, 0.08), '#ffffff');
  paint(circ(0.372, 0.57, 0.037), '#111111'); paint(circ(0.628, 0.57, 0.037), '#111111');
  paint(rot(0.35, 0.425, 0.2, 0.035, 0.28, 0.015), '#3b2a1e'); paint(rot(0.65, 0.425, 0.2, 0.035, -0.28, 0.015), '#3b2a1e');
  paint(rot(0.405, 0.76, 0.21, 0.07, 0.25, 0.03), '#3b2a1e'); paint(rot(0.595, 0.76, 0.21, 0.07, -0.25, 0.03), '#3b2a1e');
  // le képi
  paint(rrect(0.27, 0.15, 0.73, 0.35, 0.05), '#16224a');
  paint(rrect(0.27, 0.29, 0.73, 0.335, 0.005), '#ffc93c');
  paint(rrect(0.22, 0.335, 0.78, 0.37, 0.015), '#0b1026');
  paint(circ(0.5, 0.22, 0.04), '#ffc93c');
  return px;
}
function resize(px, size) {
  const out = Buffer.alloc(size * size * 4), r = N / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let a = 0, b = 0, c = 0, n = 0;
    for (let sy = Math.floor(y * r); sy < Math.floor((y + 1) * r); sy++) for (let sx = Math.floor(x * r); sx < Math.floor((x + 1) * r); sx++) { const i = (sy * N + sx) * 3; a += px[i]; b += px[i + 1]; c += px[i + 2]; n++; }
    const o = (y * size + x) * 4; out[o] = a / n; out[o + 1] = b / n; out[o + 2] = c / n; out[o + 3] = 255;
  }
  return out;
}
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(rgba, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

fs.mkdirSync(OUT, { recursive: true });
const normal = draw(1), maskable = draw(0.78); // zone sûre des icônes « maskable » : 80 % central
const jobs = [['icon-512.png', normal, 512], ['icon-192.png', normal, 192], ['apple-touch-icon.png', normal, 180], ['favicon-64.png', normal, 64], ['icon-maskable-512.png', maskable, 512]];
for (const [name, px, size] of jobs) { fs.writeFileSync(path.join(OUT, name), png(resize(px, size), size)); console.log('icons/' + name); }
