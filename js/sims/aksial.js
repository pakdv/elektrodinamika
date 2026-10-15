// Sim 5.3: B_z pada sumbu untuk Helmholtz (jarak bervariasi) dan solenoida (L/R bervariasi).
import { p5Sim, controls, readout, C, fmtSI } from '../ui.js';
import { loopAxisB, helmholtzB, solenoidAxisB, MU0 } from '../physics.js';

export default function mount(simEl) {
  const out = readout(simEl);
  let inst;
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'mode', label: 'Kumparan', type: 'select', value: 'helmholtz', options: [['helmholtz', 'Helmholtz (dua loop)'], ['solenoida', 'Solenoida']] },
    { id: 'd', label: 'Helmholtz: jarak 2b / R', type: 'range', min: 0.2, max: 2.5, step: 0.01, value: 1 },
    { id: 'LR', label: 'Solenoida: L / R', type: 'range', min: 0.5, max: 25, step: 0.5, value: 6 },
    { id: 'N', label: 'Lilitan N (per kumparan)', type: 'range', min: 10, max: 400, step: 10, value: 130 },
    { id: 'I', label: 'Arus I', type: 'range', min: 0.1, max: 3, step: 0.1, value: 1, fmt: (v) => v + ' A' },
    { type: 'note', label: 'R = 15 cm (ukuran khas alat e/m).' },
  ], () => inst.redraw());

  inst = p5Sim(simEl, (p) => {
    p.static = true;
    p.setup = () => p.noLoop();
    p.draw = () => {
      const R = 0.15, I = st.I, N = st.N;
      p.background(C.bg);
      const ox = 56, oy = 20, pw = p.width - ox - 20, ph = p.height - oy - 46;
      let zmin, zmax, f, parts = [], ideal = null, label;
      if (st.mode === 'helmholtz') {
        const d = st.d * R;
        zmin = -2.5 * R; zmax = 2.5 * R;
        f = (z) => helmholtzB(I, R, d, z, N);
        parts = [(z) => loopAxisB(I, R, z - d / 2, N), (z) => loopAxisB(I, R, z + d / 2, N)];
        label = 'z / R';
      } else {
        const L = st.LR * R;
        zmin = -0.4 * L - R; zmax = 1.4 * L + R;
        f = (z) => solenoidAxisB(I, R, L, N, z);
        ideal = (MU0 * N * I) / L;
        label = 'z₀ / L';
      }
      let bmax = 0;
      for (let k = 0; k <= 300; k++) bmax = Math.max(bmax, f(zmin + ((zmax - zmin) * k) / 300));
      if (ideal) bmax = Math.max(bmax, ideal);
      bmax *= 1.12;
      const sx = (z) => ox + ((z - zmin) / (zmax - zmin)) * pw, sy = (b) => oy + ph - (b / bmax) * ph;
      // grid
      p.stroke(C.grid); p.strokeWeight(1);
      for (let k = 0; k <= 4; k++) p.line(ox, oy + (ph * k) / 4, ox + pw, oy + (ph * k) / 4);
      p.noStroke(); p.fill(C.dim); p.textSize(11); p.textAlign(p.RIGHT, p.CENTER);
      for (let k = 0; k <= 4; k++) p.text(((bmax * (4 - k)) / 4 * 1e3).toFixed(2), ox - 6, oy + (ph * k) / 4);
      p.push(); p.translate(14, oy + ph / 2); p.rotate(-Math.PI / 2); p.textAlign(p.CENTER, p.CENTER); p.text('B_z (mT)', 0, 0); p.pop();
      p.textAlign(p.CENTER, p.TOP);
      if (st.mode === 'helmholtz') for (let z = -2; z <= 2; z++) p.text(z, sx(z * R), oy + ph + 4);
      else { const L = st.LR * R; for (const t of [0, 0.5, 1]) p.text(t, sx(t * L), oy + ph + 4); }
      p.text(label, ox + pw / 2, oy + ph + 20);
      // posisi kumparan
      p.stroke(C.amber); p.strokeWeight(3);
      if (st.mode === 'helmholtz') for (const z of [-st.d * R / 2, st.d * R / 2]) p.line(sx(z), oy + ph - 4, sx(z), oy + ph + 4);
      else { const L = st.LR * R; p.line(sx(0), oy + ph, sx(L), oy + ph); }
      // kurva
      p.noFill();
      for (const g of parts) { p.stroke(C.dim); p.strokeWeight(1); p.drawingContext.setLineDash([4, 4]); p.beginShape(); for (let k = 0; k <= 300; k++) { const z = zmin + ((zmax - zmin) * k) / 300; p.vertex(sx(z), sy(g(z))); } p.endShape(); p.drawingContext.setLineDash([]); }
      if (ideal) { p.stroke(C.violet); p.strokeWeight(1.5); p.drawingContext.setLineDash([6, 4]); p.line(sx(0), sy(ideal), sx(st.LR * R), sy(ideal)); p.drawingContext.setLineDash([]); }
      p.stroke(C.teal); p.strokeWeight(2.5); p.beginShape();
      for (let k = 0; k <= 400; k++) { const z = zmin + ((zmax - zmin) * k) / 400; p.vertex(sx(z), sy(f(z))); }
      p.endShape();

      if (st.mode === 'helmholtz') {
        const b0 = f(0), bq = f(R / 4);
        const h = 1e-4, d2 = (f(h) - 2 * b0 + f(-h)) / (h * h);
        const formula = Math.pow(0.8, 1.5) * MU0 * N * I / R;
        out(`<span><b>B(0)</b> ${fmtSI(b0, 'T')}</span>
          <span><b>(4/5)^{3/2} μ0NI/R</b> ${fmtSI(formula, 'T')} ${Math.abs(st.d - 1) < 0.005 ? '<span class="good">= B(0)</span>' : ''}</span>
          <span><b>variasi |z| ≤ R/4</b> ${(((bq - b0) / b0) * 100).toFixed(3)}%</span>
          <span><b>d²B/dz² (0)</b> <span class="${Math.abs(d2 * R * R / b0) < 0.01 ? 'good' : 'warn'}">${(d2 * R * R / b0).toFixed(3)} B₀/R²</span></span>`);
      } else {
        const L = st.LR * R, bc = f(L / 2), be = f(0);
        out(`<span><b>B tengah</b> ${fmtSI(bc, 'T')}</span><span><b>μ0 n I ideal</b> ${fmtSI(ideal, 'T')} (${((bc / ideal) * 100).toFixed(1)}%)</span>
          <span><b>B ujung / B tengah</b> ${(be / bc).toFixed(3)} <span style="color:var(--muted)">(→ 0,5 untuk L ≫ R)</span></span>`);
      }
    };
  }, { aspect: 0.5, minH: 300 });
}
