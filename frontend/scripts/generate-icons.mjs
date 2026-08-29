/**
 * Gera os ícones PNG do myBooks a partir da mesma marca do `public/logo.svg`.
 *
 * O SVG resolve favicon e interface, mas iOS e o manifesto do PWA ainda pedem
 * PNG. Em vez de depender de uma ferramenta externa, desenhamos a marca aqui
 * com supersampling e escrevemos o PNG na mão — assim o ícone pode ser
 * regerado a qualquer momento com `npm run icons`.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const SS = 4; // amostras por eixo

// ─── Cor ──────────────────────────────────────────────────────────────────────

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Gradiente de várias paradas ao longo de t ∈ [0,1]. */
function ramp(stops, t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (clamped <= p1) return mix(c0, c1, (clamped - p0) / (p1 - p0 || 1));
  }
  return stops[stops.length - 1][1];
}

// ─── Formas ───────────────────────────────────────────────────────────────────

/** Retângulo de cantos arredondados, opcionalmente girado em torno de um ponto. */
function roundRect(x, y, w, h, r, rotation = 0, cx = 0, cy = 0) {
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  return (px, py) => {
    let qx = px;
    let qy = py;
    if (rotation) {
      const dx = px - cx;
      const dy = py - cy;
      qx = cx + dx * cos - dy * sin;
      qy = cy + dx * sin + dy * cos;
    }
    if (qx < x || qx > x + w || qy < y || qy > y + h) return false;
    const ix = Math.min(Math.max(qx, x + r), x + w - r);
    const iy = Math.min(Math.max(qy, y + r), y + h - r);
    return (qx - ix) ** 2 + (qy - iy) ** 2 <= r * r;
  };
}

// ─── Desenho ──────────────────────────────────────────────────────────────────

function drawLogo(size) {
  const W = size * SS;
  const buf = new Float32Array(W * W * 4);
  const u = W / 512; // escala a partir do desenho de referência 512×512

  const bgStops = [
    [0, hex("#5D8E68")],
    [0.55, hex("#4B7A57")],
    [1, hex("#2F4F39")],
  ];

  const paint = (test, color, alpha = 1) => {
    for (let py = 0; py < W; py++) {
      for (let px = 0; px < W; px++) {
        if (!test(px, py)) continue;
        const [r, g, b] = typeof color === "function" ? color(px, py) : color;
        const i = (py * W + px) * 4;
        const a = alpha;
        buf[i] = buf[i] * (1 - a) + r * a;
        buf[i + 1] = buf[i + 1] * (1 - a) + g * a;
        buf[i + 2] = buf[i + 2] * (1 - a) + b * a;
        buf[i + 3] = buf[i + 3] * (1 - a) + 255 * a;
      }
    }
  };

  // Fundo com gradiente na diagonal
  paint(
    roundRect(0, 0, W, W, 118 * u),
    (px, py) => ramp(bgStops, (px / W + py / W) / 2)
  );

  // Brilho no topo, como o `mb-sheen` do SVG
  paint(
    (px, py) => py < 210 * u && px >= 0 && px < W,
    () => [255, 255, 255],
    0.0
  );
  for (let py = 0; py < 210 * u; py++) {
    const a = 0.3 * (1 - py / (210 * u));
    for (let px = 0; px < W; px++) {
      const i = (py * W + px) * 4;
      if (buf[i + 3] === 0) continue;
      buf[i] = buf[i] * (1 - a) + 255 * a;
      buf[i + 1] = buf[i + 1] * (1 - a) + 255 * a;
      buf[i + 2] = buf[i + 2] * (1 - a) + 255 * a;
    }
  }

  // Lombadas
  const spine = (x, y, w, h, top, bottom, bandColor, bandY, rot = 0, cx = 0, cy = 0) => {
    paint(
      roundRect(x * u, y * u, w * u, h * u, 20 * u, rot, cx * u, cy * u),
      (px, py) => {
        const t = (py / u - y) / h;
        return mix(hex(top), hex(bottom), Math.min(Math.max(t, 0), 1));
      }
    );
    paint(
      roundRect(x * u, bandY * u, w * u, 13 * u, 6.5 * u, rot, cx * u, cy * u),
      hex(bandColor),
      0.5
    );
  };

  spine(126, 178, 62, 216, "#FBF6EA", "#EADFC8", "#2F4F39", 214);
  spine(200, 146, 66, 248, "#F0BC63", "#D9922F", "#7A4E12", 186);
  spine(298, 166, 64, 228, "#DC7A5E", "#B9503A", "#6E2A18", 204, (14 * Math.PI) / 180, 330, 394);

  // Prateleira
  paint(roundRect(104 * u, 396 * u, 304 * u, 20 * u, 10 * u), hex("#FBF6EA"), 0.95);
  paint(roundRect(104 * u, 416 * u, 304 * u, 8 * u, 4 * u), hex("#12210F"), 0.22);

  // Downsample para o tamanho final
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
          r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; a += buf[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

// ─── PNG ──────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bits por canal
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compressão
  ihdr[11] = 0; // filtro
  ihdr[12] = 0; // sem entrelaçamento

  // Cada linha começa com o byte de filtro (0 = nenhum)
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── Saída ────────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

for (const [name, size] of [
  ["icon-512.png", 512],
  ["icon-192.png", 192],
  ["apple-touch-icon.png", 180],
  ["favicon-64.png", 64],
]) {
  const png = encodePng(size, drawLogo(size));
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`✓ ${name} (${size}×${size}, ${(png.length / 1024).toFixed(1)} kB)`);
}
