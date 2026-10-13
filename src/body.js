/* ===== Body, garments, hands, feet, accessories ===== */
const HC = [0, 1.492, 0.012];           // head centre
const S0 = [0.152, 1.286, 0.0], SH = [0.178, 1.283, 0.004], EL = [0.240, 1.045, 0.012], WR = [0.275, 0.840, 0.016];
const ARM_D = norm(sub(WR, EL));

const registry = {};
function M(id, mat) { if (!registry[id]) registry[id] = new Mesh(mat || id); return registry[id]; }

/* orthonormal frame placement */
function place(mesh, origin, bx, by, bz) {
  return mesh.transform(p => add(origin, add(add(mul(bx, p[0]), mul(by, p[1])), mul(bz, p[2]))));
}
function ringAround(c, axis, ref, ra, rb, n, off) {
  let A = sub(ref, mul(axis, dot(ref, axis))); A = norm(A); const B = norm(cross(axis, A)); const pts = [];
  for (let k = 0; k < n; k++) { const a = k / n * TAU; const m = off ? off(a) : 0; pts.push(add(c, add(mul(A, (ra + m) * Math.cos(a)), mul(B, (rb + m) * Math.sin(a))))); }
  return pts;
}
function shrinkRing(ring, d, c) {
  if (!c) { c = [0, 0, 0]; for (const p of ring) c = add(c, p); c = mul(c, 1 / ring.length); }
  return ring.map(p => { const dx = p[0] - c[0], dz = p[2] - c[2], l = Math.hypot(dx, dz) || 1; return [p[0] - dx / l * d, p[1], p[2] - dz / l * d]; });
}
function disc(mesh, c, n, r, h, holes) {
  n = norm(n); let u = cross(n, [0, 1, 0]); if (vlen(u) < 0.2) u = cross(n, [1, 0, 0]); u = norm(u); const w = norm(cross(n, u));
  const spec = [[0.94, 0], [1.0, 0.3], [1.0, 0.65], [0.88, 1.0], [0.60, 0.80]];
  const rings = spec.map(([rr, hh]) => { const pts = []; for (let k = 0; k < 28; k++) { const a = k / 28 * TAU; pts.push(add(add(c, mul(n, hh * h)), add(mul(u, Math.cos(a) * rr * r), mul(w, Math.sin(a) * rr * r)))); } return pts; });
  loft(mesh, rings); fan(mesh, rings[4], n); fan(mesh, rings[0], mul(n, -1));
  if (holes) {
    const hm = M('buttonHole');
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const cc = add(add(add(c, mul(n, 0.83 * h + 0.0003)), mul(u, a * r * 0.2)), mul(w, b * r * 0.2));
      const rr = []; for (let k = 0; k < 10; k++) { const t = k / 10 * TAU; rr.push(add(cc, add(mul(u, Math.cos(t) * r * 0.1), mul(w, Math.sin(t) * r * 0.1)))); }
      fan(hm, rr, n);
    }
  }
}
function doubleShell(mesh, rings, inset, c) {
  const inner = rings.map(r => shrinkRing(r, inset, c));
  loft(mesh, inner, { reverse: true });
}

/* ---------------- inner top & neck ---------------- */
function buildTop() {
  const m = M('top');
  const rows = [[0.92, .119, .085, 0, 2.2], [1.0, .124, .088, 0, 2.2], [1.06, .128, .092, .002, 2.2], [1.12, .135, .099, .005, 2.2], [1.18, .146, .108, .012, 2.3], [1.24, .150, .104, .008, 2.3], [1.27, .136, .084, -.003, 2.2]];
  const rings = [];
  for (let y = 0.92; y <= 1.27001; y += 0.0175) { const [rx, rz, cz, p] = table(rows, y); rings.push(ringXZ(y, 0, cz, rx, rz, p, 64, (a, yy, sx, sz) => 0.0009 * vnoise(a * 2.2, yy * 28))); }
  const rim = []; const nr = 64;
  for (let k = 0; k < nr; k++) { const a = k / nr * TAU, c = Math.cos(a), s = Math.sin(a); rim.push([0.067 * s, 1.318 - 0.038 * Math.pow(Math.max(0, c), 2) + 0.003 * Math.max(0, -c), -0.003 + 0.064 * c]); }
  rings.push(rim);
  loft(m, rings);
  doubleShell(m, rings, 0.0025);
  // hem edge inside trousers: tiny cap not needed
}
function buildNeck() {
  const m = M('skin');
  const rows = [[1.24, .070, .068, 0], [1.30, .060, .061, .002], [1.36, .054, .056, .006], [1.41, .052, .056, .010], [1.47, .052, .057, .014]];
  const rings = [];
  for (let y = 1.24; y <= 1.4701; y += 0.02) { const [rx, rz, cz] = table(rows, y); rings.push(ringXZ(y, 0, cz, rx, rz, 2.1, 32)); }
  loft(m, rings);
}

/* ---------------- jacket ---------------- */
const JROWS = [
  [0.745, .196, .134, .000, 2.4], [0.80, .194, .131, .001, 2.4], [0.90, .186, .125, .003, 2.35], [1.00, .164, .110, .005, 2.3],
  [1.10, .164, .110, .009, 2.3], [1.20, .172, .114, .011, 2.3], [1.255, .180, .108, .006, 2.4], [1.282, .178, .100, .002, 2.4], [1.300, .156, .092, -.001, 2.3],
  [1.318, .122, .082, -.004, 2.2], [1.336, .088, .070, -.006, 2.1]];
const JY0 = 0.745, JY1 = 1.336;
const XE = [[.745, .034], [.85, .020], [.95, .008], [1.0, .003], [1.04, .016], [1.10, .038], [1.17, .056], [1.24, .068], [1.30, .074], [1.336, .078]];
const xe = y => table(XE, y)[0];
function jacketP(u, v) {
  let y = JY0 + v * (JY1 - JY0);
  const e = Math.min(u, 1 - u);
  y += (1 - smooth(0, 0.05, e)) * (1 - smooth(0, 0.16, v)) * 0.030;
  const [rx, rz, cz, p] = table(JROWS, y);
  const xedge = Math.min(xe(y), rx * 0.97);
  const a0 = Math.asin(Math.min(0.995, Math.pow(xedge / rx, p / 2)));
  const a = a0 + u * (TAU - 2 * a0), s = Math.sin(a), c = Math.cos(a);
  const sx = Math.sign(s) * Math.pow(Math.abs(s), 2 / p), sz = Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
  let d = 0.0013 * vnoise(u * 11, v * 8) + 0.0007 * vnoise(u * 29 + 5, v * 21);
  if (c < 0) d += 0.007 * gauss(y - 1.2, 0.06) * (-c);                     // shoulder-blade volume
  d += 0.0014 * Math.sin(a * 5 + y * 8) * smooth(0.95, 0.75, y) * (1 - smooth(0.0, 0.3, e) * 0.0);
  d += 0.0035 * smooth(0.9, 0.745, y);                                       // gentle hem flare
  d -= 0.0030 * gauss(y - 1.0, 0.035) * smooth(0.15, 0.0, Math.abs(Math.sin(a)));  // button cinch
  return [(rx + d) * sx, y, cz + (rz + d) * sz];
}
function jacketFront(x, y, off) {
  const f = (xx, yy) => { const [rx, rz, cz, p] = table(JROWS, yy); const ax = Math.min(Math.abs(xx) / rx, 0.995); return [xx, yy, cz + rz * Math.pow(1 - Math.pow(ax, p), 1 / p)]; };
  const p0 = f(x, y), px = f(x + 0.003, y), py = f(x, y + 0.003);
  let n = norm(cross(sub(px, p0), sub(py, p0))); if (n[2] < 0) n = mul(n, -1);
  return { p: add(p0, mul(n, off)), n };
}
function buildJacket() {
  const outer = M('blazer'), lining = M('blazerLining');
  thickPatch(outer, lining, outer, jacketP, 96, 46, 0.0058, { hint: p => [p[0], 0, p[2]], tile: 0.08 });
  // lapels
  const LW = [[1.0, 0], [1.05, .030], [1.12, .054], [1.20, .068], [1.26, .070], [1.295, .040], [1.318, .012]];
  for (const sg of [1, -1]) {
    thickPatch(outer, lining, outer, (s, w) => {
      const y = 1.0 + s * 0.318, xin = xe(y), wl = table(LW, y)[0];
      const x = sg * Math.min(xin + w * wl, 0.9 * table(JROWS, y)[0]);
      const off = 0.0042 + 0.0058 * Math.sin(PI * Math.pow(w, 0.8)) + 0.0020 * s * w;
      return jacketFront(x, y, off).p;
    }, 40, 12, 0.0052, { hint: [0, 0, 1], tile: 0.08 });
  }
  // collar
  const CB = 0.95;
  thickPatch(outer, outer, outer, (s, w) => {
    const a = CB + s * (TAU - 2 * CB), hs = 0.7 + 0.3 * Math.pow(Math.sin(PI * s), 0.7);
    const back = smooth(-0.2, -1, Math.cos(a));
    const yc = 1.326 + 0.007 * back;
    const dr = table([[0, 0], [.25, .004], [.5, .014], [.75, .026], [1, .034]], w)[0];
    const dy = table([[0, 0], [.25, .019], [.5, .030], [.75, .027], [1, .012]], w)[0] * hs;
    const rx = 0.072 + dr, rz = 0.066 + dr;
    return [rx * Math.sin(a), yc + dy, -0.006 + rz * Math.cos(a)];
  }, 64, 14, 0.0048, { hint: p => [p[0], 0.3, p[2] + 0.006], tile: 0.08 });
  // pockets
  for (const sg of [1, -1]) {
    thickPatch(outer, outer, outer, (s, w) => {
      const x = sg * 0.108 + (s - 0.5) * 0.112, y = 0.835 + (w - 0.5) * 0.044 + (s - 0.5) * sg * -0.006;
      const off = 0.0032 + 0.0042 * (1 - w) * (1 - w) + 0.0016 * Math.sin(PI * s) * Math.sin(PI * w);
      return jacketFront(x, y, off).p;
    }, 18, 6, 0.0042, { hint: [0, 0, 1], tile: 0.05 });
    // welt line above flap (dark seam)
    const seam = M('blazerSeam'); const pts = [];
    for (let k = 0; k <= 16; k++) { const s = k / 16; const x = sg * 0.108 + (s - 0.5) * 0.118, y = 0.862 + (s - 0.5) * sg * -0.006; pts.push(jacketFront(x, y, 0.0026).p); }
    tube(seam, pts, 0.0011, { sides: 6, capStart: true, capEnd: true });
  }
  // front button + seams
  const bp = jacketFront(0, 1.0, 0.0035);
  disc(M('button'), bp.p, bp.n, 0.0105, 0.0042, true);
  // seams: centre back and side-back
  const seam = M('blazerSeam');
  const seamPts = (u0) => { const pts = []; for (let k = 0; k <= 40; k++) { const v = 0.04 + 0.92 * k / 40; const p = jacketP(u0, v); const [rx, rz] = table(JROWS, p[1]); const dd = norm([p[0], 0, p[2] - 0.0]); pts.push(add(p, mul(dd, 0.0029))); } return pts; };
  for (const u0 of [0.5, 0.5 - 0.17, 0.5 + 0.17]) { const pts = seamPts(u0); tube(seam, pts, 0.0010, { sides: 6, capStart: true, capEnd: true }); }
}

/* ---------------- sleeves, arms, hands (left side; mirrored for right) ---------------- */
const CUFF_TOP = lerp3(EL, WR, 0.22), CUFF_BOT = lerp3(EL, WR, 0.40);
function buildArmSide(get) {
  const sk = get('skin'), bl = get('blazer'), li = get('blazerLining'), sm = get('blazerSeam'), bt = get('button');
  const ref = [1, 0, 0];
  // sleeve
  const path = spline([S0, add(lerp3(S0, EL, 0.5), [0.012, 0, 0.004]), EL, CUFF_TOP], 60);
  const RT = [[0, .058, .054], [.15, .056, .056], [.5, .050, .051], [.78, .046, .046], [1, .0408, .0378]];
  const rf = t => { const r = table(RT, t), d = roundCap2(t, 0.05, 2); return [r[0] * d, r[1] * d]; };
  const modf = (t, a, i) => 1 + 0.012 * vnoise(a * 2.0 + 3, t * 9) + 0.022 * gauss(t - 0.8, 0.06) * Math.cos(a * 3 + 1) + 0.025 * gauss(t - 0.99, 0.05) * Math.sin(a * 6);
  tube(bl, path, rf, { sides: 36, ref, mod: modf, tile: 0.08 });
  tube(li, path, t => { const r = rf(t); return [Math.max(0.001, r[0] - 0.0045), Math.max(0.001, r[1] - 0.0045)]; }, { sides: 36, ref, reverse: true });
  // armhole seam
  
  { const q = 9 / 60; loopTube(sm, ringAround(path[9], norm(sub(path[10], path[8])), ref, rf(q)[0] + 0.0008, rf(q)[1] + 0.0008, 40), 0.0012, { sides: 6 }); }
  // rolled cuff
  const Rc = rf(1);
  const bandPath = []; for (let k = 0; k <= 8; k++) bandPath.push(lerp3(CUFF_TOP, CUFF_BOT, k / 8));
  tube(bl, bandPath, t => [Rc[0] + 0.0062 + 0.0008 * Math.sin(t * PI), Rc[1] + 0.0062 + 0.0008 * Math.sin(t * PI)], { sides: 36, ref, mod: (t, a) => 1 + 0.012 * Math.sin(a * 5 + 1) * 0.5 });
  loopTube(bl, ringAround(CUFF_BOT, ARM_D, ref, Rc[0] + 0.0066, Rc[1] + 0.0066, 44, a => 0.0006 * Math.sin(a * 7)), 0.0074, { sides: 12 });
  loopTube(bl, ringAround(CUFF_TOP, ARM_D, ref, Rc[0] + 0.0036, Rc[1] + 0.0036, 44), 0.0058, { sides: 10 });
  // lining visible in turned cuff: inner lip
  loopTube(li, ringAround(lerp3(CUFF_TOP, CUFF_BOT, 0.5), ARM_D, ref, Rc[0] + 0.0068, Rc[1] + 0.0068, 44), 0.0014, { sides: 6 });
  // cuff buttons
  for (const k of [0.3, 0.72]) {
    const c = lerp3(CUFF_TOP, CUFF_BOT, k);
    const out = norm(sub([1, 0, 0.35], mul(ARM_D, dot([1, 0, 0.35], ARM_D))));
    disc(bt, add(c, mul(out, Rc[0] + 0.0092)), out, 0.0058, 0.0034, false);
  }
  // forearm skin
  const fpath = spline([lerp3(EL, WR, -0.1), lerp3(EL, WR, 0.3), lerp3(EL, WR, 0.7), WR, add(WR, mul(ARM_D, 0.012))], 24);
  const FT = [[0, .036, .036], [.3, .031, .033], [.65, .0235, .0285], [.82, .0192, .0258], [1, .0186, .0262]];
  tube(sk, fpath, t => table(FT, t), { sides: 20, ref });
  buildHand(sk, get('nail'));
}
function buildHand(sk, nail) {
  const Y = ARM_D; let X = norm(sub([1, 0, 0], mul(Y, Y[0]))); const Z = norm(cross(Y, X));
  const o = WR;
  const L = (lx, ly, lz) => add(o, add(add(mul(X, lx), mul(Y, ly)), mul(Z, lz)));
  // palm
  const PT = [[-0.012, .0186, .0262], [0, .0178, .0285], [.02, .0168, .0322], [.045, .0148, .0352], [.070, .0128, .0370], [.086, .0106, .0362], [.0925, .0070, .0310], [.0945, .003, .02]];
  const rings = [];
  for (let k = 0; k < PT.length; k++) {
    const ring = []; const [ly, rt, rw] = PT[k];
    for (let j = 0; j < 22; j++) { const a = j / 22 * TAU; const c = Math.cos(a), s = Math.sin(a); const sx = Math.sign(c) * Math.pow(Math.abs(c), 0.8), sz = Math.sign(s) * Math.pow(Math.abs(s), 0.85); ring.push(L(rt * sx - 0.0006, ly, rw * sz)); }
    rings.push(ring);
  }
  loft(sk, rings); fan(sk, rings[PT.length - 1], Y);
  // fingers: [z, length, radius, curl multiplier]
  const FG = [[0.0238, .070, .0083, 1.0], [0.0080, .077, .0086, 1.1], [-0.0078, .070, .0081, 1.2], [-0.0230, .056, .0069, 1.35]];
  FG.forEach(([zf, len, r, cm], idx) => {
    const segs = [0.44, 0.31, 0.25], curl = [0.14 * cm, 0.30 * cm, 0.22 * cm];
    let p = L(-0.001, 0.0885, zf); const pts = [p]; let phi = 0;
    for (let s = 0; s < 3; s++) { phi += curl[s]; const dir = add(mul(Y, Math.cos(phi)), mul(X, -Math.sin(phi))); p = add(p, mul(dir, segs[s] * len)); pts.push(p); }
    const dens = spline(pts, 18);
    tube(sk, dens, t => { const rr = r * (1.0 - 0.2 * t) * roundCap(t, 0.86); return [rr * 0.9, rr]; }, { sides: 12, ref: X, capEnd: true });
    // nail
    const tip = pts[3], dirD = norm(sub(pts[3], pts[2]));
    const nc = add(sub(tip, mul(dirD, 0.0062)), mul(X, r * 0.8 * 0.9 + 0.0004));
    ellipsoid(nail, nc, [0.0043, 0.0054, 0.0015], { bx: Z, by: dirD, bz: X, nu: 12, nv: 8 });
  });
  // thumb
  const th = [L(-0.004, 0.012, 0.028), L(-0.009, 0.036, 0.044), L(-0.015, 0.058, 0.053), L(-0.019, 0.075, 0.055), L(-0.021, 0.0905, 0.0545)];
  const tp = spline(th, 20);
  tube(sk, tp, t => { const rr = lerp(0.0125, 0.0088, t) * roundCap(t, 0.88); return [rr * 0.92, rr]; }, { sides: 14, ref: X, capEnd: true });
  const tdir = norm(sub(th[4], th[3])), tn = norm(add(mul(X, 0.55), mul(Z, 0.85)));
  ellipsoid(nail, add(sub(th[4], mul(tdir, 0.0065)), mul(tn, 0.0074)), [0.0052, 0.0064, 0.0015], { bx: norm(cross(tdir, tn)), by: tdir, bz: tn, nu: 12, nv: 8 });
  // thenar pad
  ellipsoid(sk, L(-0.012, 0.034, 0.030), [0.0115, 0.027, 0.0165], { bx: X, by: Y, bz: Z, nu: 14, nv: 10 });
}
function buildWatch() {
  const Y = ARM_D; const X = norm(sub([1, 0, 0], mul(Y, Y[0]))); const Z = norm(cross(Y, X));
  const Pw = sub(WR, mul(Y, 0.019));
  const rx = 0.0197, rz = 0.0262, off = 0.0026;
  const metal = M('metal');
  // bracelet
  const rows = []; const nW = 10, n = 100;
  const prof = (ly) => 0.0030 * (1 - Math.pow(Math.abs(ly) / 0.0098, 6)) + 0.0006;
  for (let j = 0; j <= nW; j++) {
    const ly = -0.0098 + 0.0196 * j / nW, ring = [];
    const groove = -0.0007 * (1 - smooth(0.0007, 0.0018, Math.abs(Math.abs(ly) - 0.0033)));
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU, link = -0.0008 * (1 - smooth(0.05, 0.22, Math.abs(Math.sin(17 * a))));
      const rr = off + prof(ly) + groove + link;
      ring.push(add(Pw, add(add(mul(X, (rx + rr) * Math.cos(a)), mul(Z, (rz + rr) * Math.sin(a))), mul(Y, ly))));
    }
    rows.push(ring);
  }
  loft(metal, rows, {}); 
  const inner = rows.map((r, j) => { const ly = -0.0098 + 0.0196 * j / nW; return r.map((p, k) => { const a = k / n * TAU; return add(Pw, add(add(mul(X, (rx + 0.0004) * Math.cos(a)), mul(Z, (rz + 0.0004) * Math.sin(a))), mul(Y, ly))); }); });
  loft(metal, inner, { reverse: true });
  // end caps of band
  fan(metal, rows[0], mul(Y, -1)); fan(metal, rows[nW], Y);
  // case
  const hs = 0.0160, rr = 0.0048;
  // build a clean rounded-rect outline instead
  const out = []; const corners = [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]];
  for (const [sx, sz, a0] of corners) for (let k = 0; k <= 8; k++) { const a = (a0 + k / 8 * 90) * PI / 180; out.push([sx * (hs - rr) + rr * Math.cos(a), sz * (hs - rr) + rr * Math.sin(a)]); }
  const caseM = new Mesh('metal');
  slab(caseM, out, 0, () => 0.0074, 0.0016);
  place(caseM, add(Pw, mul(X, rx + off + 0.0002)), Y, X, Z);
  metal.append(caseM);
  // crown
  const crown = new Mesh('metal'); ellipsoid(crown, [0, 0, 0], [0.0032, 0.0035, 0.0032], { nu: 12, nv: 8 });
  crown.transform(p => add(p, [hs + 0.0018, 0.0038, 0])); place(crown, add(Pw, mul(X, rx + off + 0.0002)), Y, X, Z); metal.append(crown);
  // dial (textured)
  const dial = M('dial'); const dh = 0.0128;
  const d0 = dial.addV([-dh, 0, -dh], [0, 1]), d1 = dial.addV([dh, 0, -dh], [0, 0]), d2 = dial.addV([dh, 0, dh], [1, 0]), d3 = dial.addV([-dh, 0, dh], [1, 1]);
  dial.tri(d0, d3, d2); dial.tri(d0, d2, d1);
  // ensure facing +y after place
  dial.transform(p => [p[0], 0.0077, p[2]]);
  place(dial, add(Pw, mul(X, rx + off + 0.0002)), Y, X, Z);
  // glass
  const glass = M('glass'); const gm = new Mesh('glass');
  const outG = out.map(p => [p[0] * 0.86, p[1] * 0.86]);
  slab(gm, outG, 0.0079, () => 0.0090, 0.0006);
  place(gm, add(Pw, mul(X, rx + off + 0.0002)), Y, X, Z); glass.append(gm);
}

/* ---------------- trousers ---------------- */
function buildTrousers() {
  const m = M('trousers');
  const PR = [[0.78, .172, .113, 0, 2.3], [0.83, .172, .113, 0, 2.3], [0.88, .166, .110, 0, 2.3], [0.93, .150, .102, -.002, 2.3], [0.98, .1305, .093, 0, 2.3], [1.005, .130, .092, 0, 2.3]];
  const pr = [];
  for (let y = 1.005; y >= 0.7799; y -= 0.0175) { const [rx, rz, cz, p] = table(PR, y); pr.push(ringXZ(y, 0, cz, rx, rz, p, 64)); }
  loft(m, pr);
  doubleShell(m, pr.slice(0, 4), 0.004);
  const wring = (rx, rz, y) => { const out = []; for (let k = 0; k < 64; k++) { const a = k / 64 * TAU, s = Math.sin(a), c = Math.cos(a), p = 2.3; out.push([rx * Math.sign(s) * Math.pow(Math.abs(s), 2 / p), y, rz * Math.sign(c) * Math.pow(Math.abs(c), 2 / p)]); } return out; };
  loopTube(m, wring(0.1295, 0.0925, 1.003), 0.0032, { sides: 8 });
  loopTube(M('trousersSeam'), wring(0.1318, 0.0953, 0.9795), 0.0008, { sides: 5 });
  // legs: build the +x leg, mirror for -x
  const leg = new Mesh('trousers');
  const LR = [[0.012, .126, .120, .108, 0], [0.14, .121, .113, .105, 0], [0.28, .115, .102, .104, 0], [0.42, .108, .094, .102, 0], [0.55, .102, .092, .104, 0], [0.70, .094, .090, .108, 0], [0.84, .086, .086, .112, 0]];
  const legRings = [];
  const ys = [0.84]; for (let y = 0.8095; y > 0.0121; y -= 0.0295) ys.push(y); ys.push(0.012);
  for (const y of ys) {
    const [cx, rx, rz, cz] = table(LR, y);
    legRings.push(ringXZ(y, cx, cz, rx, rz, 2.15, 56, (a, yy) => {
      const crease = 0.0020 * gauss(Math.sin(a), 0.09) * Math.abs(Math.cos(a));
      const hemNoise = 0.0018 * vnoise(a * 2.2, yy * 5) * smooth(0.3, 0.0, yy);
      const knee = 0.0012 * vnoise(a * 3 + 9, yy * 14);
      return crease + hemNoise + knee;
    }));
  }
  loft(leg, legRings);
  doubleShell(leg, legRings.slice(-5), 0.0045);
  const hemO = legRings[legRings.length - 1];
  annulus(leg, hemO, shrinkRing(hemO, 0.0045), [0, -1, 0]);
  m.append(leg); m.append(leg.mirrored());
}

/* ---------------- feet & sandals ---------------- */
function buildFootSide(get) {
  const sk = get('skin'), shoe = get('shoe'), sole = get('shoeSole'), nail = get('nail');
  const WID = [[-0.095, 0.0], [-0.088, 0.026], [-0.05, 0.0305], [0.0, 0.033], [0.04, 0.0385], [0.08, 0.0440], [0.12, 0.0405], [0.146, 0.0285], [0.153, 0.012], [0.1555, 0.0]];
  const outline = [];
  const zs = []; for (let k = 0; k <= 48; k++) zs.push(-0.095 + (0.1555 + 0.095) * (0.5 - 0.5 * Math.cos(PI * k / 48)));
  const hw = z => Math.max(0.0005, table(WID, z)[0]);
  // custom rounded ends via explicit samples
  const left = zs.map(z => [-hw(z) * 1.0, z]), right = zs.map(z => [hw(z) * 1.0, z]).reverse();
  const ol = left.concat(right).filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-4);
  const topFn = (x, z) => table([[-0.095, 0.0345], [-0.04, 0.0315], [0.02, 0.0255], [0.08, 0.0185], [0.156, 0.0145]], z)[0];
  const solMesh = new Mesh('shoeSole'); slab(solMesh, ol, 0, () => 0.0085, 0.0024); sole.append(solMesh);
  const insol = new Mesh('shoe'); const ol2 = ol.map(p => [p[0] * 0.985, p[1] * 0.99 - (p[1] > 0.0 ? 0.0008 : -0.0008) * 0]);
  slab(insol, ol2, 0.0072, topFn, 0.0020); shoe.append(insol);
  // foot skin (instep to toe base)
  const HT = [[-0.045, 0.100], [-0.01, 0.088], [0.03, 0.066], [0.07, 0.045], [0.102, 0.034]];
  const WS = [[-0.045, 0.0285], [0.0, 0.0305], [0.04, 0.0360], [0.08, 0.0415], [0.104, 0.0400]];
  const fr = [];
  for (let z = -0.045; z <= 0.1041; z += 0.0075) {
    const yb = topFn(0, z) - 0.002, ht = table(HT, z)[0], w = table(WS, z)[0];
    const ring = []; for (let j = 0; j < 20; j++) { const a = j / 20 * TAU; ring.push([w * Math.sin(a), (yb + ht) / 2 + (ht - yb) / 2 * Math.cos(a), z]); }
    fr.push(ring);
  }
  loft(sk, fr); fan(sk, fr[fr.length - 1], [0, 0, 1]);
  // toes
  const T = [[-0.0285, .1495, .0108], [-0.0145, .1500, .0080], [0.0005, .1440, .0074], [0.0140, .1375, .0070], [0.0250, .1280, .0064]];
  T.forEach(([tx, tz, r], idx) => {
    const y0 = topFn(0, 0.1) + r * 0.92 + 0.0006;
    const pts = [[tx * 0.96, y0 + 0.004, 0.092], [tx, y0 + 0.001, 0.112], [tx * 1.03, y0, (0.112 + tz) / 2], [tx * 1.04, y0 - r * 0.15, tz]];
    const dens = spline(pts, 12);
    tube(sk, dens, t => { const rr = r * roundCap(t, 0.82); return [rr * 0.88, rr]; }, { sides: 10, ref: [0, 1, 0], capEnd: true });
    ellipsoid(nail, [tx * 1.04, y0 + r * 0.55, tz - r * 0.9], [r * 0.68, 0.0013, r * 0.85], { nu: 10, nv: 6 });
  });
  // vamp strap
  thickPatch(shoe, shoe, shoe, (s, w) => {
    const z = lerp(0.038, 0.078, s), yb = topFn(0, z), ht = table(HT, z)[0] + 0.0045, rx = table(WS, z)[0] + 0.0045;
    const a = w * PI; return [rx * Math.cos(a), yb + (ht - yb) * Math.sin(a), z];
  }, 8, 24, 0.0036, { hint: p => [p[0], 0.5, 0], tile: 0.05 });
}

function buildFeet() {
  const reg = {}; const get = id => reg[id] || (reg[id] = new Mesh(id));
  buildFootSide(get);
  const toe = 0.10;
  for (const id in reg) {
    const left = reg[id];
    left.transform(p => { const x = p[0] * Math.cos(toe) + p[2] * Math.sin(toe), z = -p[0] * Math.sin(toe) + p[2] * Math.cos(toe); return [x + 0.121, p[1], z + 0.004]; });
    M(id).append(left); M(id).append(left.mirrored());
  }
}

/* ---------------- earrings ---------------- */
function buildEarring(side, base, outDir, Zdir) {
  const metal = M('metal'), gem = M('gem');
  const ring = []; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; ring.push(add(base, add(mul(Zdir, Math.cos(a) * 0.0044), mul(cross(outDir, Zdir), Math.sin(a) * 0.0044)))); }
  loopTube(metal, ring, 0.0009, { sides: 6 });
  ellipsoid(gem, add(base, mul(outDir, 0.0006)), [0.0036, 0.0030, 0.0036], { nu: 8, nv: 5, bx: cross(outDir, Zdir), by: outDir, bz: Zdir });
  const pl = []; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; pl.push(add(base, add(mul(Zdir, Math.cos(a) * 0.0048), mul(cross(outDir, Zdir), Math.sin(a) * 0.0048)))); }
  ellipsoid(metal, sub(base, mul(outDir, 0.0006)), [0.0050, 0.0014, 0.0050], { nu: 16, nv: 5, bx: cross(outDir, Zdir), by: outDir, bz: Zdir });
}
