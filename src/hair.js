/* ===== Hair: scalp cap + layered swept locks (head-local, moved to HC) ===== */
const HAIRLINE = [[0, 58], [20, 60], [45, 69], [65, 78], [78, 90], [86, 92], [89, 76], [105, 74], [112, 82], [120, 98], [135, 116], [155, 126], [180, 129]];
const hairline = az => table(HAIRLINE, Math.abs(az) * 180 / PI)[0] * PI / 180;
const dirOf = (az, pol) => [Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az)];
const hairPt = (d, off) => { const R = headRadius(d); return [d[0] * (R + off), d[1] * (R + off), d[2] * (R + off)]; };

function buildHair() {
  const rnd = rng(11);
  const cap = new Mesh('hairCap'), locks = new Mesh('hair');
  const rings = [], M_ = 40, N_ = 168;
  for (let i = 0; i <= M_; i++) {
    const t = i / M_, ring = [];
    for (let j = 0; j < N_; j++) {
      const az = -PI + j / N_ * TAU, pol = Math.max(1e-3, t * (hairline(az) - 0.012));
      ring.push(hairPt(dirOf(az, pol), 0.0022 + 0.0040 * smooth(1.3, 0.0, pol)));
    }
    rings.push(ring);
  }
  loft(cap, rings, { tile: 0.05 });
  const R = rnd, jit = (v, a) => v + (R() - 0.5) * a;
  function lock(d0, flow, arc, vol, width, thick, tipLift, wig, shade) {
    let f = sub(flow, mul(d0, dot(flow, d0))); f = norm(f);
    const side = norm(cross(d0, f)), nSeg = 12;
    const build = (A) => {
      const pts = [];
      for (let k = 0; k <= nSeg; k++) {
        const t = k / nSeg, ang = A / 0.1 * t;
        let d = add(mul(d0, Math.cos(ang)), mul(f, Math.sin(ang)));
        d = norm(add(d, mul(side, wig * Math.sin(t * 3.0 + shade * 7) * 0.25 * t)));
        pts.push({ d, off: 0.0026 + vol * Math.pow(Math.sin(PI * Math.pow(t, 0.8)), 0.9) + tipLift * t * t * t });
      }
      return pts;
    };
    let A = arc, P = build(A);
    for (let it = 0; it < 12; it++) {                                  // keep tips above the hairline
      const e = P[nSeg].d, pol = Math.acos(clamp(e[1], -1, 1)), az = Math.atan2(e[0], e[2]);
      if (pol > hairline(az) - 0.05 && A > 0.012) { A *= 0.88; P = build(A); } else break;
    }
    const pts = P.map(q => hairPt(q.d, q.off)), ringsL = [];
    for (let k = 0; k <= nSeg; k++) {
      const t = k / nSeg, p = pts[k];
      const T = norm(sub(pts[Math.min(nSeg, k + 1)], pts[Math.max(0, k - 1)]));
      const W = norm(cross(T, norm(p))), Nn = norm(cross(W, T));
      const hw = width * 0.5 * (0.55 + 0.45 * smooth(0, 0.25, t)) * (1 - 0.78 * Math.pow(t, 3.0)) + 0.0004;
      const ht = thick * 0.5 * (1 - 0.85 * Math.pow(t, 2.2)) + 0.00015;
      const ring = [];
      for (let s = 0; s < 6; s++) { const a = s / 6 * TAU; ring.push(add(p, add(mul(W, hw * Math.cos(a)), mul(Nn, ht * Math.sin(a))))); }
      ringsL.push(ring);
    }
    loft(locks, ringsL, { tile: 0.05, colFn: (p, i) => { const t = i / nSeg; const g = shade * (0.82 + 0.3 * t); return [g, g, g * 1.02]; } });
  }
  // 1. top volume, swept toward her left (+x)
  for (let i = 0; i < 330; i++) {
    const pol = Math.acos(1 - R() * (1 - Math.cos(1.0))), az = R() * TAU - PI;
    if (pol > hairline(az) - 0.07) continue;
    const k = 1 - pol / 1.2;
    lock(dirOf(az, pol), [jit(1.0, 0.16), jit(0.05, 0.12), jit(0.30, 0.25)], 0.056 + 0.026 * R(), (0.009 + 0.010 * R()) * (0.45 + k), 0.017 + 0.008 * R(), 0.0038, 0.002 + 0.003 * R(), 0.12, 0.84 + 0.3 * R());
  }
  // 2. fringe along the front hairline, lifted and swept
  for (let i = 0; i < 90; i++) {
    const az = -0.85 + R() * 1.8, pol = hairline(az) - 0.05 - R() * 0.12;
    lock(dirOf(az, pol), [jit(0.85, 0.2), jit(0.55, 0.15), jit(-0.15, 0.2)], 0.042 + 0.022 * R(), 0.010 + 0.008 * R(), 0.014 + 0.005 * R(), 0.0034, 0.005 + 0.004 * R(), 0.12, 0.85 + 0.3 * R());
  }
  // 3. sides, short and close
  for (let i = 0; i < 150; i++) {
    const sg = i % 2 ? 1 : -1, az = sg * (0.50 + R() * 1.30), pol = hairline(az) - 0.28 - R() * 0.60;
    if (pol < 0.25) continue;
    lock(dirOf(az, pol), [jit(0, 0.2), -0.8, -0.5 + jit(0, 0.3)], 0.026 + 0.016 * R(), 0.003, 0.011 + 0.004 * R(), 0.0032, 0.0, 0.1, 0.72 + 0.3 * R());
  }
  // 4. back
  for (let i = 0; i < 240; i++) {
    const az2 = (R() < 0.5 ? 1 : -1) * (PI - 0.9 + R() * 0.9), pol = Math.min(hairline(az2) - 0.25, 0.85 + R() * 1.1);
    if (pol < 0.8) continue;
    lock(dirOf(az2, pol), [jit(0.55, 0.4), -0.8, jit(-0.1, 0.2)], 0.036 + 0.024 * R(), 0.005, 0.010 + 0.004 * R(), 0.0030, 0.001, 0.2, 0.68 + 0.45 * R());
  }
  // 5. nape
  for (let i = 0; i < 90; i++) {
    const az = (R() < 0.5 ? 1 : -1) * (PI - R() * 0.8), pol = hairline(az) - 0.12 - R() * 0.3;
    lock(dirOf(az, pol), [jit(0.15, 0.2), -1, 0], 0.020 + 0.010 * R(), 0.002, 0.008, 0.003, 0.0, 0.1, 0.65 + 0.4 * R());
  }
  // 6. crown / back-top swept
  for (let i = 0; i < 160; i++) {
    const az = (R() < 0.5 ? 1 : -1) * (PI - 0.2 - R() * 1.5), pol = 0.3 + R() * 0.65;
    lock(dirOf(az, pol), [jit(0.9, 0.4), jit(-0.25, 0.3), jit(-0.3, 0.3)], 0.050 + 0.025 * R(), 0.008 + 0.008 * R(), 0.011 + 0.005 * R(), 0.0032, 0.003, 0.2, 0.72 + 0.5 * R());
  }
  cap.transform(p => add(p, HC)); locks.transform(p => add(p, HC));
  M('hairCap').append(cap); M('hair').append(locks);
}
