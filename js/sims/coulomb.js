// Sim 2.1: muatan titik 2D (k = 1): garis medan, peta potensial + ekuipotensial, gaya superposisi, probe.
import { p5Sim, controls, readout, C, arrow, diverging, nearest, traceLine, blit, contourSegments, drawSegments, symLevels } from '../ui.js';
import { field2D } from '../physics.js';

const PRESETS = {
  dipol: [{ x: -1.5, y: 0, q: 1 }, { x: 1.5, y: 0, q: -1 }],
  sejenis: [{ x: -1.5, y: 0, q: 1 }, { x: 1.5, y: 0, q: 1 }],
  tidaksama: [{ x: -1.5, y: 0, q: 2 }, { x: 1.5, y: 0, q: -1 }],
  kuadrupol: [{ x: -1.3, y: -1.3, q: 1 }, { x: 1.3, y: -1.3, q: -1 }, { x: 1.3, y: 1.3, q: 1 }, { x: -1.3, y: 1.3, q: -1 }],
  slide7: [{ x: -1, y: -1, q: 2 }, { x: -1, y: 1, q: -2 }, { x: 1, y: 1, q: 1 }],
};

export default function mount(simEl) {
  let charges = PRESETS.dipol.map((c) => ({ ...c }));
  let sel = 0, drag = -1, dirty = true, img, lines = [], eqSegs = [];
  const out = readout(simEl);
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'preset', label: 'Preset', type: 'select', value: 'dipol', options: [['dipol', 'Dipol (+q, −q)'], ['sejenis', 'Dua sejenis'], ['tidaksama', '+2q dan −q'], ['kuadrupol', 'Kuadrupol'], ['slide7', 'Susunan contoh slide 7']] },
    { type: 'buttons', buttons: [['addp', '+ muatan'], ['addn', '− muatan'], ['clear', 'Hapus semua']] },
    { id: 'q', label: 'q muatan terpilih', type: 'range', min: -3, max: 3, step: 1, value: 1, fmt: (v) => (v > 0 ? '+' : '') + v + 'q' },
    { id: 'lines', label: 'Garis medan', type: 'check', value: true },
    { id: 'pot', label: 'Peta potensial & ekuipotensial', type: 'check', value: true },
    { id: 'vec', label: 'Vektor medan (grid)', type: 'check', value: false },
    { id: 'force', label: 'Vektor gaya pada tiap muatan', type: 'check', value: false },
  ], (id) => {
    if (id === 'preset') { charges = PRESETS[st.preset].map((c) => ({ ...c })); sel = 0; }
    if (id === 'addp' || id === 'addn') { charges.push({ x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 2, q: id === 'addp' ? 1 : -1 }); sel = charges.length - 1; }
    if (id === 'clear') { charges = []; sel = -1; }
    if (id === 'q' && charges[sel]) charges[sel].q = st.q === 0 ? 1 : st.q;
    if (charges[sel] && id !== 'q') st.set('q', charges[sel].q);
    dirty = true;
  });

  p5Sim(simEl, (p) => {
    const W = 10; // lebar dunia
    let S = 1;
    const tx = (x) => p.width / 2 + x * S, ty = (y) => p.height / 2 - y * S;
    const wx = (sx) => (sx - p.width / 2) / S, wy = (sy) => (p.height / 2 - sy) / S;
    const E = (x, y) => { const f = field2D(x, y, charges); return [f.ex, f.ey]; };

    function recompute() {
      S = p.width / W;
      // peta potensial (resolusi rendah)
      const cs = 4, gw = Math.ceil(p.width / cs), gh = Math.ceil(p.height / cs);
      img = p.createImage(gw, gh);
      img.loadPixels();
      const vals = new Float32Array(gw * gh);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        const { v } = field2D(wx((i + 0.5) * cs), wy((j + 0.5) * cs), charges);
        vals[j * gw + i] = v;
        const [r, g, b] = diverging(Math.tanh(v / 1.5));
        const k = 4 * (j * gw + i);
        img.pixels[k] = r; img.pixels[k + 1] = g; img.pixels[k + 2] = b; img.pixels[k + 3] = 255;
      }
      img.updatePixels();
      eqSegs = contourSegments(vals, gw, gh, symLevels(0.1, 6), cs, cs);
      // garis medan
      lines = [];
      const bound = W;
      for (const c of charges) {
        const n = 8 * Math.abs(c.q), dir = Math.sign(c.q);
        for (let k = 0; k < n; k++) {
          const a = (2 * Math.PI * (k + 0.5)) / n;
          let endedOnPositive = false;
          const pts = traceLine(E, c.x + 0.12 * Math.cos(a), c.y + 0.12 * Math.sin(a), {
            step: 0.04, maxSteps: 700, dir,
            stop: (x, y) => {
              if (Math.abs(x) > bound || Math.abs(y) > bound) return true;
              for (const o of charges) if (o !== c && (x - o.x) ** 2 + (y - o.y) ** 2 < 0.01) { if (o.q > 0) endedOnPositive = true; return true; }
              return false;
            },
          });
          if (dir < 0 && endedOnPositive) continue; // sudah digambar dari muatan +
          lines.push(pts);
        }
      }
      dirty = false;
    }

    p.setup = () => { recompute(); };
    p.onResize = () => { dirty = true; };
    p.draw = () => {
      if (dirty) recompute();
      p.background(C.bg);
      if (st.pot && img) { blit(p, img, 0, 0, p.width, p.height); drawSegments(p, eqSegs, 'rgba(255,255,255,0.35)', 1); }
      // sumbu
      p.stroke(C.grid); p.strokeWeight(1);
      p.line(0, ty(0), p.width, ty(0)); p.line(tx(0), 0, tx(0), p.height);

      if (st.lines) {
        p.noFill(); p.stroke(215, 228, 239, 170); p.strokeWeight(1.2);
        for (const L of lines) {
          p.beginShape(); for (const [x, y] of L) p.vertex(tx(x), ty(y)); p.endShape();
          const m = L[Math.floor(L.length * 0.35)], m2 = L[Math.floor(L.length * 0.35) + 1];
          if (m && m2) {
            const [x1, y1, x2, y2] = [tx(m[0]), ty(m[1]), tx(m2[0]), ty(m2[1])];
            const fm = field2D(m[0], m[1], charges);
            const dirSign = Math.sign(fm.ex * (m2[0] - m[0]) + fm.ey * (m2[1] - m[1]));
            const a = Math.atan2(y2 - y1, x2 - x1) + (dirSign < 0 ? Math.PI : 0);
            p.push(); p.translate(x1, y1); p.rotate(a); p.noStroke(); p.fill(215, 228, 239, 200); p.triangle(5, 0, -4, 3.5, -4, -3.5); p.pop();
            p.noFill(); p.stroke(215, 228, 239, 170);
          }
        }
      }
      if (st.vec) {
        const step = 0.6;
        for (let x = -W / 2 + step / 2; x < W / 2; x += step) for (let y = -W / 2; y < W / 2; y += step) {
          if (Math.abs(ty(y) - p.height / 2) > p.height / 2) continue;
          const f = field2D(x, y, charges), m = Math.hypot(f.ex, f.ey);
          if (!m) continue;
          const L = 8 + 14 * Math.min(1, Math.log10(1 + m * 3));
          arrow(p, tx(x), ty(y), tx(x) + (L * f.ex) / m, ty(y) - (L * f.ey) / m, C.teal, 1, 4);
        }
      }
      if (st.force) for (const c of charges) {
        const others = charges.filter((o) => o !== c);
        const f = field2D(c.x, c.y, others);
        const F = [c.q * f.ex, c.q * f.ey], m = Math.hypot(...F);
        if (!m) continue;
        const L = 20 + 40 * Math.min(1, Math.log10(1 + m));
        arrow(p, tx(c.x), ty(c.y), tx(c.x) + (L * F[0]) / m, ty(c.y) - (L * F[1]) / m, C.amber, 2.5, 9);
      }
      // muatan
      charges.forEach((c, i) => {
        p.stroke(i === sel ? C.amber : C.bg); p.strokeWeight(i === sel ? 3 : 2);
        p.fill(c.q > 0 ? C.pos : C.neg);
        const r = 11 + 3 * Math.abs(c.q);
        p.circle(tx(c.x), ty(c.y), 2 * r);
        p.noStroke(); p.fill(255); p.textAlign(p.CENTER, p.CENTER); p.textSize(12); p.textStyle(p.BOLD);
        p.text((c.q > 0 ? '+' : '−') + (Math.abs(c.q) > 1 ? Math.abs(c.q) : ''), tx(c.x), ty(c.y) + 1);
      });
      // probe
      const mx = wx(p.mouseX), my = wy(p.mouseY);
      const inside = p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
      if (inside && drag < 0) {
        const f = field2D(mx, my, charges), m = Math.hypot(f.ex, f.ey);
        if (m) arrow(p, p.mouseX, p.mouseY, p.mouseX + (30 * f.ex) / m, p.mouseY - (30 * f.ey) / m, C.green, 2, 8);
      }
      let W2 = 0;
      for (let i = 0; i < charges.length; i++) for (let j = i + 1; j < charges.length; j++)
        W2 += (charges[i].q * charges[j].q) / Math.hypot(charges[i].x - charges[j].x, charges[i].y - charges[j].y);
      const f = field2D(mx, my, charges);
      out(`<span><b>satuan</b> k = 1, q = 1</span>
        ${inside ? `<span><b>probe</b> (${mx.toFixed(2)}, ${my.toFixed(2)})</span><span><b>|E|</b> ${Math.hypot(f.ex, f.ey).toFixed(3)}</span><span><b>V</b> ${f.v.toFixed(3)}</span>` : '<span>arahkan kursor ke kanvas untuk probe E dan V</span>'}
        <span><b>Q total</b> ${charges.reduce((s, c) => s + c.q, 0)}</span>
        <span><b>W = ½Σq<sub>i</sub>V<sub>i</sub></b> ${W2.toFixed(3)}</span>`);
    };

    let lastClick = 0;
    p.mousePressed = () => {
      if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
      const i = nearest(charges, p.mouseX, p.mouseY, 22, (c) => [tx(c.x), ty(c.y)]);
      const now = performance.now();
      if (i >= 0 && now - lastClick < 320 && i === sel) { charges.splice(i, 1); sel = -1; dirty = true; return false; }
      lastClick = now;
      if (i >= 0) { sel = drag = i; st.set('q', charges[i].q); }
      return i >= 0 ? false : undefined;
    };
    p.mouseDragged = () => {
      if (drag < 0) return;
      charges[drag].x = Math.max(-W / 2 + 0.2, Math.min(W / 2 - 0.2, wx(p.mouseX)));
      charges[drag].y = wy(p.mouseY);
      dirty = true;
      return false;
    };
    p.mouseReleased = () => { drag = -1; };
  });
}
