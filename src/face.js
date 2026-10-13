/* ===== Head, face, ears, hair (built in head-local coords, then moved to HC) ===== */
const HA = 0.0775, HB = 0.114, HZ = 0.094;
function headG(x, y, z) {
  const ny = y / HB, low = Math.max(0, -ny);
  const ax = HA * (1 - 0.19 * Math.pow(low, 1.6));
  let cz = HZ; if (z < 0) cz = HZ * (1 - 0.16 * Math.pow(low, 1.2));
  const qy = y > 0 ? 2.0 : 2.45, qz = z > 0 ? 2.55 : 2.0;
  return Math.pow(Math.abs(x) / ax, 2) + Math.pow(Math.abs(ny), qy) + Math.pow(Math.abs(z) / cz, qz);
}
function headRadius(d) {
  let lo = 0, hi = 0.2;
  for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (headG(d[0] * mid, d[1] * mid, d[2] * mid) < 1) lo = mid; else hi = mid; }
  return lo;
}
/* displacement bumps: [cx,cy,cz, sx,sy,sz, amp, dx,dy,dz] (x mirrored automatically when mirror=true) */
const BUMPS = [
  [0.035, 0.031, 0.086, 0.022, 0.008, 0.016, 0.0040, 0, 0, 1, true],     // brow ridge
  [0.031, 0.004, 0.090, 0.015, 0.011, 0.012, -0.0050, 0, 0, 1, true],     // eye socket
  [0.0, -0.004, 0.092, 0.0055, 0.010, 0.012, 0.0070, 0, 0, 1, false],     // nose bridge
  [0.0, -0.022, 0.0925, 0.0066, 0.010, 0.012, 0.0120, 0, 0, 1, false],
  [0.0, -0.035, 0.092, 0.0065, 0.008, 0.012, 0.0105, 0, -0.05, 1, false],
  [0.0, -0.0465, 0.094, 0.0105, 0.0085, 0.012, 0.0150, 0, -0.18, 1, false], // tip
  [0.0148, -0.050, 0.084, 0.0068, 0.0075, 0.010, 0.0105, 0.5, 0, 1, true],  // alae
  [0.052, -0.020, 0.062, 0.024, 0.024, 0.030, 0.0100, 0.4, 0, 1, true],     // cheekbone
  [0.042, -0.046, 0.066, 0.021, 0.019, 0.022, 0.0085, 0.1, 0.1, 1, true],   // smile cheek
  [0.0, -0.062, 0.083, 0.012, 0.008, 0.010, 0.0030, 0, 0, 1, false],       // philtrum / upper lip
  [0.0, -0.074, 0.074, 0.019, 0.015, 0.012, 0.0060, 0, 0, 1, false],       // mouth mass
  [0.0, -0.092, 0.062, 0.013, 0.006, 0.012, -0.0030, 0, 0, 1, false],      // mentolabial sulcus
  [0.0, -0.100, 0.062, 0.020, 0.013, 0.018, 0.0210, 0, -0.1, 1, false],    // chin
  [0.057, -0.076, -0.004, 0.016, 0.022, 0.030, 0.0040, 1, 0, 0, true],     // jaw angle
  [0.027, -0.071, 0.070, 0.010, 0.016, 0.010, -0.0016, 0, 0, 1, true]      // nasolabial hint
];
function headPoint(d, withBumps) {
  const R = headRadius(d); const p = [d[0] * R, d[1] * R, d[2] * R];
  if (!withBumps) return p;
  let q = p.slice();
  for (const b of BUMPS) {
    const sides = b[10] ? [1, -1] : [1];
    for (const sg of sides) {
      const cx = b[0] * sg, dx = b[7] * sg;
      const ex = (p[0] - cx) / b[3], ey = (p[1] - b[1]) / b[4], ez = (p[2] - b[2]) / b[5];
      const g = Math.exp(-0.5 * (ex * ex + ey * ey + ez * ez)) * b[6];
      if (g > 1e-7) { const dd = norm([dx, b[8], b[9]]); q[0] += dd[0] * g; q[1] += dd[1] * g; q[2] += dd[2] * g; }
    }
  }
  return q;
}
let HEAD = null;
function buildHeadMesh() {
  const m = new Mesh('skin');
  const nT = 120, nP = 180, rings = [];
  for (let i = 0; i <= nT; i++) {
    const th = Math.min(PI - 1e-4, Math.max(1e-4, i / nT * PI)), ring = [];
    for (let j = 0; j < nP; j++) { const ph = j / nP * TAU; const d = [Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)]; ring.push(headPoint(d, true)); }
    rings.push(ring);
  }
  loft(m, rings, {
    colFn: (p) => {
      let r = 1, g = 1, b = 1;
      const sock = Math.exp(-(Math.pow((Math.abs(p[0]) - 0.031) / 0.017, 2) + Math.pow((p[1] - 0.003) / 0.013, 2))) * (p[2] > 0 ? 1 : 0);
      r -= 0.05 * sock; g -= 0.09 * sock; b -= 0.08 * sock;
      const chk = Math.exp(-(Math.pow((Math.abs(p[0]) - 0.043) / 0.018, 2) + Math.pow((p[1] + 0.034) / 0.02, 2))) * (p[2] > 0 ? 1 : 0);
      r += 0.025 * chk; g -= 0.03 * chk; b -= 0.03 * chk;
      const nose = Math.exp(-(Math.pow(p[0] / 0.012, 2) + Math.pow((p[1] + 0.05) / 0.012, 2))) * (p[2] > 0 ? 1 : 0);
      r += 0.02 * nose; g -= 0.035 * nose; b -= 0.03 * nose;
      return [r, g, b];
    }
  });
  const nor = computeNormals(m);
  // ray structure (front half only)
  const tris = [];
  for (let t = 0; t < m.idx.length; t += 3) {
    const a = m.idx[t], b = m.idx[t + 1], c = m.idx[t + 2];
    const pa = m.P(a), pb = m.P(b), pc = m.P(c);
    if (pa[2] < -0.02 && pb[2] < -0.02 && pc[2] < -0.02) continue;
    tris.push({ a, b, c, pa, pb, pc, minx: Math.min(pa[0], pb[0], pc[0]), maxx: Math.max(pa[0], pb[0], pc[0]), miny: Math.min(pa[1], pb[1], pc[1]), maxy: Math.max(pa[1], pb[1], pc[1]) });
  }
  HEAD = { m, nor, tris };
  return m;
}
/* ray down -z at (x,y) → highest-z hit */
function headRay(x, y) {
  let best = null, bz = -1e9;
  for (const t of HEAD.tris) {
    if (x < t.minx || x > t.maxx || y < t.miny || y > t.maxy) continue;
    const pa = t.pa, pb = t.pb, pc = t.pc;
    // barycentric in xy
    const d = (pb[1] - pc[1]) * (pa[0] - pc[0]) + (pc[0] - pb[0]) * (pa[1] - pc[1]); if (Math.abs(d) < 1e-14) continue;
    const l1 = ((pb[1] - pc[1]) * (x - pc[0]) + (pc[0] - pb[0]) * (y - pc[1])) / d;
    const l2 = ((pc[1] - pa[1]) * (x - pc[0]) + (pa[0] - pc[0]) * (y - pc[1])) / d;
    const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    const z = l1 * pa[2] + l2 * pb[2] + l3 * pc[2];
    if (z > bz) {
      bz = z; const N = HEAD.nor;
      const n = norm([l1 * N[t.a * 3] + l2 * N[t.b * 3] + l3 * N[t.c * 3], l1 * N[t.a * 3 + 1] + l2 * N[t.b * 3 + 1] + l3 * N[t.c * 3 + 1], l1 * N[t.a * 3 + 2] + l2 * N[t.b * 3 + 2] + l3 * N[t.c * 3 + 2]]);
      best = { p: [x, y, z], n };
    }
  }
  return best || { p: [x, y, 0.09], n: [0, 0, 1] };
}
const onFace = (x, y, off) => { const h = headRay(x, y); return { p: add(h.p, mul(h.n, off)), n: h.n }; };

/* ---------- eyes ---------- */
const EYE_R = 0.0118;
function buildEye(F, sg) {
  const sk = F('skin'), scl = F('sclera'), iris = F('iris'), cor = F('cornea'), lash = F('lash'), crease = F('skinDark');
  const surf = headRay(sg * 0.0315, 0.004);
  const c = [sg * 0.0315, 0.004, surf.p[2] - 0.0042];
  const te = sg * 0.085;
  const bx = [Math.cos(te), Math.sin(te), 0], by = [-Math.sin(te), Math.cos(te), 0], bz = [0, 0, 1];
  const R = EYE_R;
  ellipsoid(scl, c, [R, R, R], { bx, by, bz, nu: 36, nv: 26 });
  // iris disc (planar UV)
  const ri = 0.0058, ctr = iris.addV(add(c, mul(bz, R * 1.0012)), [0.5, 0.5]);
  const nRing = 8, nSeg = 36, base = iris.count, itri0 = iris.idx.length;
  for (let k = 1; k <= nRing; k++) { const rho = ri * k / nRing; for (let j = 0; j < nSeg; j++) { const a = j / nSeg * TAU; const lx = rho * Math.cos(a), ly = rho * Math.sin(a), lz = Math.sqrt(R * R - rho * rho) * 1.0012; iris.addV(add(c, add(add(mul(bx, lx), mul(by, ly)), mul(bz, lz))), [0.5 + lx / (2 * ri), 0.5 + ly / (2 * ri)]); } }
  const ringI = k => base + (k - 1) * nSeg;
  for (let j = 0; j < nSeg; j++) iris.tri(ctr, ringI(1) + j, ringI(1) + (j + 1) % nSeg);
  for (let k = 1; k < nRing; k++) for (let j = 0; j < nSeg; j++) { const a = ringI(k) + j, b = ringI(k) + (j + 1) % nSeg, cc = ringI(k + 1) + j, d = ringI(k + 1) + (j + 1) % nSeg; iris.tri(a, cc, b); iris.tri(b, cc, d); }
  { const pa = iris.P(iris.idx[itri0]), pb = iris.P(iris.idx[itri0 + 1]), pc = iris.P(iris.idx[itri0 + 2]);
    if (dot(cross(sub(pb, pa), sub(pc, pa)), bz) < 0) for (let u = itri0; u < iris.idx.length; u += 3) { const x = iris.idx[u + 1]; iris.idx[u + 1] = iris.idx[u + 2]; iris.idx[u + 2] = x; } }
  // cornea cap (pole along bz)
  ellipsoid(cor, c, [R * 1.025, R * 1.025, R * 1.025], { bx, by: bz, bz: mul(by, -1), nu: 28, nv: 8, t0: 0, t1: 0.72 });
  // lids
  const RL = R * 1.09;
  const thu = psi => PI / 2 - 0.40 * Math.pow(Math.sin(psi), 0.72);
  const thl = psi => PI / 2 + 0.47 * Math.pow(Math.sin(psi), 0.78);
  const lidPt = (psi, th, r) => add(c, add(add(mul(bx, r * Math.sin(th) * Math.cos(psi)), mul(by, r * Math.cos(th))), mul(bz, r * Math.sin(th) * Math.sin(psi))));
  const lm = new Mesh('skin');
  const nPsi = 30, nTh = 10;
  const upper = [], lower = [];
  for (let j = 0; j <= nTh; j++) {
    const ru = [], rl = [];
    for (let i = 0; i <= nPsi; i++) {
      const psi = 0.02 + (PI - 0.04) * i / nPsi; const tu = thu(psi) * (j / nTh), tl = thl(psi) + (PI - thl(psi)) * (j / nTh);
      ru.push(lidPt(psi, tu, RL)); rl.push(lidPt(psi, tl, RL));
    }
    upper.push(ru); lower.push(rl);
  }
  loft(lm, upper, { closed: false }); loft(lm, lower, { closed: false });
  sk.append(lm);
  // lash line (upper lid margin) + lower waterline
  const edgeU = [], edgeL = [];
  for (let i = 0; i <= 30; i++) { const psi = 0.04 + (PI - 0.08) * i / 30; edgeU.push(lidPt(psi, thu(psi) + 0.012, RL * 1.002)); edgeL.push(lidPt(psi, thl(psi) - 0.012, RL * 1.0)); }
  // medial = psi~0 is toward +x*? psi=0 -> +bx (lateral for sg>0). lateral thickening where psi small if sg>0
  const latFrac = (i) => sg > 0 ? 1 - i / 30 : i / 30;
  tube(lash, edgeU, (t, i) => 0.00085 + 0.0007 * smooth(0.45, 1, latFrac(i)) , { sides: 6, ref: bz, capStart: true, capEnd: true });
  tube(crease, edgeL, 0.00055, { sides: 5, ref: bz, capStart: true, capEnd: true });
  const crs = []; for (let i = 3; i <= 27; i++) { const psi = 0.04 + (PI - 0.08) * i / 30; crs.push(lidPt(psi, thu(psi) - 0.30 * Math.pow(Math.sin(psi), 0.9), RL * 1.0015)); }
  tube(crease, crs, 0.0005, { sides: 5, ref: bz, capStart: true, capEnd: true });
}

/* ---------- brows ---------- */
function buildBrow(F, sg) {
  const m = F('brow');
  const ctrl = [[0.0105, 0.0292, 0.0086], [0.0210, 0.0328, 0.0098], [0.0320, 0.0358, 0.0102], [0.0440, 0.0340, 0.0088], [0.0550, 0.0290, 0.0064], [0.0625, 0.0248, 0.0036]];
  const pts = spline(ctrl.map(c => [c[0], c[1], c[2]]), 28);
  const P = (s, w) => {
    const i = Math.min(pts.length - 1, Math.round(s * (pts.length - 1)));
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)], p = pts[i];
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty, ny = tx, h = p[2];
    const off = (w - 0.4) * h;
    const x = p[0] + nx * off, y = p[1] + ny * off;
    const f = onFace(sg * x, y, 0.0016 + 0.0006 * Math.sin(PI * w));
    return f.p;
  };
  thickPatch(m, m, m, P, 28, 5, 0.0010, { hint: [0, 0, 1], uvFn: (s, w) => [s, w], noEdges: true });
}

/* ---------- nose details, mouth, ears ---------- */
function buildNostrils(F) {
  const m = F('nostril');
  for (const sg of [1, -1]) { const f = onFace(sg * 0.0078, -0.0538, -0.0004); ellipsoid(m, f.p, [0.0042, 0.0020, 0.0036], { nu: 14, nv: 8 }); }
}
function buildMouth(F) {
  const lips = F('lips'), teeth = F('teeth'), cav = F('mouth');
  const hw = 0.0268, yc = -0.0658;
  const yu = x => yc + (-0.0718 - yc) * (1 - Math.pow(Math.abs(x) / hw, 2.2));
  const yl = x => yc + (-0.0788 - yc) * (1 - Math.pow(Math.abs(x) / hw, 1.7));
  const ru = x => 0.0041 * Math.sqrt(Math.max(0, 1 - Math.pow(x / hw, 2))) + 0.0005;
  const rl = x => 0.0052 * Math.sqrt(Math.max(0, 1 - Math.pow(x / hw, 2))) + 0.0005;
  const N = 36, cs = [], rr = [];
  for (let i = 0; i <= N; i++) { const x = -hw + 2 * hw * i / N; const y = yu(x) + ru(x) * 0.85 + 0.0005 * Math.exp(-Math.pow((Math.abs(x) - 0.004) / 0.0035, 2)) ; cs.push(onFace(x, y, 0.0012).p); rr.push(ru(x)); }
  for (let i = N - 1; i >= 1; i--) { const x = -hw + 2 * hw * i / N; const y = yl(x) - rl(x) * 0.85; cs.push(onFace(x, y, 0.0014).p); rr.push(rl(x)); }
  const n = cs.length;
  loopTube(lips, cs, t => { const i = Math.min(n - 1, Math.round(t * n)); return [rr[i] * 1.0, rr[i] * 0.85]; }, { sides: 10 });
  // dark cavity
  const outline = []; for (let i = 0; i <= N; i += 2) { const x = -hw * 0.97 + 2 * hw * 0.97 * i / N; outline.push(onFace(x, yu(x) - 0.0004, 0.0004).p); }
  const low = []; for (let i = N; i >= 0; i -= 2) { const x = -hw * 0.97 + 2 * hw * 0.97 * i / N; low.push(onFace(x, yl(x) + 0.0004, 0.0004).p); }
  const poly = outline.concat(low); fan(cav, poly, [0, 0, 1]);
  // upper teeth
  const TW = [[0.0041, 0.0086], [0.0104, 0.0068], [0.0156, 0.0058]];
  for (const [tx, tw] of TW) for (const sg of [1, -1]) {
    const x = tx * sg, y = yu(x) - 0.0028;
    const f = onFace(x, y, 0.0006);
    ellipsoid(teeth, f.p, [tw / 2 * 1.04, 0.0030, 0.0017], { nu: 12, nv: 8 });
  }
}
function buildEar(F, sg) {
  const sk = F('skin');
  const flare = 0.34;
  const Zd = norm([sg * Math.sin(flare), 0, -Math.cos(flare)]), Xo = norm([sg * Math.cos(flare), 0, Math.sin(flare)]), Yd = [0, 1, 0];
  const O = [sg * 0.0728, -0.006, 0.0035];
  const H = 0.0315, W = 0.0172, cw = 0.0178, tilt = 0.20;
  const P = (s, w) => {
    const rho = s, th = w * TAU;
    let cy = Math.cos(th), sz = Math.sin(th);
    const lobe = cy < 0 ? 1 - 0.20 * (-cy) : 1;
    let ey = rho * H * cy * (cy < -0.2 ? 0.96 : 1), ez = rho * W * sz * lobe;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const ey2 = ey * ct - ez * st, ez2 = ey * st + ez * ct;      // tilt top backwards
    const ry = ey2, rz = ez2 + cw;
    const rim = Math.exp(-Math.pow((rho - 0.82) / 0.14, 2));
    const ridge = Math.exp(-Math.pow((rho - 0.50) / 0.10, 2)) * (cy > -0.3 ? 1 : 0.3) * (sz < 0.2 ? 1 : 0.5);
    const bowl = Math.exp(-Math.pow(rho / 0.27, 2));
    const lobeFlat = cy < -0.5 ? smooth(-0.5, -0.9, cy) : 0;
    const dep = -0.0030 + 0.0030 + 0.0060 * rim * (1 - 0.7 * lobeFlat) + 0.0026 * ridge - 0.0034 * bowl * (1 - lobeFlat) + 0.0022 * (1 - rho * rho) * 0.0;
    const dflare = 0.0;
    return add(O, add(add(mul(Yd, ry), mul(Zd, rz)), mul(Xo, dep - 0.0006)));
  };
  thickPatch(sk, sk, sk, P, 10, 56, 0.0024, { hint: Xo, edges: [false, true, false, false] });
  return { O, Zd, Xo, lobe: add(O, add(add(mul(Yd, -0.0275), mul(Zd, 0.0162)), mul(Xo, 0.0012))) };
}

function buildFace() {
  const reg = {}; const F = id => reg[id] || (reg[id] = new Mesh(id));
  const head = buildHeadMesh();
  F('skin').append(head);
  buildEye(F, 1); buildEye(F, -1);
  buildBrow(F, 1); buildBrow(F, -1);
  buildNostrils(F); buildMouth(F);
  const earInfo = [buildEar(F, 1), buildEar(F, -1)];
  for (const id in reg) {
    const m = reg[id]; m.transform(p => add(p, HC)); M(id).append(m);
  }
  // earrings in world space
  [1, -1].forEach((sg, k) => { const e = earInfo[k]; buildEarring(sg, add(e.lobe, HC), e.Xo, e.Zd); });
}
