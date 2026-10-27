// Zero-dependency PWA icon generator: draws the game icon (rounded tile +
// chibi face) and encodes PNGs with Node's built-in zlib.
// Usage: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- drawing helpers -----------------------------------------------------
// Canvas model: size x size pixels. We draw on a straight grid and scale.
function circleEq(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function insideRoundedRect(x, y, size, cornerR) {
  if (x < cornerR && y < cornerR) return circleEq(x, y, cornerR, cornerR, cornerR);
  if (x > size - cornerR && y < cornerR)
    return circleEq(x, y, size - cornerR, cornerR, cornerR);
  if (x < cornerR && y > size - cornerR)
    return circleEq(x, y, cornerR, size - cornerR, cornerR);
  if (x > size - cornerR && y > size - cornerR)
    return circleEq(x, y, size - cornerR, size - cornerR, cornerR);
  return true;
}

function paintIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  };

  const cream = [253, 251, 247]; // #fdfbf7
  const brown = [74, 63, 53]; // #4a3f35
  const pink = [240, 167, 160]; // blush #f0a7a0
  const white = [255, 255, 255];

  const c = size; // center-ish coordinates scale with size
  // rounded tile radius
  const cornerR = c * 0.19;
  // face
  const faceR = c * 0.31;
  const faceCx = c / 2;
  const faceCy = c * 0.56;
  const eyeR = c * 0.052;
  const eyeOffX = c * 0.14;
  const eyeY = c * 0.52;
  const blushR = c * 0.06;
  const blushOffX = c * 0.245;
  const blushY = c * 0.62;
  // heart
  const hx = c / 2;
  const hy = c * 0.34;
  const s = c * 0.085;

  function heartInside(x, y) {
    // classic two-lobe heart, roughly ( (x^2+y^2-s^2)^3 - x^2 y^2 <= 0 )
    const a = x, b = y - s * 0.5;
    return (a * a + b * b - s * s) ** 3 - (s * 0.6) ** 2 * a * a * b * b <= 0;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!insideRoundedRect(x + 0.5, y + 0.5, size, cornerR)) continue;
      if (circleEq(x + 0.5, y + 0.5, faceCx, faceCy, faceR)) {
        // face: heart on top? heart is above face, so just face cream
        set(x, y, cream);
      } else {
        set(x, y, white);
      }
    }
  }
  // heart over the tile (above the face)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x + 0.5 - hx;
      const fy = y + 0.5 - hy;
      if (insideRoundedRect(x + 0.5, y + 0.5, size, cornerR) && heartInside(fx, fy)) {
        set(x, y, pink);
      }
    }
  }
  // eyes
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px2 = x + 0.5, py = y + 0.5;
      if (circleEq(px2, py, faceCx - eyeOffX, eyeY, eyeR) || circleEq(px2, py, faceCx + eyeOffX, eyeY, eyeR)) {
        set(x, y, brown);
      }
    }
  }
  // blush
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px2 = x + 0.5, py = y + 0.5;
      if (
        circleEq(px2, py, faceCx - blushOffX, blushY, blushR) ||
        circleEq(px2, py, faceCx + blushOffX, blushY, blushR)
      ) {
        set(x, y, pink);
      }
    }
  }
  return px;
}

// ---- PNG encoding ----------------------------------------------------------
function crc32(buf) {
  const crc = [0];
  for (let i = 0; i < 256; i++) {
    let x = i;
    for (let j = 0; j < 8; j++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1;
    crc[i] = x;
  }
  let c = 0;
  for (let n = 0; n < buf.length; n++) c = crc[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crcBuf]);
}

function encodePng(size, rgba) {
  // filter byte 0 (None) per row, raw = filter + row bytes
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    rgba.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

mkdirSync(join(root, 'public/icons'), { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(join(root, `public/icons/icon-${size}x${size}.png`), encodePng(size, paintIcon(size)));
  console.log(`wrote public/icons/icon-${size}x${size}.png`);
}
