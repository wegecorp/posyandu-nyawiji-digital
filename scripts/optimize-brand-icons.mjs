import fs from "fs";
import path from "path";
import zlib from "zlib";

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodeIndexedPNG(width, height, palette, tRNS, pixelIndices) {
  // Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // color type: indexed
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk("IHDR", ihdr);

  // PLTE
  const plteBuf = Buffer.alloc(palette.length * 3);
  for (let i = 0; i < palette.length; i++) {
    plteBuf[i * 3] = palette[i][0];
    plteBuf[i * 3 + 1] = palette[i][1];
    plteBuf[i * 3 + 2] = palette[i][2];
  }
  const plteChunk = makeChunk("PLTE", plteBuf);

  // tRNS
  let trnsChunk = null;
  if (tRNS && tRNS.length > 0) {
    const trnsBuf = Buffer.from(tRNS);
    trnsChunk = makeChunk("tRNS", trnsBuf);
  }

  // Raw scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width + 1);
    scanlines[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      scanlines[rowOffset + 1 + x] = pixelIndices[y * width + x];
    }
  }

  const compressedData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk("IDAT", compressedData);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat(
    trnsChunk
      ? [sig, ihdrChunk, plteChunk, trnsChunk, idatChunk, iendChunk]
      : [sig, ihdrChunk, plteChunk, idatChunk, iendChunk]
  );
}

// Cubic bezier evaluation
function cubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

// Check point in polygon
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Generate heart polygon approximation
function getHeartPoly(size, heartWidth) {
  const s = heartWidth / 100;
  const h = 88 * s;
  const ox = (size - heartWidth) / 2;
  const oy = (size - h) / 2;

  const beziers = [
    [[50, 88], [8, 58], [0, 32], [0, 20]],
    [[0, 20], [0, 8], [8, 0], [18, 0]],
    [[18, 0], [30, 0], [42, 10], [50, 24]],
    [[50, 24], [58, 10], [70, 0], [82, 0]],
    [[82, 0], [92, 0], [100, 8], [100, 20]],
    [[100, 20], [100, 32], [92, 58], [50, 88]],
  ];

  const poly = [];
  for (const b of beziers) {
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = cubicBezier(b[0][0], b[1][0], b[2][0], b[3][0], t) * s + ox;
      const y = cubicBezier(b[0][1], b[1][1], b[2][1], b[3][1], t) * s + oy;
      poly.push([x, y]);
    }
  }
  return poly;
}

// Rounded rectangle test
function inRoundedRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  if (x < r && y < r) return (x - r) * (x - r) + (y - r) * (y - r) <= r * r;
  if (x >= w - r && y < r) return (x - (w - r)) * (x - (w - r)) + (y - r) * (y - r) <= r * r;
  if (x < r && y >= h - r) return (x - r) * (x - r) + (y - (h - r)) * (y - (h - r)) <= r * r;
  if (x >= w - r && y >= h - r) return (x - (w - r)) * (x - (w - r)) + (y - (h - r)) * (y - (h - r)) <= r * r;
  return true;
}

function renderRaster(size, maskable) {
  // Supersampling 2x for smooth antialiasing
  const ss = 2;
  const width = size;
  const height = size;
  const heartPoly = getHeartPoly(size * ss, (maskable ? 0.55 : 0.5) * size * ss);
  const rad = Math.round(size * ss * 0.22);

  // Palette:
  // 0: Transparent
  // 1: Green #075e54
  // 2: White #ffffff
  // 3-10: Antialiased transitions
  const palette = [
    [0, 0, 0],       // 0: transparent
    [7, 94, 84],     // 1: green (#075e54)
    [255, 255, 255], // 2: white
  ];
  const tRNS = [0, 255, 255];

  // Add blend colors between green and white
  for (let i = 1; i <= 7; i++) {
    const f = i / 8;
    const r = Math.round(7 * (1 - f) + 255 * f);
    const g = Math.round(94 * (1 - f) + 255 * f);
    const b = Math.round(84 * (1 - f) + 255 * f);
    palette.push([r, g, b]);
    tRNS.push(255);
  }

  // Add blend colors between green and transparent (for rounded corners if not maskable)
  for (let i = 1; i <= 7; i++) {
    const alpha = Math.round((i / 8) * 255);
    palette.push([7, 94, 84]);
    tRNS.push(alpha);
  }

  const pixelIndices = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let bgCount = 0;
      let heartCount = 0;
      const totalSamples = ss * ss;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x * ss + sx + 0.5;
          const py = y * ss + sy + 0.5;

          const inBg = maskable ? true : inRoundedRect(px, py, size * ss, size * ss, rad);
          if (inBg) {
            bgCount++;
            if (pointInPoly(px, py, heartPoly)) {
              heartCount++;
            }
          }
        }
      }

      if (bgCount === 0) {
        pixelIndices[y * width + x] = 0; // Transparent
      } else if (heartCount === totalSamples) {
        pixelIndices[y * width + x] = 2; // Full White
      } else if (heartCount > 0) {
        // Blend white on green
        const blend = Math.round((heartCount / totalSamples) * 7);
        pixelIndices[y * width + x] = Math.max(3, Math.min(10, 2 + blend));
      } else if (bgCount === totalSamples) {
        pixelIndices[y * width + x] = 1; // Full Green
      } else {
        // Corner antialiasing
        const blend = Math.round((bgCount / totalSamples) * 7);
        pixelIndices[y * width + x] = Math.max(11, Math.min(18, 10 + blend));
      }
    }
  }

  return encodeIndexedPNG(width, height, palette, tRNS, pixelIndices);
}

const targets = [
  { name: "logo-192.png", size: 192, maskable: false },
  { name: "logo-512.png", size: 512, maskable: false },
  { name: "logo-maskable-512.png", size: 512, maskable: true },
  { name: "logo-apple-180.png", size: 180, maskable: false },
];

const brandDir = path.resolve("public/brand");
if (!fs.existsSync(brandDir)) {
  fs.mkdirSync(brandDir, { recursive: true });
}

for (const t of targets) {
  const buf = renderRaster(t.size, t.maskable);
  const out = path.join(brandDir, t.name);
  fs.writeFileSync(out, buf);
  console.log(`Wrote ${t.name}: ${(buf.length / 1024).toFixed(2)} KB`);
}
