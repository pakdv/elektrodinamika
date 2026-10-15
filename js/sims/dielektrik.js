// Sim 4.3: syarat batas dua dielektrik (σ_f = 0): E_t kontinu, D_n kontinu, tanθ2/tanθ1 = ε2/ε1.
import { p5Sim, controls, readout, C, arrow } from '../ui.js';
import { refractE } from '../physics.js';

export default function mount(simEl) {
  const out = readout(simEl);
  let inst;
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'e1', label: 'ε<sub>r1</sub> (atas)', type: 'range', min: 1, max: 10, step: 0.1, value: 1 },
    { id: 'e2', label: 'ε<sub>r2</sub> (bawah)', type: 'range', min: 1, max: 10, step: 0.1, value: 4 },
    { id: 't1', label: 'Sudut E₁ terhadap normal θ₁', type: 'range', min: 0, max: 80, step: 1, value: 40, fmt: (v) => v + '°' },
    { id: 'showD', label: 'Tampilkan vektor D', type: 'check', value: true },
    { id: 'sig', label: 'Muatan terikat σ<sub>b</sub> di batas', type: 'check', value: true },
  ], () => inst.redraw());

  inst = p5Sim(simEl, (p) => {
    p.static = true;
    p.setup = () => p.noLoop();
    p.draw = () => {
      const t1 = (st.t1 * Math.PI) / 180, t2 = refractE(t1, st.e1, st.e2);
      const E1 = 1, E1t = E1 * Math.sin(t1), E1n = E1 * Math.cos(t1);
      const E2t = E1t, E2n = (st.e1 / st.e2) * E1n, E2 = Math.hypot(E2t, E2n);
      const D1n = st.e1 * E1n, D2n = st.e2 * E2n, D1t = st.e1 * E1t, D2t = st.e2 * E2t;
      const y0 = p.height / 2;
      p.background(C.bg);
      // medium
      p.noStroke();
      p.fill(63, 208, 201, 10 + 9 * st.e1); p.rect(0, 0, p.width, y0);
      p.fill(63, 208, 201, 10 + 9 * st.e2); p.rect(0, y0, p.width, y0);
      p.stroke(C.fg); p.strokeWeight(1.5); p.line(0, y0, p.width, y0);
      p.noStroke(); p.fill(C.dim); p.textSize(12); p.textAlign(p.LEFT, p.TOP);
      p.text(`medium 1 · ε_r = ${st.e1}`, 10, 8); p.text(`medium 2 · ε_r = ${st.e2}`, 10, p.height - 22);
      // garis medan: arah ke bawah, sudut θ dari normal
      p.stroke(215, 228, 239, 150); p.strokeWeight(1.2);
      for (let x0 = -p.width; x0 < 2 * p.width; x0 += 46) {
        p.line(x0 - y0 * Math.tan(t1), 0, x0, y0);
        p.line(x0, y0, x0 + y0 * Math.tan(t2), p.height);
      }
      // kotak Gauss tipis: ε0(E2n − E1n) = σ_total = σ_b (σ_f = 0). ε2 > ε1 → E2n < E1n → σ_b < 0
      const sb = E2n - E1n;
      if (st.sig && Math.abs(sb) > 0.01) {
        const n = Math.round(Math.min(40, Math.abs(sb) * 40));
        p.textAlign(p.CENTER, p.CENTER); p.textSize(13); p.fill(sb > 0 ? C.pos : C.neg); p.noStroke();
        for (let k = 0; k < n; k++) p.text(sb > 0 ? '+' : '−', ((k + 0.5) / n) * p.width, y0 - 8);
      }
      // vektor di titik pusat
      const cx = p.width / 2, L = Math.min(110, p.height * 0.32);
      arrow(p, cx - L * E1t, y0 - L * E1n, cx, y0, C.amber, 3, 10);
      arrow(p, cx, y0, cx + L * E2t, y0 + L * E2n, C.amber, 3, 10);
      // komponen
      p.drawingContext.setLineDash([4, 4]);
      p.stroke(C.amber); p.strokeWeight(1);
      p.line(cx - L * E1t, y0 - L * E1n, cx - L * E1t, y0); p.line(cx + L * E2t, y0 + L * E2n, cx + L * E2t, y0);
      p.drawingContext.setLineDash([]);
      if (st.showD) {
        const s = 0.25;
        arrow(p, cx - L * s * D1t, y0 - L * s * D1n, cx, y0, C.violet, 2, 8);
        arrow(p, cx, y0, cx + L * s * D2t, y0 + L * s * D2n, C.violet, 2, 8);
      }
      // normal
      p.stroke(C.dim); p.drawingContext.setLineDash([2, 5]); p.line(cx, y0 - L * 1.2, cx, y0 + L * 1.2); p.drawingContext.setLineDash([]);
      p.noStroke(); p.fill(C.amber); p.textAlign(p.LEFT, p.CENTER);
      p.text('E₁', cx - L * E1t - 26, y0 - L * E1n); p.text('E₂', cx + L * E2t + 8, y0 + L * E2n);
      if (st.showD) { p.fill(C.violet); p.text('D (skala ¼)', cx + 10, y0 - 18); }

      const f = (v) => v.toFixed(3);
      out(`<span><b>θ₂</b> ${((t2 * 180) / Math.PI).toFixed(1)}°</span>
        <span><b>E<sub>t</sub></b> ${f(E1t)} = ${f(E2t)} <span class="good">kontinu</span></span>
        <span><b>D<sub>n</sub>/ε₀</b> ${f(D1n)} = ${f(D2n)} <span class="good">kontinu</span></span>
        <span><b>E<sub>n</sub></b> ${f(E1n)} → ${f(E2n)} <span class="warn">lompat</span></span>
        <span><b>|E|</b> ${f(E1)} → ${f(E2)}</span>
        <span><b>σ<sub>b</sub>/ε₀ = E₂ₙ − E₁ₙ</b> ${f(sb)}</span>
        <span><b>tanθ₂/tanθ₁</b> ${st.t1 > 0 ? f(Math.tan(t2) / Math.tan(t1)) : '—'} = ε₂/ε₁ = ${f(st.e2 / st.e1)}</span>`);
    };
  }, { aspect: 0.55 });
}
