function buildModel() {
  for (const k in registry) delete registry[k];
  buildTop(); buildNeck(); buildJacket();
  buildArmSide(M);
  const tmp = {}; buildArmSide(id => tmp[id] || (tmp[id] = new Mesh(id)));
  for (const id in tmp) M(id).append(tmp[id].mirrored());
  buildWatch(); buildTrousers(); buildFeet(); buildFace(); buildHair();
  const parts = [];
  for (const id in registry) {
    const m = registry[id]; if (!m.idx.length) continue;
    parts.push({ id, mat: m.mat, pos: new Float32Array(m.pos), nor: computeNormals(m), uv: new Float32Array(m.uv), col: m.col ? new Float32Array(m.col) : null, idx: new Uint32Array(m.idx) });
  }
  return parts;
}
