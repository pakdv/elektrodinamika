// Sim 3.3: metode bayangan, bidang konduktor ground dan bola konduktor ground (k = 1).
import { p5Sim, controls, readout, C, traceLine, blit, contourSegments, drawSegments } from '../ui.js';
import { planeSigma, sphereImage, field2D } from '../physics.js';

export default function mount(simEl) {
  const out = readout(simEl);
  const q = { x: 0, y: 1.6 }, qs = { x: 2.6, y: 0 };
  let drag = false, dirty = true, lines = [], ghost = [], eqSegs = [];
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'mode', label: 'Konduktor', type: 'select', value: 'bidang', options: [['bidang', 'Bidang tak hingga (z = 0)'], ['bola', 'Bola jari-jari R']] },
    { id: 'R', label: 'Bola: jari-jari R', type: 'range', min: 0.5, max: 2, step: 0.05, value: 1.2 },
    { id: 'img', label: 'Tampilkan muatan bayangan', type: 'check', value: false },
    { id: 'eq', label: 'Ekuipotensial', type: 'check', value: true },
  ], () => { dirty = true; });

  p5Sim(simEl, (p) => {
    const W = 9; let S = 1, img;
    const plane = () => st.mode === 'bidang';
    const oy = () => (plane() ? p.height * 0.62 : p.height / 2);
    const tx = (x) => p.width / 2 + x * S, ty = (y) => oy() - y * S;
    const wx = (sx) => (sx - p.width / 2) / S, wy = (sy) => (oy() - sy) / S;
    const src = () => (plane() ? q : qs);
    const pair = () => {
      const s = src();
      if (plane()) return [{ x: s.x, y: s.y, q: 1 }, { x: s.x, y: -s.y, q: -1 }];
      const a = Math.hypot(s.x, s.y), im = sphereImage(1, a, st.R);
      return [{ x: s.x, y: s.y, q: 1 }, { x: (s.x * im.b) / a, y: (s.y * im.b) / a, q: im.q }];
    };
    const real = (x, y) => (plane() ? y > 0 : x * x + y * y > st.R * st.R);

    function recompute() {
      S = p.width / W;
      const cs = pair(), s = src();
      const E = (x, y) => { const f = field2D(x, y, cs); return [f.ex, f.ey]; };
      lines = []; ghost = [];
      const n = 20;
      for (let k = 0; k < n; k++) {
        const a = (2 * Math.PI * (k + 0.5)) / n;
        const pts = traceLine(E, s.x + 0.1 * Math.cos(a), s.y + 0.1 * Math.sin(a), { step: 0.03, maxSteps: 900, stop: (x, y) => !real(x, y) || Math.abs(x) > 8 || Math.abs(y) > 8 });
        lines.push(pts);
        // lanjutan "palsu" di dalam konduktor menuju bayangan
        const last = pts[pts.length - 1];
        if (!real(...last)) ghost.push(traceLine(E, last[0], last[1], { step: 0.03, maxSteps: 400, stop: (x, y) => (x - cs[1].x) ** 2 + (y - cs[1].y) ** 2 < 0.004 || Math.abs(x) > 8 || Math.abs(y) > 8 }));
      }
      // peta ekuipotensial
      const cz = 4, gw = Math.ceil(p.width / cz), gh = Math.ceil(p.height / cz);
      img = p.createImage(gw, gh);
      img.loadPixels();
      const vals = new Float32Array(gw * gh);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        const x = wx((i + 0.5) * cz), y = wy((j + 0.5) * cz), k = 4 * (j * gw + i);
        if (!real(x, y)) { vals[j * gw + i] = NaN; img.pixels[k + 3] = 0; continue; }
        const v = field2D(x, y, cs).v;
        vals[j * gw + i] = v;
        img.pixels[k] = 255; img.pixels[k + 1] = 120; img.pixels[k + 2] = 100;
        img.pixels[k + 3] = Math.min(70, 45 * v);
      }
      img.updatePixels();
      eqSegs = contourSegments(vals, gw, gh, [0.05, 0.1, 0.2, 0.4, 0.8, 1.6], cz, cz);
      dirty = false;
    }

    p.setup = recompute;
    p.onResize = () => { dirty = true; };
    p.draw = () => {
      if (dirty) recompute();
      p.background(C.bg);
      const cs = pair(), s = src();
      if (st.eq) { blit(p, img, 0, 0, p.width, p.height); drawSegments(p, eqSegs, 'rgba(255,170,150,0.55)', 1); }
      // konduktor
      p.noStroke(); p.fill(60, 72, 88);
      if (plane()) p.rect(0, oy(), p.width, p.height - oy());
      else p.circle(tx(0), ty(0), 2 * st.R * S);
      // garis medan
      p.noFill(); p.stroke(215, 228, 239, 190); p.strokeWeight(1.2);
      for (const L of lines) { p.beginShape(); for (const [x, y] of L) p.vertex(tx(x), ty(y)); p.endShape(); }
      if (st.img) {
        p.stroke(215, 228, 239, 70); p.drawingContext.setLineDash([4, 4]);
        for (const L of ghost) { p.beginShape(); for (const [x, y] of L) p.vertex(tx(x), ty(y)); p.endShape(); }
        p.drawingContext.setLineDash([]);
      }
      // muatan induksi σ
      let readSigma = '';
      if (plane()) {
        const d = s.y;
        p.noStroke(); p.fill(78, 168, 255, 170);
        p.beginShape(); p.vertex(0, oy());
        for (let sx = 0; sx <= p.width; sx += 3) { const sg = planeSigma(wx(sx) - s.x, 0, 1, d); p.vertex(sx, oy() - sg * S * 28); }
        p.vertex(p.width, oy()); p.endShape(p.CLOSE);
        p.fill(C.dim); p.textSize(11); p.textAlign(p.LEFT, p.TOP); p.text('σ(x) induksi (biru, ke bawah = negatif)', 8, p.height - 20);
        readSigma = `<span><b>σ maks</b> −q/2πd² = ${(-1 / (2 * Math.PI * d * d)).toFixed(3)}</span>
          <span><b>F</b> = −q²/(2d)² = ${(-1 / (4 * d * d)).toFixed(3)} ẑ</span>
          <span><b>W</b> = −q²/4d = ${(-1 / (4 * d)).toFixed(3)} <span style="color:var(--muted)">(½ dari −q²/2d)</span></span>`;
      } else {
        // σ di permukaan bola dari E normal (E·r̂ di r = R⁺)
        for (let k = 0; k < 120; k++) {
          const t = (2 * Math.PI * k) / 120, x = (st.R + 1e-3) * Math.cos(t), y = (st.R + 1e-3) * Math.sin(t);
          const f = field2D(x, y, cs), en = (f.ex * Math.cos(t) + f.ey * Math.sin(t)) / (4 * Math.PI);
          p.stroke(78, 168, 255, 200); p.strokeWeight(2);
          const L = Math.min(40, -en * S * 3);
          p.line(tx(st.R * Math.cos(t)), ty(st.R * Math.sin(t)), tx((st.R - L / S) * Math.cos(t)), ty((st.R - L / S) * Math.sin(t)));
        }
        let vmax = 0;
        for (let k = 0; k < 36; k++) { const t = (2 * Math.PI * k) / 36; vmax = Math.max(vmax, Math.abs(field2D(st.R * Math.cos(t), st.R * Math.sin(t), cs).v)); }
        const a = Math.hypot(s.x, s.y);
        readSigma = `<span><b>a</b> ${a.toFixed(2)}</span><span><b>q′ = −qR/a</b> ${cs[1].q.toFixed(3)}</span><span><b>b = R²/a</b> ${(st.R * st.R / a).toFixed(3)}</span><span><b>maks |V| di permukaan</b> <span class="good">${vmax.toExponential(1)}</span></span>`;
      }
      // muatan
      const drawQ = (c, alpha) => {
        p.stroke(C.bg); p.strokeWeight(2);
        const col = p.color(c.q > 0 ? C.pos : C.neg); col.setAlpha(alpha);
        p.fill(col); p.circle(tx(c.x), ty(c.y), 22 * Math.sqrt(Math.min(1.5, Math.abs(c.q))) + 6);
        p.noStroke(); p.fill(255, alpha); p.textAlign(p.CENTER, p.CENTER); p.textSize(11); p.textStyle(p.BOLD);
        p.text(c.q > 0 ? '+q' : (plane() ? '−q' : "q′"), tx(c.x), ty(c.y) + 1);
      };
      if (st.img) drawQ(cs[1], 150);
      drawQ(cs[0], 255);
      out(`<span><b>posisi q</b> (${s.x.toFixed(2)}, ${s.y.toFixed(2)})</span>${readSigma}`);
    };
    p.mousePressed = () => {
      const s = src();
      if ((p.mouseX - tx(s.x)) ** 2 + (p.mouseY - ty(s.y)) ** 2 < 400) { drag = true; return false; }
    };
    p.mouseDragged = () => {
      if (!drag) return;
      const s = src(), x = wx(p.mouseX), y = wy(p.mouseY);
      if (plane()) { s.x = Math.max(-4, Math.min(4, x)); s.y = Math.max(0.25, y); }
      else { const r = Math.hypot(x, y), rmin = st.R + 0.25; s.x = r < rmin ? (x / r) * rmin : x; s.y = r < rmin ? (y / r) * rmin : y; }
      dirty = true;
      return false;
    };
    p.mouseReleased = () => { drag = false; };
  });
}
