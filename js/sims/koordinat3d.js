// Sim 1.1: titik dalam koordinat kartesis/silinder/bola, vektor satuan, elemen volume melengkung.
import { makeScene, axes, clearGroup, textSprite } from '../three-util.js';
import { controls, readout } from '../ui.js';

const D2R = Math.PI / 180;
const SYS = {
  kartesis: {
    names: ['x', 'y', 'z'],
    ranges: [[-2.5, 2.5, 1.5], [-2.5, 2.5, 1.2], [-2, 2, 1]],
    du: [0.5, 0.5, 0.5],
    map: (x, y, z) => [x, y, z],
    h: () => [1, 1, 1],
    units: (u) => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    dl: ['dx', 'dy', 'dz'],
    hat: ['x̂', 'ŷ', 'ẑ'],
  },
  silinder: {
    names: ['r', 'φ (°)', 'z'],
    ranges: [[0.2, 3, 1.8], [0, 360, 40], [-2, 2, 0.6]],
    du: [0.5, 25, 0.5],
    map: (r, f, z) => [r * Math.cos(f * D2R), r * Math.sin(f * D2R), z],
    h: (u) => [1, u[0], 1],
    units: (u) => { const f = u[1] * D2R; return [[Math.cos(f), Math.sin(f), 0], [-Math.sin(f), Math.cos(f), 0], [0, 0, 1]]; },
    dl: ['dr', 'r dφ', 'dz'],
    hat: ['r̂', 'φ̂', 'ẑ'],
  },
  bola: {
    names: ['r', 'θ (°)', 'φ (°)'],
    ranges: [[0.3, 3, 2], [1, 179, 55], [0, 360, 35]],
    du: [0.45, 15, 20],
    map: (r, t, f) => [r * Math.sin(t * D2R) * Math.cos(f * D2R), r * Math.sin(t * D2R) * Math.sin(f * D2R), r * Math.cos(t * D2R)],
    h: (u) => [1, u[0], u[0] * Math.sin(u[1] * D2R)],
    units: (u) => {
      const t = u[1] * D2R, f = u[2] * D2R;
      return [
        [Math.sin(t) * Math.cos(f), Math.sin(t) * Math.sin(f), Math.cos(t)],
        [Math.cos(t) * Math.cos(f), Math.cos(t) * Math.sin(f), -Math.sin(t)],
        [-Math.sin(f), Math.cos(f), 0],
      ];
    },
    dl: ['dr', 'r dθ', 'r sinθ dφ'],
    hat: ['r̂', 'θ̂', 'φ̂'],
  },
};
const UCOL = [0xff6b5e, 0x6fdc8c, 0x4ea8ff];

export default function mount(simEl) {
  const { THREE, scene, controls: orbit } = makeScene(simEl, { camPos: [3.2, -3.9, 2.9] });
  orbit.target.set(0.5, 0.4, 0.5);
  axes(THREE, scene, 2.8);
  const grid = new THREE.GridHelper(6, 12, 0x2a3a4d, 0x1c2a3a);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);
  const dyn = new THREE.Group();
  scene.add(dyn);
  const out = readout(simEl);
  const ctlEl = simEl.querySelector('.controls');

  let sys = 'bola', st;

  // permukaan parametrik f(s,t) → Vector3, s,t ∈ [0,1]
  const paramSurface = (f, ns, nt) => {
    const pos = [], idx = [];
    for (let i = 0; i <= ns; i++) for (let j = 0; j <= nt; j++) pos.push(...f(i / ns, j / nt));
    for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
      const a = i * (nt + 1) + j, b = a + nt + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  function build() {
    clearGroup(dyn);
    const S = SYS[sys];
    const u = [st.u1, st.u2, st.u3];
    const k = st.size;
    const du = S.du.map((d) => d * k);
    const P = S.map(...u);

    // titik
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffc857 }));
    dot.position.set(...P);
    dyn.add(dot);
    // garis bantu dari asal / proyeksi
    const lm = new THREE.LineDashedMaterial({ color: 0x7f93a8, dashSize: 0.08, gapSize: 0.06 });
    const helper = (pts) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p))), lm); l.computeLineDistances(); dyn.add(l); };
    helper([[0, 0, 0], [P[0], P[1], 0], P]);
    if (sys !== 'kartesis') helper([[0, 0, 0], P]);

    // elemen volume melengkung: u_i ∈ [u_i, u_i + du_i]
    const corner = (a, b, c) => S.map(u[0] + a * du[0], u[1] + b * du[1], u[2] + c * du[2]);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3fd0c9, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    const faces = [
      (s, t) => corner(0, s, t), (s, t) => corner(1, s, t),
      (s, t) => corner(s, 0, t), (s, t) => corner(s, 1, t),
      (s, t) => corner(s, t, 0), (s, t) => corner(s, t, 1),
    ];
    for (const f of faces) dyn.add(new THREE.Mesh(paramSurface(f, 10, 10), mat));
    // 12 rusuk
    const em = new THREE.LineBasicMaterial({ color: 0x3fd0c9 });
    const edge = (fn) => { const pts = []; for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(...fn(i / 20))); dyn.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), em)); };
    for (const a of [0, 1]) for (const b of [0, 1]) {
      edge((s) => corner(s, a, b)); edge((s) => corner(a, s, b)); edge((s) => corner(a, b, s));
    }
    // label sisi
    const lab = (txt, p, col) => { const sp = textSprite(THREE, txt, col, 0.26); sp.position.set(...p); dyn.add(sp); };
    S.dl.forEach((name, i) => {
      const t = [0, 0, 0]; t[i] = 0.5;
      const m = corner(...t.map((v, j) => (j === i ? 0.5 : -0.25)));
      lab(name, m, UCOL[i]);
    });

    // vektor satuan di titik
    S.units(u).forEach((e, i) => {
      dyn.add(new THREE.ArrowHelper(new THREE.Vector3(...e), new THREE.Vector3(...P), 0.8, UCOL[i], 0.14, 0.07));
      lab(S.hat[i], [P[0] + e[0] * 1.0, P[1] + e[1] * 1.0, P[2] + e[2] * 1.0], UCOL[i]);
    });

    // permukaan koordinat konstan
    if (st.surf) {
      const sm = (c) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
      const R = S.ranges;
      const span = (i, s) => R[i][0] + (R[i][1] - R[i][0]) * s;
      for (let i = 0; i < 3; i++) {
        const [a, b] = [0, 1, 2].filter((j) => j !== i);
        const f = (s, t) => { const v = [...u]; v[a] = span(a, s); v[b] = span(b, t); return S.map(...v); };
        dyn.add(new THREE.Mesh(paramSurface(f, 40, 40), sm(UCOL[i])));
      }
    }

    // pembacaan
    const h = S.h(u);
    const duRad = du.map((d, i) => (S.names[i].includes('°') ? d * D2R : d));
    const dls = h.map((hi, i) => hi * duRad[i]);
    const dV = dls[0] * dls[1] * dls[2];
    const r3 = Math.hypot(...P), rho = Math.hypot(P[0], P[1]);
    out(`<span><b>titik</b> (x,y,z)=(${P.map((v) => v.toFixed(2)).join(', ')})</span>
      <span><b>silinder</b> (r,φ,z)=(${rho.toFixed(2)}, ${(((Math.atan2(P[1], P[0]) / D2R) + 360) % 360).toFixed(0)}°, ${P[2].toFixed(2)})</span>
      <span><b>bola</b> (r,θ,φ)=(${r3.toFixed(2)}, ${(Math.acos(P[2] / (r3 || 1)) / D2R).toFixed(0)}°, ${(((Math.atan2(P[1], P[0]) / D2R) + 360) % 360).toFixed(0)}°)</span>
      <span><b>h₁,h₂,h₃</b> = ${h.map((v) => v.toFixed(2)).join(', ')}</span>
      <span><b>${S.dl.join(' · ')}</b> = ${dls.map((v) => v.toFixed(3)).join(' × ')} = <span class="good">dV ${dV.toFixed(4)}</span></span>`);
  }

  function makeControls() {
    ctlEl.innerHTML = '';
    const S = SYS[sys];
    st = controls(ctlEl, [
      { id: 'sys', label: 'Sistem koordinat', type: 'select', value: sys, options: [['kartesis', 'Kartesis (x,y,z)'], ['silinder', 'Silinder (r,φ,z)'], ['bola', 'Bola (r,θ,φ)']] },
      ...S.names.map((n, i) => ({ id: 'u' + (i + 1), label: n, type: 'range', min: S.ranges[i][0], max: S.ranges[i][1], value: S.ranges[i][2], step: n.includes('°') ? 1 : 0.05 })),
      { id: 'size', label: 'Ukuran elemen (du)', type: 'range', min: 0.3, max: 2, value: 1, step: 0.05 },
      { id: 'surf', label: 'Tampilkan permukaan u = konstan', type: 'check', value: false },
      { type: 'note', label: 'Kotak toska = elemen volume. Sisinya = h<sub>i</sub> du<sub>i</sub>.' },
    ], (id) => {
      if (id === 'sys') { sys = st.sys; makeControls(); }
      build();
    });
  }
  makeControls();
  build();
}
