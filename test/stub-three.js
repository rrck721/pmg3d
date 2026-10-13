// Stub THREE: permissive recursive proxy. Only catches errors in OUR code (typos, bad wiring), not three.js behaviour.
(function () {
  function U() {
    const store = {};
    const t = function () {};
    return new Proxy(t, {
      get(_, k) { if (k === Symbol.toPrimitive) return () => 0; if (k === 'then') return undefined; if (k === 'domElement') return store.__dom || (store.__dom = document.createElement('canvas')); if (k in store) return store[k]; return (store[k] = U()); },
      set(_, k, v) { store[k] = v; return true; },
      apply() { return U(); }, construct() { return U(); }
    });
  }
  const consts = { sRGBEncoding: 1, LinearToneMapping: 1, PCFSoftShadowMap: 1, BackSide: 1, DoubleSide: 1, RepeatWrapping: 1 };
  window.THREE = new Proxy({}, { get(_, name) { if (name in consts) return consts[name]; return function () { return U(); }; } });
})();
