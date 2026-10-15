// Sim 3.1: metode relaksasi (Gauss-Seidel) untuk ∇²V = 0, konduktor bisa dilukis.
import { p5Sim, controls, readout, C, diverging } from '../ui.js';
import { relaxSweep } from '../physics.js';

const GW = 96, GH = 60;

export default function mount(simEl) {
  const V = new Float32Array(GW * GH), fixed = new Uint8Array(GW * GH);
  let iter = 0, running = true, lastDelta = 0;
  const out = readout(simEl);
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'preset', label: 'Preset syarat batas', type: 'select', value: 'celah', options: [['celah', 'Celah pelat (soal 3.2)'], ['kapasitor', 'Kapasitor pelat sejajar'], ['kotak', 'Kotak berpotensial di tengah'], ['kosong', 'Kosong (batas = 0)']] },
    { id: 'brush', label: 'Kuas', type: 'select', value: '1', options: [['1', 'Konduktor V = +1'], ['-1', 'Konduktor V = −1'], ['0', 'Ground V = 0'], ['erase', 'Hapus (jadi bebas)']] },
    { id: 'speed', label: 'Iterasi per frame', type: 'range', min: 1, max: 60, step: 1, value: 12 },
    { id: 'contour', label: 'Garis ekuipotensial', type: 'check', value: true },
    { type: 'buttons', buttons: [['run', 'Jalankan / jeda', true], ['step', '1 iterasi'], ['zero', 'Nolkan interior']] },
  ], (id) => {
    if (id === 'preset') setup(st.preset);
    if (id === 'run') running = !running;
    if (id === 'step') { lastDelta = relaxSweep(V, fixed, GW, GH); iter++; }
    if (id === 'zero') { for (let k = 0; k < V.length; k++) if (!fixed[k]) V[k] = 0; iter = 0; }
  });

  function setFix(i, j, v) { const k = j * GW + i; fixed[k] = 1; V[k] = v; }
  function setup(name) {
    V.fill(0); fixed.fill(0); iter = 0;
    for (let i = 0; i < GW; i++) { setFix(i, 0, 0); setFix(i, GH - 1, 0); }
    for (let j = 0; j < GH; j++) { setFix(0, j, 0); setFix(GW - 1, j, 0); }
    if (name === 'celah') for (let j = 1; j < GH - 1; j++) setFix(0, j, 1);
    if (name === 'kapasitor') for (let i = 30; i < 66; i++) { setFix(i, 20, 1); setFix(i, 40, -1); }
    if (name === 'kotak') for (let i = 40; i < 56; i++) for (let j = 22; j < 38; j++) setFix(i, j, 1);
  }
  setup('celah');

  p5Sim(simEl, (p) => {
    let img;
    p.setup = () => { img = p.createImage(GW, GH); };
    const cell = () => [p.width / GW, p.height / GH];
    p.draw = () => {
      if (running) for (let s = 0; s < st.speed; s++) { lastDelta = relaxSweep(V, fixed, GW, GH); iter++; }
      img.loadPixels();
      for (let k = 0; k < V.length; k++) {
        let [r, g, b] = diverging(V[k]);
        if (fixed[k]) { r = r * 0.6 + 70; g = g * 0.6 + 70; b = b * 0.6 + 70; }
        img.pixels[4 * k] = r; img.pixels[4 * k + 1] = g; img.pixels[4 * k + 2] = b; img.pixels[4 * k + 3] = 255;
      }
      img.updatePixels();
      p.noSmooth(); p.image(img, 0, 0, p.width, p.height); p.smooth();
      const [cw, ch] = cell();
      if (st.contour) {
        // marching squares sederhana: garis di level ±0.1, ±0.3, ...
        p.stroke(255, 255, 255, 90); p.strokeWeight(1);
        for (const lv of [-0.9, -0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7, 0.9]) {
          for (let j = 0; j < GH - 1; j++) for (let i = 0; i < GW - 1; i++) {
            const a = V[j * GW + i] - lv, b = V[j * GW + i + 1] - lv, c = V[(j + 1) * GW + i + 1] - lv, d = V[(j + 1) * GW + i] - lv;
            const pts = [];
            const e = (v1, v2, x1, y1, x2, y2) => { if ((v1 > 0) !== (v2 > 0)) { const t = v1 / (v1 - v2); pts.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]); } };
            e(a, b, i, j, i + 1, j); e(b, c, i + 1, j, i + 1, j + 1); e(c, d, i + 1, j + 1, i, j + 1); e(d, a, i, j + 1, i, j);
            if (pts.length >= 2) p.line((pts[0][0] + 0.5) * cw, (pts[0][1] + 0.5) * ch, (pts[1][0] + 0.5) * cw, (pts[1][1] + 0.5) * ch);
            if (pts.length === 4) p.line((pts[2][0] + 0.5) * cw, (pts[2][1] + 0.5) * ch, (pts[3][0] + 0.5) * cw, (pts[3][1] + 0.5) * ch);
          }
        }
      }
      // cek sifat rata-rata di kursor
      const i = Math.floor(p.mouseX / cw), j = Math.floor(p.mouseY / ch);
      let probe = '<span>arahkan kursor: bandingkan V sel dengan rata-rata 4 tetangga</span>';
      if (i > 0 && j > 0 && i < GW - 1 && j < GH - 1) {
        const k = j * GW + i, avg = 0.25 * (V[k - 1] + V[k + 1] + V[k - GW] + V[k + GW]);
        p.noFill(); p.stroke(C.amber); p.strokeWeight(1.5);
        p.rect(i * cw, j * ch, cw, ch); p.rect((i - 1) * cw, j * ch, cw, ch); p.rect((i + 1) * cw, j * ch, cw, ch); p.rect(i * cw, (j - 1) * ch, cw, ch); p.rect(i * cw, (j + 1) * ch, cw, ch);
        probe = `<span><b>V sel</b> ${V[k].toFixed(4)}</span><span><b>rata-rata tetangga</b> ${avg.toFixed(4)}</span>${fixed[k] ? '<span class="warn">sel konduktor (tetap)</span>' : ''}`;
      }
      out(`<span><b>iterasi</b> ${iter}</span><span><b>perubahan maks</b> <span class="${lastDelta < 1e-4 ? 'good' : 'warn'}">${lastDelta.toExponential(2)}</span></span>${probe}`);
    };
    const paint = () => {
      const [cw, ch] = cell();
      const i = Math.floor(p.mouseX / cw), j = Math.floor(p.mouseY / ch);
      if (i < 1 || j < 1 || i >= GW - 1 || j >= GH - 1) return;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const k = (j + dj) * GW + i + di;
        if (i + di < 1 || j + dj < 1 || i + di >= GW - 1 || j + dj >= GH - 1) continue;
        if (st.brush === 'erase') fixed[k] = 0; else { fixed[k] = 1; V[k] = +st.brush; }
      }
    };
    p.mousePressed = () => { if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) { paint(); return false; } };
    p.mouseDragged = () => { if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) { paint(); return false; } };
  }, { aspect: GH / GW });
}
