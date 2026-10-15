// Sim 5.2: garis medan B 3D dari Biot-Savart numerik (penjumlahan ruas lurus).
import { makeScene, axes, clearGroup } from '../three-util.js';
import { controls, readout, fmtSI } from '../ui.js';
import { pathB, loopPath, solenoidPath, norm, MU0 } from '../physics.js';

const CONFIGS = {
  kawat: 'Kawat lurus panjang',
  loop: 'Loop melingkar',
  helmholtz: 'Kumparan Helmholtz',
  solenoida: 'Solenoida',
  tugas: 'Dua loop sebidang (tugas)',
};

function geometry(cfg, st) {
  const R = 1;
  switch (cfg) {
    case 'kawat': return { paths: [[[0, 0, -6], [0, 0, 6]]], bound: 3.4 };
    case 'loop': return { paths: [loopPath(R, 0, 72)], bound: 3.4 };
    case 'helmholtz': { const d = st.sep * R; return { paths: [loopPath(R, -d / 2, 60), loopPath(R, d / 2, 60)], bound: 3.6 }; }
    case 'solenoida': { const L = 3; return { paths: [solenoidPath(0.7, L, st.turns, 24)], bound: 4 }; }
    case 'tugas': return { paths: [loopPath(0.8, 0, 60, -1.2, 0), loopPath(0.55, 0, 60, 1.4, 0)], bound: 3.6 };
  }
}

function seeds(cfg, st) {
  const s = [];
  if (cfg === 'kawat') for (const z of [-1.5, 0, 1.5]) for (const r of [0.4, 0.9, 1.6, 2.4]) s.push([r, 0, z]);
  if (cfg === 'loop' || cfg === 'helmholtz') for (const f of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) for (const r of [0.15, 0.45, 0.75]) s.push([r * Math.cos(f), r * Math.sin(f), 0]);
  if (cfg === 'solenoida') for (const f of [0, Math.PI]) for (const r of [0.1, 0.3, 0.5]) s.push([r * Math.cos(f), r * Math.sin(f), 0]);
  if (cfg === 'tugas') {
    for (const r of [0.15, 0.4, 0.62]) for (const f of [0, Math.PI]) s.push([-1.2 + r * Math.cos(f), 0, 0]);
    for (const r of [0.15, 0.38]) for (const f of [0, Math.PI]) s.push([1.4 + r * Math.cos(f), 0, 0]);
  }
  return s;
}

export default function mount(simEl) {
  const { THREE, scene, onFrame } = makeScene(simEl, { camPos: [5.5, -6.5, 3.5] });
  axes(THREE, scene, 2.2);
  const wires = new THREE.Group(), lines = new THREE.Group(), arrows = new THREE.Group(), carriers = new THREE.Group();
  scene.add(wires, lines, arrows, carriers);
  const out = readout(simEl);

  let G, queue = [], job = 0;
  const Bf = (p) => G.paths.reduce((acc, path, k) => {
    const b = pathB(path, G.currents[k], p);
    return [acc[0] + b[0], acc[1] + b[1], acc[2] + b[2]];
  }, [0, 0, 0]);

  const st = controls(simEl.querySelector('.controls'), [
    { id: 'cfg', label: 'Konfigurasi arus', type: 'select', value: 'loop', options: Object.entries(CONFIGS) },
    { id: 'I', label: 'Arus I (A)', type: 'range', min: -5, max: 5, step: 0.5, value: 2, fmt: (v) => v + ' A' },
    { id: 'sep', label: 'Helmholtz: jarak 2b / R', type: 'range', min: 0.4, max: 2.5, step: 0.05, value: 1 },
    { id: 'turns', label: 'Solenoida: jumlah lilitan', type: 'range', min: 3, max: 30, step: 1, value: 12 },
    { id: 'lines', label: 'Garis medan', type: 'check', value: true },
    { id: 'arrows', label: 'Panah B di bidang xz', type: 'check', value: false },
    { type: 'note', label: 'Satuan panjang: meter (R loop = 1 m). Warna garis: biru = lemah, kuning = kuat.' },
  ], (id) => {
    if (id === 'I' || id === 'lines' || id === 'arrows') { if (id === 'I') G.currents = G.currents.map(() => st.I); refresh(id !== 'I'); }
    else rebuild();
  });

  function rebuild() {
    G = geometry(st.cfg, st);
    G.currents = G.paths.map(() => st.I);
    clearGroup(wires); clearGroup(carriers);
    const wm = new THREE.MeshStandardMaterial({ color: 0xb88a52, metalness: 0.6, roughness: 0.35 });
    G.curves = G.paths.map((path) => {
      const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
      wires.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(1200, path.length * 4), 0.035, 8, false), wm));
      return curve;
    });
    // partikel pembawa arus (arah konvensional)
    const cm = new THREE.MeshBasicMaterial({ color: 0xffc857 });
    G.curves.forEach((c, k) => {
      const n = st.cfg === 'solenoida' ? st.turns * 3 : 18;
      for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), cm); m.userData = { k, t0: i / n }; carriers.add(m); }
    });
    refresh(true);
  }

  function refresh(retrace) {
    // pembacaan
    const c = st.cfg, I = st.I;
    const p0 = c === 'kawat' ? [1, 0, 0] : c === 'tugas' ? [1.4, 0, 0] : [0, 0, 0];
    const B0 = Bf(p0);
    const ana = {
      kawat: ['μ0I/2πa (a=1)', (MU0 * I) / (2 * Math.PI)],
      loop: ['μ0I/2R', (MU0 * I) / 2],
      helmholtz: ['2·μ0IR²/2(R²+b²)^{3/2}', (MU0 * I) / (1 + (st.sep / 2) ** 2) ** 1.5],
      solenoida: ['μ0 n I (ideal)', (MU0 * st.turns * I) / 3],
      tugas: ['dipol: −μ0I a²/4r³', (-MU0 * I * 0.64) / (4 * 2.6 ** 3)],
    }[c];
    out(`<span><b>titik uji</b> (${p0.join(', ')}) m</span>
      <span><b>|B| numerik</b> ${fmtSI(norm(B0), 'T')}</span>
      <span><b>${ana[0]}</b> ${fmtSI(Math.abs(ana[1]), 'T')}</span>
      ${c === 'tugas' ? `<span><b>B<sub>z</sub> di pusat loop-2</b> ${fmtSI(B0[2], 'T')} <span class="warn">(negatif: berlawanan m₁)</span></span>` : ''}`);
    if (retrace) {
      clearGroup(lines); clearGroup(arrows);
      job++;
      queue = st.lines ? seeds(c, st) : [];
      if (st.arrows) drawArrows();
    }
  }

  function trace(seed) {
    const h = 0.04, maxN = 700, pts = [seed];
    let p = seed;
    const f = (q) => { const b = Bf(q); const m = norm(b) || 1; return [b[0] / m, b[1] / m, b[2] / m]; };
    for (let i = 0; i < maxN; i++) {
      const k1 = f(p);
      const k2 = f([p[0] + (h / 2) * k1[0], p[1] + (h / 2) * k1[1], p[2] + (h / 2) * k1[2]]);
      const k3 = f([p[0] + (h / 2) * k2[0], p[1] + (h / 2) * k2[1], p[2] + (h / 2) * k2[2]]);
      const k4 = f([p[0] + h * k3[0], p[1] + h * k3[1], p[2] + h * k3[2]]);
      p = [0, 1, 2].map((j) => p[j] + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
      pts.push(p);
      if (Math.abs(p[0]) > G.bound || Math.abs(p[1]) > G.bound || Math.abs(p[2]) > G.bound) break;
      if (i > 20 && norm([p[0] - seed[0], p[1] - seed[1], p[2] - seed[2]]) < h * 0.9) { pts.push(seed); break; }
    }
    return pts;
  }

  function addLine(pts) {
    const pos = [], col = [];
    const mags = pts.map((p) => norm(Bf(p)));
    const ref = mags.reduce((a, b) => a + b, 0) / mags.length || 1;
    const c1 = new THREE.Color(0x4ea8ff), c2 = new THREE.Color(0xffc857), tmp = new THREE.Color();
    pts.forEach((p, i) => {
      pos.push(...p);
      tmp.copy(c1).lerp(c2, Math.min(1, Math.max(0, 0.5 + 0.5 * Math.log(mags[i] / ref))));
      col.push(tmp.r, tmp.g, tmp.b);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    lines.add(new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true })));
  }

  function drawArrows() {
    const n = 13, ext = G.bound * 0.85, all = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const p = [-ext + (2 * ext * i) / (n - 1), 0, -ext + (2 * ext * j) / (n - 1)];
      const b = Bf(p), m = norm(b);
      if (m > 0) all.push([p, b, m]);
    }
    const ref = Math.max(...all.map((a) => a[2])) || 1;
    for (const [p, b, m] of all) {
      const len = 0.12 + 0.35 * Math.log10(1 + 9 * m / ref);
      arrows.add(new THREE.ArrowHelper(new THREE.Vector3(b[0] / m, b[1] / m, b[2] / m), new THREE.Vector3(...p), len, 0x3fd0c9, 0.08, 0.05));
    }
  }

  onFrame((t) => {
    // telusuri satu garis per frame agar tidak memblokir
    if (queue.length) {
      const myJob = job, s = queue.shift();
      const pts = trace(s);
      if (myJob === job && pts.length > 2) addLine(pts);
    }
    const speed = 0.00006 * st.I;
    for (const m of carriers.children) {
      const c = G.curves[m.userData.k];
      const u = (((m.userData.t0 + t * speed) % 1) + 1) % 1;
      m.position.copy(c.getPointAt(u));
    }
  });
  rebuild();
}
