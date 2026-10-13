(function () {
  'use strict';
  /* ---------- reference defaults ---------- */
  const DEFAULTS = {
    colors: { blazer: '#46302c', top: '#3a2826', trousers: '#3f2a2b', shoe: '#cdb096' },
    light: 'soft', dir: 35, intensity: 1.0, exposure: 0.95, rough: 0.82, wire: false, floor: true
  };
  const state = JSON.parse(JSON.stringify(DEFAULTS));
  const SKIN = '#c08c6a';

  const PRESETS = {
    soft: { bg: '#d8dade', key: 0xffffff, keyI: 0.80, fill: 0xffffff, fillI: 0.22, rim: 0xffffff, rimI: 0.30, hemiSky: 0xffffff, hemiGround: 0xb9b4b0, hemiI: 0.22, env: { wall: 0.50, floor: 0.28, key: [1, 1, 1], fill: [1, 1, 1], top: [1, 1, 1] }, envI: 0.60 },
    warm: { bg: '#ddd7d0', key: 0xffdcb4, keyI: 0.84, fill: 0xffe6d0, fillI: 0.20, rim: 0xffd2a4, rimI: 0.32, hemiSky: 0xfff0e0, hemiGround: 0xbfa992, hemiI: 0.22, env: { wall: 0.50, floor: 0.28, key: [1, 0.80, 0.58], fill: [1, 0.86, 0.72], top: [1, 0.92, 0.82] }, envI: 0.60 },
    cool: { bg: '#d3d9e2', key: 0xd3e2ff, keyI: 0.78, fill: 0xdce8ff, fillI: 0.26, rim: 0xb8d0ff, rimI: 0.36, hemiSky: 0xe6efff, hemiGround: 0xa5aebb, hemiI: 0.22, env: { wall: 0.50, floor: 0.28, key: [0.78, 0.88, 1], fill: [0.80, 0.90, 1], top: [0.88, 0.93, 1] }, envI: 0.60 }
  };

  /* ---------- helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const stageEl = $('stage');
  let renderer, scene, camera, floorGroup, keyLight, fillLight, rimLight, hemi, pmrem, envTarget, charGroup;
  const mats = {};
  let dirty = true;
  const requestRender = () => { dirty = true; };

  /* ---------- procedural textures ---------- */
  function canvasTex(size, draw, srgb, repeat) {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
    const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 8; return t;
  }
  function rnd(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function herringbone() {
    return canvasTex(512, (g, s) => {
      const R = rnd(3); g.fillStyle = '#ebebeb'; g.fillRect(0, 0, s, s);
      const bw = 32;
      for (let bx = 0; bx < s; bx += bw) {
        const dir = ((bx / bw) | 0) % 2 ? 1 : -1;
        g.save(); g.beginPath(); g.rect(bx, 0, bw, s); g.clip();
        for (let y = -bw; y < s + bw; y += 4) { g.strokeStyle = 'rgba(0,0,0,' + (0.07 + R() * 0.12) + ')'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(bx, y); g.lineTo(bx + bw, y + dir * bw * 0.5); g.stroke(); }
        g.restore();
        g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(bx, 0, 1.5, s);
      }
      for (let i = 0; i < 9000; i++) { g.fillStyle = 'rgba(' + (R() < 0.5 ? '0,0,0' : '255,255,255') + ',' + (0.04 + R() * 0.07) + ')'; g.fillRect(R() * s, R() * s, 1 + R() * 1.5, 1 + R() * 1.5); }
    }, true, true);
  }
  function crepe(seed) {
    return canvasTex(512, (g, s) => {
      const R = rnd(seed); g.fillStyle = '#ececec'; g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 4) { g.strokeStyle = 'rgba(0,0,0,0.05)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y); g.lineTo(s, y + 4); g.stroke(); }
      for (let i = 0; i < 38000; i++) { const v = R() < 0.5 ? 0 : 255; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.05 + R() * 0.12) + ')'; g.fillRect(R() * s, R() * s, 1, 1 + (R() < 0.3 ? 1 : 0)); }
      for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(' + (R() < 0.5 ? '80,50,48' : '230,210,200') + ',0.35)'; g.fillRect(R() * s, R() * s, 1.5, 1.5); }   // flecks
    }, true, true);
  }
  function streaks() {
    return canvasTex(256, (g, s) => {
      const R = rnd(21); g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 700; i++) { const v = (R() < 0.5 ? 0 : 255); g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.12 + R() * 0.2) + ')'; g.lineWidth = 0.7 + R() * 1.2; const x = R() * s; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (R() - 0.5) * 6, s); g.stroke(); }
    }, true, true);
  }
  function irisTex() {
    return canvasTex(256, (g, s) => {
      const c = s / 2, R = rnd(5);
      const gr = g.createRadialGradient(c, c, 0, c, c, c);
      gr.addColorStop(0, '#050403'); gr.addColorStop(0.27, '#050403'); gr.addColorStop(0.31, '#7a4a22'); gr.addColorStop(0.55, '#4f2d15'); gr.addColorStop(0.85, '#2c180b'); gr.addColorStop(0.95, '#160b05'); gr.addColorStop(1, '#0c0603');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 220; i++) { const a = R() * Math.PI * 2, r0 = c * (0.3 + R() * 0.1), r1 = c * (0.62 + R() * 0.32); g.strokeStyle = R() < 0.5 ? 'rgba(18,8,3,0.30)' : 'rgba(170,110,55,0.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke(); }
    }, true, false);
  }
  function browTex() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); const R = rnd(9);
    g.clearRect(0, 0, 512, 128);
    // soft dense core so no skin shows through
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(30,20,16,0)'); gr.addColorStop(0.2, 'rgba(30,20,16,0.55)'); gr.addColorStop(0.5, 'rgba(24,16,13,0.8)'); gr.addColorStop(0.8, 'rgba(30,20,16,0.55)'); gr.addColorStop(1, 'rgba(30,20,16,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 1800; i++) {
      const y0 = 64 + (R() + R() + R() - 1.5) * 52, x0 = R() * 512, L = 36 + R() * 70, a = -0.10 + (R() - 0.5) * 0.28;
      const v = 14 + Math.floor(R() * 44); g.strokeStyle = 'rgba(' + v + ',' + Math.floor(v * 0.7) + ',' + Math.floor(v * 0.6) + ',' + (0.55 + R() * 0.4) + ')'; g.lineWidth = 1 + R() * 1.6;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function dialTex() {
    return canvasTex(256, (g, s) => {
      g.fillStyle = '#f2f0eb'; g.fillRect(0, 0, s, s);
      const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.08)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
      const c = s / 2, hs = s * 0.40;
      g.strokeStyle = '#2b2b2e'; g.lineCap = 'round';
      for (let h = 0; h < 12; h++) {
        const a = h / 12 * Math.PI * 2 - Math.PI / 2, dx = Math.cos(a), dy = Math.sin(a), k = hs / Math.max(Math.abs(dx), Math.abs(dy));
        const x1 = c + dx * k, y1 = c + dy * k, k2 = k - (h % 3 === 0 ? 20 : 11);
        g.lineWidth = h % 3 === 0 ? 7 : 4; g.beginPath(); g.moveTo(c + dx * k2, c + dy * k2); g.lineTo(x1, y1); g.stroke();
      }
      g.lineWidth = 7; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(-Math.PI / 2 - 1.05) * 50, c + Math.sin(-Math.PI / 2 - 1.05) * 50); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(-Math.PI / 2 + 1.05) * 78, c + Math.sin(-Math.PI / 2 + 1.05) * 78); g.stroke();
      g.fillStyle = '#2b2b2e'; g.beginPath(); g.arc(c, c, 7, 0, Math.PI * 2); g.fill();
    }, true, false);
  }
  function blobTex() {
    return canvasTex(256, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, false, false);
  }
  function floorFadeTex() {
    return canvasTex(256, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, false, false);
  }

  /* ---------- materials ---------- */
  function makeMaterials() {
    const fab = herringbone(), crep = crepe(11), crep2 = crepe(23), hairTex = streaks();
    const P = (o) => new THREE.MeshPhysicalMaterial(o), S = (o) => new THREE.MeshStandardMaterial(o);
    mats.skin = P({ color: lin(SKIN), roughness: 0.56, metalness: 0, clearcoat: 0.10, clearcoatRoughness: 0.6, vertexColors: true });
    mats.skinDark = S({ color: lin('#8c5f47'), roughness: 0.6 });
    mats.lips = P({ color: lin('#a35e57'), roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.35 });
    mats.teeth = S({ color: lin('#efe8de'), roughness: 0.32 });
    mats.mouth = S({ color: lin('#2b1010'), roughness: 0.9 });
    mats.nostril = S({ color: lin('#3a1c17'), roughness: 0.9 });
    mats.sclera = S({ color: lin('#f1ede9'), roughness: 0.22 });
    mats.iris = S({ color: 0xffffff, map: irisTex(), roughness: 0.3 });
    mats.cornea = P({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false, envMapIntensity: 1.8 });
    mats.lash = S({ color: lin('#120c0b'), roughness: 0.6 });
    mats.brow = S({ color: 0xffffff, map: browTex(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.7 });
    mats.nail = P({ color: lin('#e6c1b6'), roughness: 0.25, clearcoat: 0.5, clearcoatRoughness: 0.2 });
    mats.hair = P({ color: lin('#171212'), roughness: 0.36, clearcoat: 0.35, clearcoatRoughness: 0.35, vertexColors: true });
    mats.hairCap = S({ color: lin('#100c0c'), roughness: 0.5, map: hairTex, bumpMap: hairTex, bumpScale: 0.5 });
    mats.blazer = S({ color: lin(state.colors.blazer), roughness: state.rough, map: fab, bumpMap: fab, bumpScale: 0.6 });
    mats.blazerLining = S({ color: lin('#2b1d1c'), roughness: 0.45 });
    mats.blazerSeam = S({ color: lin('#2a1c19'), roughness: 0.9 });
    mats.top = S({ color: lin(state.colors.top), roughness: state.rough, map: crep, bumpMap: crep, bumpScale: 0.5 });
    mats.trousers = S({ color: lin(state.colors.trousers), roughness: state.rough, map: crep2, bumpMap: crep2, bumpScale: 0.5 });
    mats.trousersSeam = S({ color: lin('#2b1c1d'), roughness: 0.9 });
    mats.button = P({ color: lin('#1e1411'), roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    mats.buttonHole = S({ color: 0x050303, roughness: 0.9 });
    mats.shoe = S({ color: lin(state.colors.shoe), roughness: 0.55 });
    mats.shoeSole = S({ color: lin('#b09a82'), roughness: 0.75 });
    mats.metal = S({ color: lin('#c9ccd1'), metalness: 1, roughness: 0.3 });
    mats.gem = P({ color: 0xffffff, roughness: 0.02, metalness: 0, clearcoat: 1, flatShading: true, envMapIntensity: 2.2 });
    mats.dial = S({ color: 0xffffff, map: dialTex(), roughness: 0.4 });
    mats.glass = P({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.10, depthWrite: false, envMapIntensity: 1.5 });
    updateDerivedColors();
  }
  const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return c.convertSRGBToLinear(); };
  function updateDerivedColors() {
    mats.blazer.color.copy(lin(state.colors.blazer)); mats.blazerSeam.color.copy(shade(state.colors.blazer, 0.62));
    mats.top.color.copy(lin(state.colors.top));
    mats.trousers.color.copy(lin(state.colors.trousers)); mats.trousersSeam.color.copy(shade(state.colors.trousers, 0.62));
    mats.shoe.color.copy(lin(state.colors.shoe)); mats.shoeSole.color.copy(shade(state.colors.shoe, 0.82));
  }

  /* ---------- scene ---------- */
  function buildEnv(p) {
    const s = new THREE.Scene();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(26, 14, 26), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.env.wall, p.env.wall, p.env.wall), side: THREE.BackSide })); wall.position.y = 6; s.add(wall);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.env.floor, p.env.floor, p.env.floor) })); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.02; s.add(fl);
    const box = (w, h, pos, rgb, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(rgb[0] * k, rgb[1] * k, rgb[2] * k), side: THREE.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 1.2, 0); s.add(m); };
    box(5, 6, [-6, 3.4, 6], p.env.key, 5.0);
    box(4, 5, [6.5, 2.0, 4.5], p.env.fill, 2.2);
    box(8, 3, [0, 7.5, 1.5], p.env.top, 3.4);
    box(5, 5, [3, 3.0, -7], p.env.fill, 2.6);
    return s;
  }
  function applyPreset(name) {
    const p = PRESETS[name];
    renderer.setClearColor(new THREE.Color(p.bg), 1);
    if (envTarget) envTarget.dispose();
    envTarget = pmrem.fromScene(buildEnv(p), 0.04);
    scene.environment = envTarget.texture;
    keyLight.color.setHex(p.key); fillLight.color.setHex(p.fill); rimLight.color.setHex(p.rim);
    hemi.color.setHex(p.hemiSky); hemi.groundColor.setHex(p.hemiGround);
    const fc = lin(p.bg).multiplyScalar(0.95); floorMat.color.copy(fc);
    applyIntensity(); requestRender();
  }
  function applyIntensity() {
    const p = PRESETS[state.light], k = state.intensity;
    keyLight.intensity = p.keyI * k; fillLight.intensity = p.fillI * k; rimLight.intensity = p.rimI * k; hemi.intensity = p.hemiI * k;
    for (const id in mats) mats[id].envMapIntensity = (id === 'cornea' || id === 'glass' || id === 'gem' ? 2.0 : 1.0) * p.envI * k * (id === 'metal' ? 1.4 : 1);
    renderer.toneMappingExposure = state.exposure; requestRender();
  }
  function applyKeyDirection() {
    const a = state.dir * Math.PI / 180;
    renderer.shadowMap.needsUpdate = true;
    keyLight.position.set(Math.sin(a) * 4.2, 3.4, Math.cos(a) * 4.2);
    rimLight.position.set(-Math.sin(a) * 3.2, 2.6, -Math.cos(a) * 3.2);
    fillLight.position.set(-Math.sin(a + 0.9) * 3.5, 1.6, Math.cos(a + 0.9) * 3.5);
    requestRender();
  }
  let floorMat;
  function buildStage() {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.LinearToneMapping; renderer.toneMappingExposure = state.exposure;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    stageEl.insertBefore(renderer.domElement, stageEl.firstChild); renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', '3D character viewport');
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(26, 1, 0.05, 60);
    pmrem = new THREE.PMREMGenerator(renderer);

    keyLight = new THREE.DirectionalLight(0xffffff, 1); keyLight.castShadow = true; keyLight.shadow.mapSize.set(2048, 2048);
    const sc = keyLight.shadow.camera; sc.left = -2.1; sc.right = 2.1; sc.top = 2.1; sc.bottom = -2.1; sc.near = 0.5; sc.far = 12; sc.updateProjectionMatrix(); keyLight.shadow.bias = -0.0003; keyLight.shadow.normalBias = 0.012; keyLight.shadow.radius = 4;
    keyLight.target.position.set(0, 0.85, 0); scene.add(keyLight, keyLight.target);
    fillLight = new THREE.DirectionalLight(0xffffff, 0.2); fillLight.target.position.set(0, 0.9, 0); scene.add(fillLight, fillLight.target);
    rimLight = new THREE.DirectionalLight(0xffffff, 0.3); rimLight.target.position.set(0, 1.0, 0); scene.add(rimLight, rimLight.target);
    hemi = new THREE.HemisphereLight(0xffffff, 0xb9b4b0, 0.2); scene.add(hemi);

    // floor group: seamless fade disc, soft contact shadows, shadow catcher
    floorGroup = new THREE.Group(); scene.add(floorGroup);
    floorMat = new THREE.MeshBasicMaterial({ color: lin('#d0d3d8'), alphaMap: floorFadeTex(), transparent: true, depthWrite: false, toneMapped: false });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), floorMat); floor.rotation.x = -Math.PI / 2; floor.renderOrder = 0; floorGroup.add(floor);
    const blobMat = new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 });
    const addBlob = (x, z, w, d) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(w, d), blobMat); b.rotation.x = -Math.PI / 2; b.position.set(x, 0.0015, z); b.renderOrder = 1; floorGroup.add(b); };
    addBlob(0, 0.01, 1.05, 0.62); addBlob(0.126, 0.02, 0.34, 0.40); addBlob(-0.126, 0.02, 0.34, 0.40);
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.26, depthWrite: false })); catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.003; catcher.receiveShadow = true; catcher.renderOrder = 2; floorGroup.add(catcher);
  }

  function buildCharacter() {
    const parts = buildModel();
    charGroup = new THREE.Group();
    for (const p of parts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(p.nor, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(p.uv, 2));
      if (p.col) g.setAttribute('color', new THREE.BufferAttribute(p.col, 3));
      g.setIndex(new THREE.BufferAttribute(p.idx, 1));
      g.computeBoundingSphere();
      let m = mats[p.mat]; if (!m) { console.warn('no material', p.mat); m = mats.skin; }
      if (p.mat === 'skin' && !p.col) m = mats.skinDark;
      const mesh = new THREE.Mesh(g, m); mesh.name = p.id;
      const transparent = p.mat === 'cornea' || p.mat === 'glass';
      mesh.castShadow = !transparent; mesh.receiveShadow = true; if (transparent) mesh.renderOrder = 5;
      charGroup.add(mesh);
    }
    scene.add(charGroup);
  }

  /* ---------- camera / orbit ---------- */
  const cam = { target: new THREE.Vector3(0, 0.83, 0), az: 0.42, el: 0.09, dist: 4.5 };
  const FOV = 26 * Math.PI / 180;
  function fitDist(h, w) {
    const aspect = Math.max(0.2, stageEl.clientWidth / Math.max(1, stageEl.clientHeight));
    const dv = (h / 2) / Math.tan(FOV / 2), dh = (w / 2) / (Math.tan(FOV / 2) * aspect);
    return Math.max(dv, dh);
  }
  const fitFull = () => fitDist(1.62 * 1.17, 0.95);
  function applyCam() {
    cam.el = Math.max(-0.05, Math.min(1.5, cam.el)); cam.dist = Math.max(0.3, Math.min(9, cam.dist));
    cam.target.y = Math.max(0.0, Math.min(1.9, cam.target.y)); cam.target.x = Math.max(-1.2, Math.min(1.2, cam.target.x)); cam.target.z = Math.max(-1.2, Math.min(1.2, cam.target.z));
    const ce = Math.cos(cam.el);
    camera.position.set(cam.target.x + cam.dist * ce * Math.sin(cam.az), cam.target.y + cam.dist * Math.sin(cam.el), cam.target.z + cam.dist * ce * Math.cos(cam.az));
    camera.lookAt(cam.target); requestRender();
  }
  function setView(name) {
    const full = fitFull();
    const V = {
      front: { az: 0, el: 0.04, t: [0, 0.83, 0], d: full },
      tq: { az: 0.62, el: 0.07, t: [0, 0.83, 0], d: full },
      left: { az: Math.PI / 2, el: 0.04, t: [0, 0.83, 0], d: full },
      right: { az: -Math.PI / 2, el: 0.04, t: [0, 0.83, 0], d: full },
      back: { az: Math.PI, el: 0.04, t: [0, 0.83, 0], d: full },
      top: { az: 0, el: 1.5, t: [0, 0.83, 0], d: fitDist(1.62 * 1.1, 0.95) * 0.9 },
      face: { az: 0.18, el: 0.03, t: [0, 1.485, 0.03], d: fitDist(0.46, 0.34) }
    }[name];
    cam.az = V.az; cam.el = V.el; cam.target.set(V.t[0], V.t[1], V.t[2]); cam.dist = V.d; applyCam();
  }
  function resetView() { cam.az = 0.42; cam.el = 0.09; cam.target.set(0, 0.83, 0); cam.dist = fitFull(); applyCam(); }
  function fitCharacter() { cam.target.set(0, 0.83, 0); cam.dist = fitFull(); applyCam(); }

  function bindOrbit() {
    const el = renderer.domElement; const ptrs = new Map(); let last = null, mode = null, pinch = 0;
    const panBy = (dx, dy) => {
      const h = el.clientHeight, f = 2 * cam.dist * Math.tan(FOV / 2) / h;
      camera.updateMatrix(); const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
      cam.target.addScaledVector(right, -dx * f).addScaledVector(up, dy * f); applyCam();
    };
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      mode = (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey || e.metaKey)) ? 'pan' : 'orbit';
      last = { x: e.clientX, y: e.clientY };
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); mode = 'pinch'; last = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    });
    el.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (pinch > 0) cam.dist *= pinch / d; pinch = d; panBy(m.x - last.x, m.y - last.y); last = m; return;
      }
      const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
      if (mode === 'pan') panBy(dx, dy);
      else { cam.az -= dx * 2 * Math.PI / el.clientHeight; cam.el += dy * 2 * Math.PI / el.clientHeight * 0.6; applyCam(); }
    });
    const end = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0; if (ptrs.size === 1) { const p = [...ptrs.values()][0]; last = { x: p.x, y: p.y }; mode = 'orbit'; } if (!ptrs.size) mode = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => { e.preventDefault(); cam.dist *= Math.exp(Math.max(-120, Math.min(120, e.deltaY)) * 0.0011); applyCam(); }, { passive: false });
    el.addEventListener('keydown', e => {
      const k = e.key; let used = true;
      if (k === 'ArrowLeft') cam.az -= 0.08; else if (k === 'ArrowRight') cam.az += 0.08; else if (k === 'ArrowUp') cam.el += 0.05; else if (k === 'ArrowDown') cam.el -= 0.05; else if (k === '+' || k === '=') cam.dist *= 0.9; else if (k === '-') cam.dist /= 0.9; else used = false;
      if (used) { e.preventDefault(); applyCam(); }
    });
  }

  function resize() {
    const w = Math.max(1, stageEl.clientWidth), h = Math.max(1, stageEl.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); requestRender();
  }

  /* ---------- UI ---------- */
  function setRoughness(v) { state.rough = v; mats.blazer.roughness = mats.top.roughness = mats.trousers.roughness = v; $('o-rough').textContent = v.toFixed(2); requestRender(); }
  function setWire(on) { state.wire = on; for (const id in mats) mats[id].wireframe = on; requestRender(); }
  function setFloor(on) { state.floor = on; floorGroup.visible = on; requestRender(); }
  function setLightPreset(name) {
    state.light = name;
    document.querySelectorAll('[data-light]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.light === name)));
    applyPreset(name);
  }
  function syncUI() {
    for (const k in state.colors) $('c-' + k).value = state.colors[k];
    $('s-dir').value = state.dir; $('o-dir').textContent = state.dir + '°';
    $('s-int').value = state.intensity; $('o-int').textContent = state.intensity.toFixed(2);
    $('s-exp').value = state.exposure; $('o-exp').textContent = state.exposure.toFixed(2);
    $('s-rough').value = state.rough; $('o-rough').textContent = state.rough.toFixed(2);
    $('t-wire').checked = state.wire; $('t-floor').checked = state.floor;
  }
  function bindUI() {
    document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    $('zin').addEventListener('click', () => { cam.dist *= 0.8; applyCam(); });
    $('zout').addEventListener('click', () => { cam.dist /= 0.8; applyCam(); });
    $('fit').addEventListener('click', fitCharacter);
    $('resetView').addEventListener('click', resetView);
    for (const k of ['blazer', 'top', 'trousers', 'shoe']) $('c-' + k).addEventListener('input', e => { state.colors[k] = e.target.value; updateDerivedColors(); requestRender(); });
    document.querySelectorAll('[data-light]').forEach(b => b.addEventListener('click', () => setLightPreset(b.dataset.light)));
    $('s-dir').addEventListener('input', e => { state.dir = +e.target.value; $('o-dir').textContent = state.dir + '°'; applyKeyDirection(); });
    $('s-int').addEventListener('input', e => { state.intensity = +e.target.value; $('o-int').textContent = state.intensity.toFixed(2); applyIntensity(); });
    $('s-exp').addEventListener('input', e => { state.exposure = +e.target.value; $('o-exp').textContent = state.exposure.toFixed(2); applyIntensity(); });
    $('s-rough').addEventListener('input', e => setRoughness(+e.target.value));
    $('t-wire').addEventListener('change', e => setWire(e.target.checked));
    $('t-floor').addEventListener('change', e => setFloor(e.target.checked));
    $('resetAll').addEventListener('click', () => {
      Object.assign(state, JSON.parse(JSON.stringify(DEFAULTS)));
      syncUI(); updateDerivedColors(); setRoughness(state.rough); setWire(false); setFloor(true);
      applyKeyDirection(); setLightPreset(state.light); resetView();
    });
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stageEl);
  }

  /* ---------- boot ---------- */
  function loop() { if (dirty) { dirty = false; renderer.render(scene, camera); } requestAnimationFrame(loop); }
  function boot() {
    try {
      buildStage(); makeMaterials(); syncUI(); bindUI(); applyKeyDirection(); applyPreset(state.light);
      buildCharacter(); renderer.shadowMap.needsUpdate = true; resize(); resetView(); setWire(false);
      $('loading').hidden = true; loop();
    } catch (err) {
      console.error(err); $('loading').textContent = 'The 3D viewer could not start: ' + (err && err.message ? err.message : err);
    }
  }
  if (typeof THREE === 'undefined') { $('loading').textContent = 'Three.js did not load. Check your connection and reload.'; }
  else setTimeout(boot, 30);
  window.__viewer = { setView, state, cam, mats, requestRender };
})();
