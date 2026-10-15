// Sim 1.2: fluks dan sirkulasi medan vektor 2D pada kotak kecil → divergensi & curl.
import { p5Sim, controls, readout, C, arrow } from '../ui.js';

const FIELDS = {
  sumber: { label: 'Sumber F = (x, y)', f: (x, y) => [x, y] },
  rotasi: { label: 'Rotasi F = (−y, x)', f: (x, y) => [-y, x] },
  campur: { label: 'Campuran F = (x − y, x + y)', f: (x, y) => [x - y, x + y] },
  geser: { label: 'Geser F = (y, 0)', f: (x, y) => [y, 0] },
  seragam: { label: 'Seragam F = (1, 0,4)', f: () => [1, 0.4] },
  titik: { label: 'Titik 2D F = r̂ / r', f: (x, y) => { const r2 = x * x + y * y + 1e-9; return [x / r2, y / r2]; } },
  vortex: { label: 'Vorteks F = φ̂ / r', f: (x, y) => { const r2 = x * x + y * y + 1e-9; return [-y / r2, x / r2]; } },
};

export default function mount(simEl) {
  const out = readout(simEl);
  const box = { x: 1, y: 0.6 };
  let drag = null;
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'field', label: 'Medan vektor', type: 'select', value: 'sumber', options: Object.entries(FIELDS).map(([k, v]) => [k, v.label]) },
    { id: 's', label: 'Sisi kotak', type: 'range', min: 0.1, max: 2.5, step: 0.05, value: 1 },
    { id: 'shape', label: 'Bentuk kurva', type: 'select', value: 'kotak', options: [['kotak', 'Kotak'], ['lingkaran', 'Lingkaran']] },
    { type: 'note', label: 'Hijau = fluks keluar · merah = masuk. Panah kuning = komponen tangensial (sirkulasi).' },
  ]);

  p5Sim(simEl, (p) => {
    const W = 8;
    p.draw = () => {
      const S = p.width / W, tx = (x) => p.width / 2 + x * S, ty = (y) => p.height / 2 - y * S;
      const F = FIELDS[st.field].f;
      p.background(C.bg);
      p.stroke(C.grid); p.line(0, ty(0), p.width, ty(0)); p.line(tx(0), 0, tx(0), p.height);
      // panah medan
      const step = 0.5, H = p.height / S / 2;
      let ref = 0;
      const samples = [];
      for (let x = -W / 2 + step / 2; x < W / 2; x += step) for (let y = -H + step / 2; y < H; y += step) { const v = F(x, y); const m = Math.hypot(...v); samples.push([x, y, v, m]); ref = Math.max(ref, m); }
      ref = Math.min(ref, 6);
      for (const [x, y, v, m] of samples) {
        if (!m) continue;
        const L = Math.min(1, m / ref) * step * S * 0.85;
        arrow(p, tx(x), ty(y), tx(x) + (L * v[0]) / m, ty(y) - (L * v[1]) / m, '#5d7a96', 1, 4);
      }
      // kurva tertutup (berlawanan jarum jam), sampel titik tengah
      const N = 160, s = st.s, pts = [];
      for (let i = 0; i < N; i++) {
        const t = i / N;
        if (st.shape === 'lingkaran') { const a = 2 * Math.PI * t; pts.push([box.x + (s / 2) * Math.cos(a), box.y + (s / 2) * Math.sin(a)]); }
        else {
          const q = t * 4, k = Math.floor(q), u = q - k, h = s / 2;
          const c = [[-h + u * s, -h], [h, -h + u * s], [h - u * s, h], [-h, h - u * s]][k];
          pts.push([box.x + c[0], box.y + c[1]]);
        }
      }
      let flux = 0, circ = 0;
      for (let i = 0; i < N; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % N];
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
        const v = F(mx, my);
        const fn = v[0] * dy - v[1] * dx, ft = v[0] * dx + v[1] * dy;
        flux += fn; circ += ft;
        if (i % 8 === 0) {
          const dl = Math.hypot(dx, dy), nx = dy / dl, ny = -dx / dl, n = fn / dl, tt = ft / dl, k = 0.18 * S / Math.max(1, ref / 2);
          arrow(p, tx(mx), ty(my), tx(mx + nx * n * k / S), ty(my + ny * n * k / S), n > 0 ? C.green : C.pos, 2, 6);
          arrow(p, tx(mx), ty(my), tx(mx + (dx / dl) * tt * k / S), ty(my + (dy / dl) * tt * k / S), C.amber, 1.5, 5);
        }
      }
      p.noFill(); p.stroke(C.teal); p.strokeWeight(2);
      p.beginShape(); for (const [x, y] of pts) p.vertex(tx(x), ty(y)); p.endShape(p.CLOSE);
      p.noStroke(); p.fill(C.teal); p.circle(tx(box.x), ty(box.y), 7);

      // divergensi & curl analitik (beda hingga di pusat)
      const h = 1e-4, [x0, y0] = [box.x, box.y];
      const div = (F(x0 + h, y0)[0] - F(x0 - h, y0)[0] + F(x0, y0 + h)[1] - F(x0, y0 - h)[1]) / (2 * h);
      const curl = (F(x0 + h, y0)[1] - F(x0 - h, y0)[1] - F(x0, y0 + h)[0] + F(x0, y0 - h)[0]) / (2 * h);
      const A = st.shape === 'lingkaran' ? Math.PI * (s / 2) ** 2 : s * s;
      const containsO = st.shape === 'lingkaran' ? Math.hypot(x0, y0) < s / 2 : Math.abs(x0) < s / 2 && Math.abs(y0) < s / 2;
      const sing = (st.field === 'titik' || st.field === 'vortex') && containsO;
      out(`<span><b>∮F·n dl</b> ${flux.toFixed(3)}</span><span><b>fluks / luas</b> <span class="good">${(flux / A).toFixed(3)}</span></span>
        <span><b>∇·F di pusat</b> ${sing ? '<span class="warn">singular (δ)</span>' : div.toFixed(3)}</span>
        <span><b>∮F·dl</b> ${circ.toFixed(3)}</span><span><b>sirkulasi / luas</b> <span class="good">${(circ / A).toFixed(3)}</span></span>
        <span><b>(∇×F)<sub>z</sub> di pusat</b> ${sing ? '<span class="warn">singular (δ)</span>' : curl.toFixed(3)}</span>
        ${sing ? `<span class="warn">kurva melingkupi asal: ${st.field === 'titik' ? 'fluks' : 'sirkulasi'} = 2π (dari fungsi delta)</span>` : ''}`);
    };
    p.mousePressed = () => {
      const S = p.width / W;
      if (Math.hypot(p.mouseX - (p.width / 2 + box.x * S), p.mouseY - (p.height / 2 - box.y * S)) < Math.max(20, (st.s / 2) * S)) { drag = true; return false; }
    };
    p.mouseDragged = () => { if (!drag) return; const S = p.width / W; box.x = (p.mouseX - p.width / 2) / S; box.y = (p.height / 2 - p.mouseY) / S; return false; };
    p.mouseReleased = () => { drag = false; };
  }, { aspect: 0.6 });
}
