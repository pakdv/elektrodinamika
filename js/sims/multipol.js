// Sim 4.2: potensial eksak vs pendekatan multipol untuk muatan pada sumbu z (k = 1, a = 1).
import { p5Sim, controls, readout, C } from '../ui.js';
import { multipoleTerms, axisChargesV, moments, legendre } from '../physics.js';

const PRESETS = {
  dipol: [{ q: 1, z: 1 }, { q: -1, z: -1 }],
  kuadrupol: [{ q: 1, z: 1 }, { q: -2, z: 0 }, { q: 1, z: -1 }],
  asimetris: [{ q: 2, z: 1 }, { q: -1, z: -0.5 }],
  geser: [{ q: 1, z: 0.8 }],
};
const NAMES = ['monopol', 'dipol', 'kuadrupol', 'oktupol', 'n = 4', 'n = 5', 'n = 6'];

export default function mount(simEl) {
  const out = readout(simEl);
  let inst;
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'preset', label: 'Distribusi muatan (sumbu z)', type: 'select', value: 'dipol', options: [['dipol', 'Dipol: +q (a), −q (−a)'], ['kuadrupol', 'Kuadrupol linear: +q, −2q, +q'], ['asimetris', '+2q (a), −q (−a/2)'], ['geser', 'Satu muatan di z = 0,8a']] },
    { id: 'L', label: 'Orde pendekatan L', type: 'range', min: 0, max: 6, step: 1, value: 1, fmt: (v) => `${v} (${NAMES[v]})` },
    { id: 'theta', label: 'Arah θ untuk grafik V(r)', type: 'range', min: 0, max: 180, step: 1, value: 30, fmt: (v) => v + '°' },
    { id: 'r0', label: 'Jarak r untuk pola sudut', type: 'range', min: 1.3, max: 6, step: 0.05, value: 2.5, fmt: (v) => v + ' a' },
  ], () => inst.redraw());

  inst = p5Sim(simEl, (p) => {
    p.static = true;
    p.setup = () => p.noLoop();
    p.draw = () => {
      const cs = PRESETS[st.preset], th = (st.theta * Math.PI) / 180;
      const approx = (r, t) => multipoleTerms(cs, r, t, st.L).reduce((s, v) => s + v, 0);
      p.background(C.bg);
      const narrow = p.width < 620;
      const lw = narrow ? p.width : p.width * 0.42, lh = narrow ? p.height * 0.5 : p.height;

      // --- panel kiri: pola sudut V(r0, θ) polar
      const cx = lw / 2, cy = lh / 2, Rp = Math.min(lw, lh) * 0.38;
      const samples = [], sampA = [];
      let vm = 1e-9;
      for (let k = 0; k <= 180; k++) {
        const t = (Math.PI * k) / 180, v = axisChargesV(cs, st.r0, t), va = approx(st.r0, t);
        samples.push(v); sampA.push(va); vm = Math.max(vm, Math.abs(v), Math.abs(va));
      }
      p.stroke(C.grid); p.noFill(); p.circle(cx, cy, 2 * Rp); p.circle(cx, cy, Rp);
      p.line(cx, cy - Rp - 10, cx, cy + Rp + 10);
      const polar = (arr, col, dash) => {
        p.stroke(col); p.strokeWeight(2); if (dash) p.drawingContext.setLineDash([5, 4]);
        for (const side of [1, -1]) {
          p.beginShape();
          arr.forEach((v, k) => { const t = (Math.PI * k) / 180, rr = (Math.abs(v) / vm) * Rp; p.vertex(cx + side * rr * Math.sin(t), cy - rr * Math.cos(t)); });
          p.endShape();
        }
        p.drawingContext.setLineDash([]);
      };
      polar(samples, C.amber); polar(sampA, C.teal, true);
      // muatan pada sumbu (skala kecil)
      for (const c of cs) { p.noStroke(); p.fill(c.q > 0 ? C.pos : C.neg); p.circle(cx, cy - c.z * Rp * 0.22, 6 + 3 * Math.abs(c.q)); }
      p.stroke(C.green); p.strokeWeight(1.5); p.line(cx, cy, cx + Rp * Math.sin(th), cy - Rp * Math.cos(th));
      p.noStroke(); p.fill(C.dim); p.textSize(11); p.textAlign(p.LEFT, p.TOP);
      p.text(`|V(r = ${st.r0}a, θ)|  pola sudut`, 8, 8); p.text('z ↑', cx + 4, cy - Rp - 12);

      // --- panel kanan: V(r) sepanjang θ
      const ox = narrow ? 44 : lw + 44, oy = narrow ? lh + 14 : 20, pw = (narrow ? p.width : p.width - lw) - 60, ph = (narrow ? p.height - lh : p.height) - 50;
      const r1 = 1.6, r2 = 8;
      const ex = [], ap = [];
      let lo = Infinity, hi = -Infinity;
      for (let k = 0; k <= 200; k++) {
        const r = r1 + ((r2 - r1) * k) / 200, v = axisChargesV(cs, r, th), va = approx(r, th);
        ex.push([r, v]); ap.push([r, va]);
        lo = Math.min(lo, v, va); hi = Math.max(hi, v, va);
      }
      if (hi - lo < 1e-6) { hi += 0.1; lo -= 0.1; }
      const padv = (hi - lo) * 0.15; lo -= padv; hi += padv;
      const sx = (r) => ox + ((r - r1) / (r2 - r1)) * pw, sy = (v) => oy + ph - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * ph;
      p.stroke(C.grid); p.strokeWeight(1);
      if (lo < 0 && hi > 0) p.line(ox, sy(0), ox + pw, sy(0));
      p.line(ox, oy, ox, oy + ph); p.line(ox, oy + ph, ox + pw, oy + ph);
      p.noStroke(); p.fill(C.dim); p.textAlign(p.CENTER, p.TOP);
      for (let r = 2; r <= 8; r += 2) p.text(r, sx(r), oy + ph + 4);
      p.text('r / a', ox + pw / 2, oy + ph + 18);
      p.textAlign(p.LEFT, p.TOP); p.text(`V(r) pada θ = ${st.theta}°`, ox + 6, oy);
      const curve = (arr, col, dash) => { p.noFill(); p.stroke(col); p.strokeWeight(2); if (dash) p.drawingContext.setLineDash([6, 4]); p.beginShape(); for (const [r, v] of arr) p.vertex(sx(r), sy(v)); p.endShape(); p.drawingContext.setLineDash([]); };
      curve(ex, C.amber); curve(ap, C.teal, true);
      p.stroke(C.green); p.drawingContext.setLineDash([2, 4]); p.line(sx(st.r0), oy, sx(st.r0), oy + ph); p.drawingContext.setLineDash([]);

      const m = moments(cs), terms = multipoleTerms(cs, st.r0, th, 4), vex = axisChargesV(cs, st.r0, th), va = approx(st.r0, th);
      out(`<span><b>Q</b> ${m.Q}</span><span><b>p<sub>z</sub></b> ${m.p}</span><span><b>Σqz²</b> ${m.Qzz}</span>
        <span><b>suku di (r₀, θ)</b> ${terms.map((t, i) => `${NAMES[i]} ${t.toFixed(4)}`).join(' · ')}</span>
        <span><b>eksak</b> ${vex.toFixed(4)} · <b>orde ${st.L}</b> ${va.toFixed(4)} · <span class="${Math.abs(va - vex) < 0.02 * Math.abs(vex) + 1e-4 ? 'good' : 'warn'}">galat ${(Math.abs(va - vex) / (Math.abs(vex) || 1) * 100).toFixed(1)}%</span></span>
        <span><b>P<sub>${st.L}</sub>(cos θ)</b> ${legendre(st.L, Math.cos(th)).toFixed(4)}</span>
        <span style="color:var(--muted)">kuning = eksak · toska putus = pendekatan</span>`);
    };
  }, { aspect: 0.5, minH: 320 });
}
