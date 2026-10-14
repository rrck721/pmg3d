// Tiny software rasteriser to inspect the procedural model without a GPU.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const src = ['core', 'body', 'face', 'hair', 'main'].map(n => fs.readFileSync(path.join(__dirname, '../src', n + '.js'), 'utf8')).join('\n');
const build = new Function(src + '\nreturn buildModel;')();
const t0 = Date.now(); const parts = build(); console.log('build ms', Date.now() - t0, 'parts', parts.map(p => p.id + ':' + p.pos.length / 3).join(' '));
let tris = 0; parts.forEach(p => tris += p.idx.length / 3); console.log('tris', tris);
const COL = { skin: [.75, .55, .42], lips: [.62, .36, .33], skinDark: [.55, .38, .3], teeth: [.95, .93, .88], mouth: [.15, .06, .06], nostril: [.2, .1, .08], sclera: [.95, .93, .92], iris: [.25, .14, .08], cornea: [.9, .95, 1], lash: [.05, .04, .04], brow: [.1, .07, .06], nail: [.85, .65, .6], hair: [.12, .11, .12], hairCap: [.1, .1, .1], blazer: [.29, .2, .18], blazerLining: [.14, .09, .09], blazerSeam: [.2, .13, .12], top: [.24, .17, .16], trousers: [.26, .17, .17], trousersSeam: [.2, .13, .13], button: [.12, .08, .07], buttonHole: [0, 0, 0], shoe: [.8, .69, .58], shoeSole: [.65, .55, .46], metal: [.75, .75, .78], gem: [1, 1, 1], dial: [.95, .95, .93], glass: [.8, .9, 1] };
function png(w, h, rgb) { const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); } const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }; const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
function render(file, { only = null, az = 0, el = 0, cx = 0, cy = 0.81, cz = 0, scale = 1, w = 560, h = 900, ss = 2 }) {
  const W = w * ss, H = h * ss; const zb = new Float32Array(W * H).fill(-1e9); const img = new Float32Array(W * H * 3); for (let i = 0; i < W * H; i++) { img[i * 3] = .86; img[i * 3 + 1] = .87; img[i * 3 + 2] = .89; }
  const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
  // camera looks at target from direction (sa*ce, se, ca*ce)
  const fwd = [-(sa * ce), -se, -(ca * ce)];
  const right = [ca, 0, -sa]; // for az=0: +x
  const up = [-(sa * se) * -1 * 0 + 0, 0, 0];
  const upv = [-sa * se * -1, ce, -ca * se * -1];
  const U = [-sa * se, ce, -ca * se]; // up vector perpendicular to fwd
  const pxPerM = (H / 2.05) * scale;
  const L = [-0.4, 0.7, 0.6]; const Ln = (() => { const l = Math.hypot(...L); return L.map(v => v / l); })();
  // light follows camera (headlight-ish)
  const Lc = [right[0] * Ln[0] + U[0] * Ln[1] + (-fwd[0]) * Ln[2], right[1] * Ln[0] + U[1] * Ln[1] + (-fwd[1]) * Ln[2], right[2] * Ln[0] + U[2] * Ln[1] + (-fwd[2]) * Ln[2]];
  for (const part of parts) {
    if (only && !only.includes(part.mat)) continue;
    if (part.mat === 'cornea' || part.mat === 'glass') continue;
    const c = COL[part.mat] || [1, 0, 1]; const P = part.pos, N = part.nor, I = part.idx, CL = part.col;
    const sx = new Float32Array(P.length / 3), sy = new Float32Array(P.length / 3), sz = new Float32Array(P.length / 3);
    for (let v = 0; v < P.length / 3; v++) { const x = P[v * 3] - cx, y = P[v * 3 + 1] - cy, z = P[v * 3 + 2] - cz; sx[v] = W / 2 + (x * right[0] + y * right[1] + z * right[2]) * pxPerM; sy[v] = H / 2 - (x * U[0] + y * U[1] + z * U[2]) * pxPerM; sz[v] = -(x * fwd[0] + y * fwd[1] + z * fwd[2]); }
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], cc = I[t + 2];
      const ax = sx[a], ay = sy[a], bx = sx[b], by = sy[b], cx2 = sx[cc], cy2 = sy[cc];
      const area = (bx - ax) * (cy2 - ay) - (by - ay) * (cx2 - ax); if (area >= 0) continue; // backface (screen y down)
      const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx2))), maxx = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx2))), miny = Math.max(0, Math.floor(Math.min(ay, by, cy2))), maxy = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy2)));
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const px = x + .5, py = y + .5; const w0 = ((bx - px) * (cy2 - py) - (by - py) * (cx2 - px)) / area, w1 = ((cx2 - px) * (ay - py) - (cy2 - py) * (ax - px)) / area, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue; const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[cc]; const idx = y * W + x; if (z <= zb[idx]) continue; zb[idx] = z;
        const nx = w0 * N[a * 3] + w1 * N[b * 3] + w2 * N[cc * 3], ny = w0 * N[a * 3 + 1] + w1 * N[b * 3 + 1] + w2 * N[cc * 3 + 1], nz = w0 * N[a * 3 + 2] + w1 * N[b * 3 + 2] + w2 * N[cc * 3 + 2];
        const nl = Math.hypot(nx, ny, nz) || 1; // lighting in world space
        const lam = Math.max(0, (nx * Lc[0] + ny * Lc[1] + nz * Lc[2]) / nl); const sh = 0.32 + 0.78 * lam; const hemi = 0.15 * (ny / nl);
        let cr = c[0], cg = c[1], cb = c[2]; if (CL) { const k = w0 * CL[a * 3] + w1 * CL[b * 3] + w2 * CL[cc * 3]; cr *= k; cg *= k; cb *= k; }
        img[idx * 3] = Math.min(1, cr * (sh + hemi)); img[idx * 3 + 1] = Math.min(1, cg * (sh + hemi)); img[idx * 3 + 2] = Math.min(1, cb * (sh + hemi));
      }
    }
  }
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0, g = 0, b = 0; for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) { const k = ((y * ss + j) * W + x * ss + i) * 3; r += img[k]; g += img[k + 1]; b += img[k + 2]; } const n = ss * ss; const o = (y * w + x) * 3; out[o] = Math.round(Math.pow(r / n, 1 / 1.6) * 255); out[o + 1] = Math.round(Math.pow(g / n, 1 / 1.6) * 255); out[o + 2] = Math.round(Math.pow(b / n, 1 / 1.6) * 255); }
  fs.writeFileSync(file, png(w, h, out));
}
const outDir = process.argv[2] || '/tmp/r'; fs.mkdirSync(outDir, { recursive: true });
const views = JSON.parse(process.argv[3] || '{"front":{},"side":{"az":1.5708},"back":{"az":3.1416},"tq":{"az":0.65}}');
for (const k in views) { render(path.join(outDir, k + '.png'), views[k]); console.log('wrote', k); }
