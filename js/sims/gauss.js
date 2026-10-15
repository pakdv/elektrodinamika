// Sim 2.3: permukaan Gauss 2D. Fluks numerik ∮E·n dl untuk muatan garis (E ∝ 1/r) = 2π q_enc,
// plus hitungan garis medan yang menembus (hijau keluar, merah masuk).
import { p5Sim, controls, readout, C, nearest, traceLine } from '../ui.js';

const field = (x, y, cs) => {
  let ex = 0, ey = 0;
  for (const c of cs) { const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy + 1e-6; ex += (c.q * dx) / r2; ey += (c.q * dy) / r2; }
  return [ex, ey];
};

export default function mount(simEl) {
  let charges = [{ x: -1, y: 0.3, q: 2 }, { x: 0.9, y: -0.4, q: -1 }, { x: 3, y: 1.2, q: 1 }];
  const surf = { x: -0.6, y: 0, r: 2, w: 3.6, h: 2.6 };
  let drag = null, dirty = true, lines = [];
  const out = readout(simEl);
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'shape', label: 'Bentuk permukaan', type: 'select', value: 'circle', options: [['circle', 'Lingkaran'], ['rect', 'Persegi panjang'], ['blob', 'Kurva bebas (bergelombang)']] },
    { id: 'lpq', label: 'Garis per satuan q', type: 'range', min: 4, max: 16, step: 2, value: 8 },
    { type: 'buttons', buttons: [['addp', '+ muatan'], ['addn', '− muatan'], ['reset', 'Reset']] },
    { type: 'note', label: 'Model 2D: muatan garis, E ∝ λ/r. Hukum Gauss: ∮E·n dl = λ<sub>enc</sub>/ε₀. Di sini ditampilkan Φ/2π (= q<sub>enc</sub>).' },
  ], (id) => {
    if (id === 'addp' || id === 'addn') charges.push({ x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 3, q: id === 'addp' ? 1 : -1 });
    if (id === 'reset') charges = [{ x: -1, y: 0.3, q: 2 }, { x: 0.9, y: -0.4, q: -1 }, { x: 3, y: 1.2, q: 1 }];
    dirty = true;
  });

  // kurva tertutup sebagai fungsi parameter t∈[0,2π)
  const curve = (t) => {
    if (st.shape === 'circle') return [surf.x + surf.r * Math.cos(t), surf.y + surf.r * Math.sin(t)];
    if (st.shape === 'blob') { const r = surf.r * (1 + 0.22 * Math.sin(3 * t) + 0.12 * Math.cos(5 * t)); return [surf.x + r * Math.cos(t), surf.y + r * Math.sin(t)]; }
    // persegi panjang: parameter keliling
    const P = 2 * (surf.w + surf.h), s = (t / (2 * Math.PI)) * P, hw = surf.w / 2, hh = surf.h / 2;
    if (s < surf.w) return [surf.x - hw + s, surf.y - hh];
    if (s < surf.w + surf.h) return [surf.x + hw, surf.y - hh + (s - surf.w)];
    if (s < 2 * surf.w + surf.h) return [surf.x + hw - (s - surf.w - surf.h), surf.y + hh];
    return [surf.x - hw, surf.y + hh - (s - 2 * surf.w - surf.h)];
  };
  const poly = () => Array.from({ length: 400 }, (_, i) => curve((2 * Math.PI * i) / 400));
  const inside = (x, y, pg) => {
    let c = false;
    for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) {
      const [xi, yi] = pg[i], [xj, yj] = pg[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };

  p5Sim(simEl, (p) => {
    const W = 10; let S = 1;
    const tx = (x) => p.width / 2 + x * S, ty = (y) => p.height / 2 - y * S;
    const wx = (sx) => (sx - p.width / 2) / S, wy = (sy) => (p.height / 2 - sy) / S;
    const E = (x, y) => field(x, y, charges);

    function recompute() {
      S = p.width / W;
      lines = [];
      for (const c of charges) {
        const n = st.lpq * Math.abs(c.q), dir = Math.sign(c.q);
        for (let k = 0; k < n; k++) {
          const a = (2 * Math.PI * (k + 0.5)) / n;
          let hitPos = false;
          const pts = traceLine(E, c.x + 0.08 * Math.cos(a), c.y + 0.08 * Math.sin(a), {
            step: 0.035, maxSteps: 900, dir,
            stop: (x, y) => {
              if (Math.abs(x) > 9 || Math.abs(y) > 9) return true;
              for (const o of charges) if (o !== c && (x - o.x) ** 2 + (y - o.y) ** 2 < 0.006) { if (o.q > 0) hitPos = true; return true; }
              return false;
            },
          });
          if (dir < 0 && hitPos) continue;
          lines.push({ pts, dir });
        }
      }
      dirty = false;
    }
    p.setup = recompute;
    p.onResize = () => { dirty = true; };
    p.draw = () => {
      if (dirty) recompute();
      p.background(C.bg);
      const pg = poly();
      // permukaan
      p.noStroke(); p.fill(63, 208, 201, 26);
      p.beginShape(); for (const [x, y] of pg) p.vertex(tx(x), ty(y)); p.endShape(p.CLOSE);
      p.noFill(); p.stroke(C.teal); p.strokeWeight(2);
      p.beginShape(); for (const [x, y] of pg) p.vertex(tx(x), ty(y)); p.endShape(p.CLOSE);

      // garis medan + titik tembus
      let nout = 0, nin = 0;
      const marks = [];
      for (const { pts, dir } of lines) {
        p.stroke(215, 228, 239, 140); p.strokeWeight(1.1); p.noFill();
        p.beginShape(); for (const [x, y] of pts) p.vertex(tx(x), ty(y)); p.endShape();
        let prev = inside(pts[0][0], pts[0][1], pg);
        for (let i = 1; i < pts.length; i++) {
          const cur = inside(pts[i][0], pts[i][1], pg);
          if (cur !== prev) {
            const outward = (prev && !cur) === dir > 0; // arah medan sebenarnya
            outward ? nout++ : nin++;
            marks.push([pts[i][0], pts[i][1], outward]);
          }
          prev = cur;
        }
      }
      for (const [x, y, o] of marks) { p.noStroke(); p.fill(o ? C.green : C.pos); p.circle(tx(x), ty(y), 7); }

      // fluks numerik ∮ E·n dl
      let flux = 0;
      for (let i = 0; i < pg.length; i++) {
        const [x1, y1] = pg[i], [x2, y2] = pg[(i + 1) % pg.length];
        const [ex, ey] = E((x1 + x2) / 2, (y1 + y2) / 2);
        flux += ex * (y2 - y1) - ey * (x2 - x1); // n dl = (dy, -dx) untuk kurva berlawanan jarum jam
      }
      const qenc = charges.filter((c) => inside(c.x, c.y, pg)).reduce((s, c) => s + c.q, 0);

      charges.forEach((c) => {
        const r = 10 + 3 * Math.abs(c.q);
        p.stroke(C.bg); p.strokeWeight(2); p.fill(c.q > 0 ? C.pos : C.neg); p.circle(tx(c.x), ty(c.y), 2 * r);
        p.noStroke(); p.fill(255); p.textAlign(p.CENTER, p.CENTER); p.textSize(11); p.textStyle(p.BOLD);
        p.text((c.q > 0 ? '+' : '−') + (Math.abs(c.q) > 1 ? Math.abs(c.q) : ''), tx(c.x), ty(c.y) + 1);
      });
      // pegangan
      p.noStroke(); p.fill(C.teal); p.circle(tx(surf.x), ty(surf.y), 9);
      const [hx, hy] = curve(0);
      p.fill(C.amber); p.circle(tx(hx), ty(hy), 11);

      out(`<span><b>q<sub>enc</sub></b> ${qenc}</span>
        <span><b>Φ/2π (numerik)</b> <span class="good">${(flux / (2 * Math.PI)).toFixed(3)}</span></span>
        <span><b>garis keluar − masuk</b> ${nout} − ${nin} = ${nout - nin} <span style="color:var(--muted)">(≈ ${st.lpq} × q<sub>enc</sub> = ${st.lpq * qenc})</span></span>`);
    };
    p.mousePressed = () => {
      if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
      const [hx, hy] = curve(0);
      if ((p.mouseX - tx(hx)) ** 2 + (p.mouseY - ty(hy)) ** 2 < 150) drag = { type: 'size' };
      else {
        const i = nearest(charges, p.mouseX, p.mouseY, 20, (c) => [tx(c.x), ty(c.y)]);
        if (i >= 0) drag = { type: 'q', i };
        else if ((p.mouseX - tx(surf.x)) ** 2 + (p.mouseY - ty(surf.y)) ** 2 < 200 || inside(wx(p.mouseX), wy(p.mouseY), poly())) drag = { type: 'move', ox: wx(p.mouseX) - surf.x, oy: wy(p.mouseY) - surf.y };
      }
      return drag ? false : undefined;
    };
    p.mouseDragged = () => {
      if (!drag) return;
      const x = wx(p.mouseX), y = wy(p.mouseY);
      if (drag.type === 'q') { charges[drag.i].x = x; charges[drag.i].y = y; dirty = true; }
      if (drag.type === 'move') { surf.x = x - drag.ox; surf.y = y - drag.oy; }
      if (drag.type === 'size') {
        const d = Math.hypot(x - surf.x, y - surf.y);
        surf.r = Math.max(0.4, d); surf.w = Math.max(0.6, 2 * Math.abs(x - surf.x)); surf.h = Math.max(0.6, 2 * Math.abs(y - surf.y) || surf.h);
      }
      return false;
    };
    p.mouseReleased = () => { drag = null; };
  });
}
