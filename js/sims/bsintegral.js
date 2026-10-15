// Sim 5.1: integrasi Biot-Savart kawat lurus elemen demi elemen. dB = μ0 I /4π · dx sinθ / r².
import { p5Sim, controls, readout, C, arrow, fmtSI } from '../ui.js';
import { MU0 } from '../physics.js';

export default function mount(simEl) {
  const out = readout(simEl);
  const P = { x: 0.3, a: 0.5 };
  let k = 0, playing = false, drag = false;
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'I', label: 'Arus I', type: 'range', min: 1, max: 20, step: 1, value: 10, fmt: (v) => v + ' A' },
    { id: 'L', label: 'Panjang kawat 2ℓ', type: 'range', min: 0.4, max: 8, step: 0.1, value: 4, fmt: (v) => v + ' m' },
    { id: 'N', label: 'Jumlah elemen dx', type: 'range', min: 8, max: 120, step: 1, value: 40 },
    { id: 'speed', label: 'Kecepatan animasi', type: 'range', min: 1, max: 10, step: 1, value: 3 },
    { type: 'buttons', buttons: [['play', 'Integrasi', true], ['all', 'Langsung semua'], ['reset', 'Reset']] },
  ], (id) => {
    if (id === 'play') { if (k >= st.N) k = 0; playing = true; }
    if (id === 'all') { k = st.N; playing = false; }
    if (id === 'reset' || id === 'N' || id === 'L') { k = 0; playing = false; }
  });

  p5Sim(simEl, (p) => {
    let frame = 0;
    p.draw = () => {
      const W = 6, S = p.width / W, wy = p.height * 0.62;
      const tx = (x) => p.width / 2 + x * S, ty = (y) => wy - y * S;
      const half = st.L / 2, N = st.N, dx = st.L / N;
      if (playing && ++frame % Math.max(1, 11 - st.speed) === 0) { k++; if (k >= N) { k = N; playing = false; } }
      p.background(C.bg);
      // kawat
      p.stroke('#b88a52'); p.strokeWeight(4); p.line(tx(-half), ty(0), tx(half), ty(0));
      arrow(p, tx(half - 0.35), ty(0) + 16, tx(half), ty(0) + 16, C.amber, 2, 8);
      p.noStroke(); p.fill(C.amber); p.textSize(12); p.text('I', tx(half - 0.45), ty(0) + 12);
      // elemen
      const cx = P.x, a = P.a, pre = (MU0 * st.I) / (4 * Math.PI);
      let sum = 0;
      const dBs = [];
      for (let i = 0; i < N; i++) {
        const x = -half + (i + 0.5) * dx, rx = cx - x, r = Math.hypot(rx, a);
        const sin = a / r, dB = (pre * dx * sin) / (r * r);
        dBs.push([x, dB]);
        if (i < k) sum += dB;
        p.noStroke(); p.fill(i < k ? C.teal : '#2a3a4d'); p.rect(tx(x - dx / 2) + 0.5, ty(0) - 3, Math.max(1, dx * S - 1), 6);
      }
      // elemen aktif: vektor r dan sudut θ
      if (k > 0 && k <= N) {
        const x = -half + (k - 0.5) * dx;
        arrow(p, tx(x), ty(0), tx(cx), ty(a), C.green, 1.5, 7);
        p.noStroke(); p.fill(C.green); p.text('r', (tx(x) + tx(cx)) / 2 + 6, (ty(0) + ty(a)) / 2);
        const th = Math.atan2(a, cx - x);
        p.noFill(); p.stroke(C.green); p.strokeWeight(1); p.arc(tx(x), ty(0), 36, 36, -th, 0);
        p.noStroke(); p.fill(C.green); p.text('θ', tx(x) + 20, ty(0) - 8);
      }
      // titik P dengan simbol ⊙ (keluar bidang)
      p.stroke(C.fg); p.strokeWeight(1.5); p.noFill(); p.circle(tx(cx), ty(a), 22);
      p.noStroke(); p.fill(C.fg); p.circle(tx(cx), ty(a), 5);
      p.textAlign(p.LEFT, p.CENTER); p.text('P  (B keluar bidang ⊙)', tx(cx) + 16, ty(a));
      p.stroke(C.dim); p.drawingContext.setLineDash([3, 4]); p.line(tx(cx), ty(a), tx(cx), ty(0)); p.drawingContext.setLineDash([]);
      p.noStroke(); p.fill(C.dim); p.text('a', tx(cx) + 5, ty(a / 2));
      // grafik dB per elemen
      const gy = p.height - 12, gh = p.height - wy - 40, mx = Math.max(...dBs.map((d) => d[1]));
      p.stroke(C.grid); p.line(tx(-W / 2), gy, tx(W / 2), gy);
      for (let i = 0; i < N; i++) {
        const [x, dB] = dBs[i], h = (dB / mx) * gh;
        p.noStroke(); p.fill(i < k ? C.teal : '#2a3a4d');
        p.rect(tx(x - dx / 2) + 0.5, gy - h, Math.max(1, dx * S - 1), h);
      }
      p.fill(C.dim); p.textAlign(p.LEFT, p.TOP); p.text('dB per elemen', 8, wy + 22);

      // B kawat berhingga = μ0I/4πa (cosθ₁ − cosθ₂), cosθ diukur dari tiap ujung
      const Bf = (pre / a) * ((cx + half) / Math.hypot(cx + half, a) - (cx - half) / Math.hypot(cx - half, a));
      out(`<span><b>elemen</b> ${k} / ${N}</span><span><b>ΣdB</b> <span class="good">${fmtSI(sum, 'T')}</span></span>
        <span><b>μ0I/4πa (cosθ₁ − cosθ₂)</b> ${fmtSI(Bf, 'T')}</span>
        <span><b>kawat tak hingga μ0I/2πa</b> ${fmtSI((MU0 * st.I) / (2 * Math.PI * a), 'T')}</span>
        <span><b>a</b> ${a.toFixed(2)} m</span>`);
    };
    p.mousePressed = () => {
      const S = p.width / 6, wy = p.height * 0.62;
      if (Math.hypot(p.mouseX - (p.width / 2 + P.x * S), p.mouseY - (wy - P.a * S)) < 20) { drag = true; return false; }
    };
    p.mouseDragged = () => {
      if (!drag) return;
      const S = p.width / 6, wy = p.height * 0.62;
      P.x = Math.max(-2.8, Math.min(2.8, (p.mouseX - p.width / 2) / S));
      P.a = Math.max(0.08, Math.min((wy - 14) / S, (wy - p.mouseY) / S));
      return false;
    };
    p.mouseReleased = () => { drag = false; };
  }, { aspect: 0.58 });
}
