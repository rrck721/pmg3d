/* ===== Geometry core: pure JS, no dependencies ===== */
const PI = Math.PI, TAU = Math.PI * 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlen = (a) => Math.sqrt(dot(a, a));
const norm = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const dist3 = (a, b) => vlen(sub(a, b));
const gauss = (x, s) => Math.exp(-(x * x) / (2 * s * s));
const mirrorX = (p) => [-p[0], p[1], p[2]];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(ix, iy) { let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (lerp(lerp(hash2(ix, iy), hash2(ix + 1, iy), u), lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), u), v)) * 2 - 1; }

/* Cardinal-interpolated table lookup. rows: [[key, v1, v2, ...], ...] ascending by key */
function table(rows, k) {
  const n = rows.length;
  if (k <= rows[0][0]) return rows[0].slice(1);
  if (k >= rows[n - 1][0]) return rows[n - 1].slice(1);
  let i = 0; while (i < n - 2 && k > rows[i + 1][0]) i++;
  const r0 = rows[Math.max(0, i - 1)], r1 = rows[i], r2 = rows[i + 1], r3 = rows[Math.min(n - 1, i + 2)];
  const t = (k - r1[0]) / (r2[0] - r1[0]);
  const out = [];
  for (let c = 1; c < r1.length; c++) {
    const m1 = (r2[c] - r0[c]) / Math.max(1e-9, (r2[0] - r0[0])) * (r2[0] - r1[0]);
    const m2 = (r3[c] - r1[c]) / Math.max(1e-9, (r3[0] - r1[0])) * (r2[0] - r1[0]);
    const t2 = t * t, t3 = t2 * t;
    out.push((2 * t3 - 3 * t2 + 1) * r1[c] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * r2[c] + (t3 - t2) * m2);
  }
  return out;
}

/* ---------- Mesh container ---------- */
class Mesh {
  constructor(mat) { this.mat = mat; this.pos = []; this.uv = []; this.col = null; this.idx = []; }
  get count() { return this.pos.length / 3; }
  addV(p, uv, col) {
    this.pos.push(p[0], p[1], p[2]);
    this.uv.push(uv ? uv[0] : 0, uv ? uv[1] : 0);
    if (col && !this.col) { this.col = new Array(this.pos.length - 3).fill(1); }
    if (this.col) { if (col) this.col.push(col[0], col[1], col[2]); else this.col.push(1, 1, 1); }
    return this.pos.length / 3 - 1;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  append(o) {
    const off = this.count;
    if (o.col && !this.col) this.col = new Array(this.pos.length).fill(1);
    for (let i = 0; i < o.pos.length; i++) this.pos.push(o.pos[i]);
    for (let i = 0; i < o.uv.length; i++) this.uv.push(o.uv[i]);
    if (this.col) { if (o.col) for (let i = 0; i < o.col.length; i++) this.col.push(o.col[i]); else for (let i = 0; i < o.pos.length; i++) this.col.push(1); }
    for (let i = 0; i < o.idx.length; i++) this.idx.push(o.idx[i] + off);
    return this;
  }
  transform(fn) { for (let i = 0; i < this.pos.length; i += 3) { const p = fn([this.pos[i], this.pos[i + 1], this.pos[i + 2]]); this.pos[i] = p[0]; this.pos[i + 1] = p[1]; this.pos[i + 2] = p[2]; } return this; }
  /* mirror across x=0, returns new mesh with corrected winding */
  mirrored() {
    const m = new Mesh(this.mat); m.pos = this.pos.slice(); m.uv = this.uv.slice(); m.col = this.col ? this.col.slice() : null;
    for (let i = 0; i < m.pos.length; i += 3) m.pos[i] = -m.pos[i];
    m.idx = new Array(this.idx.length);
    for (let i = 0; i < this.idx.length; i += 3) { m.idx[i] = this.idx[i]; m.idx[i + 1] = this.idx[i + 2]; m.idx[i + 2] = this.idx[i + 1]; }
    return m;
  }
  P(i) { return [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]]; }
}

function computeNormals(m) {
  const n = m.count, acc = new Float64Array(n * 3);
  for (let i = 0; i < m.idx.length; i += 3) {
    const a = m.idx[i], b = m.idx[i + 1], c = m.idx[i + 2];
    const pa = m.P(a), pb = m.P(b), pc = m.P(c);
    const f = cross(sub(pb, pa), sub(pc, pa));
    for (const v of [a, b, c]) { acc[v * 3] += f[0]; acc[v * 3 + 1] += f[1]; acc[v * 3 + 2] += f[2]; }
  }
  // weld by position
  const map = new Map(), q = 1e5;
  for (let v = 0; v < n; v++) {
    const k = Math.round(m.pos[v * 3] * q) + ',' + Math.round(m.pos[v * 3 + 1] * q) + ',' + Math.round(m.pos[v * 3 + 2] * q);
    let e = map.get(k); if (!e) { e = [0, 0, 0]; map.set(k, e); }
    e[0] += acc[v * 3]; e[1] += acc[v * 3 + 1]; e[2] += acc[v * 3 + 2];
  }
  const nor = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    const k = Math.round(m.pos[v * 3] * q) + ',' + Math.round(m.pos[v * 3 + 1] * q) + ',' + Math.round(m.pos[v * 3 + 2] * q);
    const e = map.get(k); const nn = norm(e);
    nor[v * 3] = nn[0]; nor[v * 3 + 1] = nn[1]; nor[v * 3 + 2] = nn[2];
  }
  return nor;
}

/* ---------- Loft through rings ---------- */
const UV_TILE = 0.08;
function loft(mesh, rings, o = {}) {
  const closed = o.closed !== false, R = rings.length, n = rings[0].length, cols = closed ? n + 1 : n;
  const base = mesh.count, tile = o.tile || UV_TILE;
  const cents = rings.map(r => { let c = [0, 0, 0]; for (const p of r) c = add(c, p); return mul(c, 1 / r.length); });
  let vAcc = 0;
  for (let i = 0; i < R; i++) {
    if (i > 0) vAcc += dist3(cents[i], cents[i - 1]);
    let uAcc = 0;
    for (let j = 0; j < cols; j++) {
      const p = rings[i][j % n];
      if (j > 0) uAcc += dist3(p, rings[i][(j - 1) % n]);
      mesh.addV(p, [uAcc / tile, vAcc / tile], o.colFn ? o.colFn(p, i, j) : null);
    }
  }
  const start = mesh.idx.length;
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < cols - 1; j++) {
    const a = base + i * cols + j, b = a + 1, c = a + cols, d = c + 1;
    mesh.tri(a, c, b); mesh.tri(b, c, d);
  }
  // auto-orient outward from ring centroid
  let score = 0;
  for (let t = start; t < mesh.idx.length; t += 3) {
    const pa = mesh.P(mesh.idx[t]), pb = mesh.P(mesh.idx[t + 1]), pc = mesh.P(mesh.idx[t + 2]);
    const f = cross(sub(pb, pa), sub(pc, pa));
    const ci = Math.min(R - 1, Math.floor((mesh.idx[t] - base) / cols));
    const out = sub(mul(add(add(pa, pb), pc), 1 / 3), cents[ci]);
    score += dot(f, out);
  }
  let flip = score < 0; if (o.reverse) flip = !flip;
  if (flip) for (let t = start; t < mesh.idx.length; t += 3) { const x = mesh.idx[t + 1]; mesh.idx[t + 1] = mesh.idx[t + 2]; mesh.idx[t + 2] = x; }
  return { base, cols, rows: R, flipped: flip };
}

/* fan cap from a ring; faces `hint` direction */
function fan(mesh, ring, hint, o = {}) {
  let c = [0, 0, 0]; for (const p of ring) c = add(c, p); c = mul(c, 1 / ring.length);
  const ci = mesh.addV(c, [0.5, 0.5]), base = mesh.count;
  for (let j = 0; j < ring.length; j++) mesh.addV(ring[j], [0.5 + (ring[j][0] - c[0]) / UV_TILE, 0.5 + (ring[j][2] - c[2]) / UV_TILE]);
  for (let j = 0; j < ring.length; j++) {
    const a = base + j, b = base + (j + 1) % ring.length;
    const f = cross(sub(ring[j], c), sub(ring[(j + 1) % ring.length], c));
    if (dot(f, hint) >= 0) mesh.tri(ci, a, b); else mesh.tri(ci, b, a);
  }
}

/* catmull-rom sampling of control points -> N+1 points */
function spline(pts, N) {
  const out = [], m = pts.length - 1;
  for (let k = 0; k <= N; k++) {
    const u = k / N * m; let i = Math.min(m - 1, Math.floor(u)); const t = u - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m, i + 2)];
    const t2 = t * t, t3 = t2 * t, r = [0, 0, 0];
    for (let c = 0; c < 3; c++) r[c] = 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
    out.push(r);
  }
  return out;
}

/* tube along dense path. radiusFn(t,i)->[r1,r2] | number. ref = direction of first axis */
function tube(mesh, path, radiusFn, o = {}) {
  if (typeof radiusFn === 'number') { const rv = radiusFn; radiusFn = () => rv; }
  const sides = o.sides || 12, ref = o.ref || [0, 0, 1], N = path.length;
  const rings = [];
  for (let i = 0; i < N; i++) {
    const T = norm(sub(path[Math.min(N - 1, i + 1)], path[Math.max(0, i - 1)]));
    let A = sub(ref, mul(T, dot(ref, T))); if (vlen(A) < 1e-4) A = sub([1, 0, 0], mul(T, T[0]));
    A = norm(A); const B = norm(cross(T, A));
    let r = radiusFn(i / (N - 1), i); if (typeof r === 'number') r = [r, r];
    const ring = [];
    for (let s = 0; s < sides; s++) { const a = s / sides * TAU; const mm = o.mod ? o.mod(i / (N - 1), a, i) : 1; ring.push(add(path[i], add(mul(A, r[0] * mm * Math.cos(a)), mul(B, r[1] * mm * Math.sin(a))))); }
    rings.push(ring);
  }
  const info = loft(mesh, rings, { tile: o.tile, reverse: o.reverse, colFn: o.colFn });
  if (o.capStart) fan(mesh, rings[0], sub(path[0], path[1]));
  if (o.capEnd) fan(mesh, rings[N - 1], sub(path[N - 1], path[N - 2]));
  return rings;
}
const roundCap = (t, start = 0.88) => t < start ? 1 : Math.sqrt(Math.max(0.0, 1 - Math.pow((t - start) / (1 - start), 2)));
const roundCap2 = (t, a = 0.06, b = 0.88) => Math.min(t < a ? Math.sqrt(Math.max(0, 1 - Math.pow((a - t) / a, 2))) : 1, roundCap(t, b));

/* torus-like loop: closed centre path of points, circular cross-section */
function loopTube(mesh, centers, r, o = {}) {
  const n = centers.length, sides = o.sides || 8, rings = [];
  let cc = [0, 0, 0]; for (const p of centers) cc = add(cc, p); cc = mul(cc, 1 / n);
  const axis = o.axis || [0, 1, 0];
  for (let i = 0; i <= n; i++) {
    const p = centers[i % n], pn = centers[(i + 1) % n], pp = centers[(i + n - 1) % n];
    const T = norm(sub(pn, pp));
    let A = norm(sub(p, cc)); A = norm(sub(A, mul(T, dot(A, T))));
    const B = norm(cross(T, A));
    const rr = typeof r === 'function' ? r(i / n) : r;
    const ra = Array.isArray(rr) ? rr : [rr, rr];
    const ring = [];
    for (let s = 0; s < sides; s++) { const a = s / sides * TAU; ring.push(add(p, add(mul(A, ra[0] * Math.cos(a)), mul(B, ra[1] * Math.sin(a))))); }
    rings.push(ring);
  }
  // loop closes: last ring == first ring geometry; use closed=true on ring but rows wrap by duplicate
  loft(mesh, rings, { tile: o.tile });
}

/* XZ ring (y-up superellipse). alpha=0 front(+z), pi/2 -> +x */
function ringXZ(y, cx, cz, rx, rz, p, n, mod) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = k / n * TAU, s = Math.sin(a), c = Math.cos(a);
    const sx = Math.sign(s) * Math.pow(Math.abs(s), 2 / p), sz = Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
    const m = mod ? mod(a, y, sx, sz) : 0;
    pts.push([cx + (rx + m) * sx, y, cz + (rz + m) * sz]);
  }
  return pts;
}

/* Thick surface patch. P(s,w)->[x,y,z]; surface normal = dP/ds x dP/dw. */
function thickPatch(top, base, edge, P, ns, nw, thick, o = {}) {
  const G = [], T = [], B = [];
  for (let i = 0; i <= ns; i++) { G.push([]); for (let j = 0; j <= nw; j++) G[i].push(P(i / ns, j / nw)); }
  const Nrm = (i, j) => {
    const i0 = Math.max(0, i - 1), i1 = Math.min(ns, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(nw, j + 1);
    let n = norm(cross(sub(G[i1][j], G[i0][j]), sub(G[i][j1], G[i][j0]))); if (o.flip) n = mul(n, -1); return n;
  };
  if (o.hint && !o.flip) {
    const ci = Math.floor(ns / 2), cj = Math.floor(nw / 2);
    const n0 = Nrm(ci, cj); const h = typeof o.hint === 'function' ? o.hint(G[ci][cj]) : o.hint;
    if (dot(n0, h) < 0) { o = Object.assign({}, o, { flip: true }); }
  }
  const th = typeof thick === 'function' ? thick : () => thick;
  for (let i = 0; i <= ns; i++) { T.push([]); B.push([]); for (let j = 0; j <= nw; j++) { const n = Nrm(i, j), t = th(i / ns, j / nw); T[i].push(add(G[i][j], mul(n, t * (o.topFrac !== undefined ? o.topFrac : 0.5)))); B[i].push(sub(G[i][j], mul(n, t * (o.topFrac !== undefined ? 1 - o.topFrac : 0.5)))); } }
  let su = [0]; for (let i = 1; i <= ns; i++) su.push(su[i - 1] + dist3(G[i][0], G[i - 1][0]));
  let sw = [0]; for (let j = 1; j <= nw; j++) sw.push(sw[j - 1] + dist3(G[0][j], G[0][j - 1]));
  const tile = o.tile || UV_TILE;
  const addSurf = (mesh, S, rev) => {
    const b0 = mesh.count;
    for (let i = 0; i <= ns; i++) for (let j = 0; j <= nw; j++) mesh.addV(S[i][j], o.uvFn ? o.uvFn(i / ns, j / nw) : [su[i] / tile, sw[j] / tile], o.colFn ? o.colFn(S[i][j], i / ns, j / nw) : null);
    for (let i = 0; i < ns; i++) for (let j = 0; j < nw; j++) {
      const a = b0 + i * (nw + 1) + j, b = a + 1, c = a + nw + 1, d = c + 1;
      if (!rev) { mesh.tri(a, c, b); mesh.tri(b, c, d); } else { mesh.tri(a, b, c); mesh.tri(b, d, c); }
    }
  };
  addSurf(top, T, false); addSurf(base, B, true);
  const strip = (pa, pb, qa, qb, hint) => {
    const b0 = edge.count; const i0 = edge.addV(pa, [0, 0]), i1 = edge.addV(pb, [0.1, 0]), i2 = edge.addV(qa, [0, 0.1]), i3 = edge.addV(qb, [0.1, 0.1]);
    const f = cross(sub(pb, pa), sub(qb, pa));
    if (dot(f, hint) >= 0) { edge.tri(i0, i1, i3); edge.tri(i0, i3, i2); } else { edge.tri(i0, i3, i1); edge.tri(i0, i2, i3); }
  };
  if (!o.noEdges) {
    const edges = o.edges || [true, true, true, true];
    if (edges[0]) for (let j = 0; j < nw; j++) strip(T[0][j], T[0][j + 1], B[0][j], B[0][j + 1], sub(G[0][j], G[Math.min(1, ns)][j]));
    if (edges[1]) for (let j = 0; j < nw; j++) strip(T[ns][j], T[ns][j + 1], B[ns][j], B[ns][j + 1], sub(G[ns][j], G[Math.max(0, ns - 1)][j]));
    if (edges[2]) for (let i = 0; i < ns; i++) strip(T[i][0], T[i + 1][0], B[i][0], B[i + 1][0], sub(G[i][0], G[i][Math.min(1, nw)]));
    if (edges[3]) for (let i = 0; i < ns; i++) strip(T[i][nw], T[i + 1][nw], B[i][nw], B[i + 1][nw], sub(G[i][nw], G[i][Math.max(0, nw - 1)]));
  }
  return { G, T, B };
}

/* ellipsoid with arbitrary local basis. basis = {c, x, y, z} unit vectors; radii [rx,ry,rz]. Poles on y. */
function ellipsoid(mesh, c, radii, o = {}) {
  const nu = o.nu || 18, nv = o.nv || 12, bx = o.bx || [1, 0, 0], by = o.by || [0, 1, 0], bz = o.bz || [0, 0, 1];
  const t0 = o.t0 || 0, t1 = o.t1 !== undefined ? o.t1 : PI, p0 = o.p0 || 0, p1 = o.p1 !== undefined ? o.p1 : TAU;
  const rings = [];
  for (let j = 0; j <= nv; j++) {
    const th = lerp(t0, t1, j / nv), ring = [];
    const full = Math.abs(p1 - p0 - TAU) < 1e-6;
    const cnt = full ? nu : nu + 1;
    for (let i = 0; i < cnt; i++) {
      const ph = lerp(p0, p1, i / (full ? nu : nu));
      const lx = Math.sin(th) * Math.sin(ph) * radii[0], ly = Math.cos(th) * radii[1], lz = Math.sin(th) * Math.cos(ph) * radii[2];
      ring.push(add(c, add(add(mul(bx, lx), mul(by, ly)), mul(bz, lz))));
    }
    rings.push(ring);
  }
  const full = Math.abs(p1 - p0 - TAU) < 1e-6;
  loft(mesh, rings, { closed: full, tile: o.tile, reverse: o.reverse });
}

/* Convex polygon extrusion with rounded/bevelled edge. outline: [[x,z],...] ; height fn h(x,z) top y; bottom y0 */
function slab(mesh, outline, y0, topFn, bevel, o = {}) {
  const n = outline.length; let cx = 0, cz = 0; for (const p of outline) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  const inset = (p, d) => { const dx = p[0] - cx, dz = p[1] - cz, l = Math.hypot(dx, dz) || 1; return [p[0] - dx / l * d, p[1] - dz / l * d]; };
  const ringAt = (d, yf) => outline.map(p => { const q = inset(p, d); return [q[0], yf(q[0], q[1]), q[1]]; });
  const b = bevel;
  const rings = [
    ringAt(b * 0.95, () => y0),
    ringAt(b * 0.45, (x, z) => y0 + b * 0.25),
    ringAt(0, (x, z) => y0 + b),
    ringAt(0, (x, z) => topFn(x, z) - b),
    ringAt(b * 0.45, (x, z) => topFn(x, z) - b * 0.25),
    ringAt(b * 0.95, (x, z) => topFn(x, z)),
  ];
  loft(mesh, rings);
  fan(mesh, rings[0], [0, -1, 0]);
  fan(mesh, rings[5], [0, 1, 0]);
}

/* flat ring-to-ring strip, facing `hint` */
function annulus(mesh, ra, rb, hint) {
  const n = ra.length, b0 = mesh.count;
  for (const p of ra) mesh.addV(p, [p[0] / UV_TILE, p[2] / UV_TILE]);
  for (const p of rb) mesh.addV(p, [p[0] / UV_TILE, p[2] / UV_TILE]);
  for (let j = 0; j < n; j++) {
    const j2 = (j + 1) % n, a = b0 + j, b = b0 + j2, c = b0 + n + j, d = b0 + n + j2;
    const f = cross(sub(ra[j2], ra[j]), sub(rb[j], ra[j]));
    if (dot(f, hint) >= 0) { mesh.tri(a, b, c); mesh.tri(b, d, c); } else { mesh.tri(a, c, b); mesh.tri(b, c, d); }
  }
}
