// Sim 6: dua loop sebidang. Eksak: Biot-Savart numerik + rumus Neumann. Pendekatan: dipol magnet.
import { p5Sim, controls, readout, C, diverging, fmtSI } from '../ui.js';
import { loopBzInPlane, mutualNeumann, mutualDipole, MU0 } from '../physics.js';

export default function mount(simEl) {
  const out = readout(simEl);
  const L2 = { x: 6, y: 0 }; // pusat loop-2 relatif loop-1, cm
  let mapDirty = true, curveDirty = true, img, curve = [], drag = false;
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'a', label: 'Jari-jari loop-1, a', type: 'range', min: 0.5, max: 3, step: 0.1, value: 1.5, fmt: (v) => v + ' cm' },
    { id: 'b', label: 'Jari-jari loop-2, b', type: 'range', min: 0.3, max: 3, step: 0.1, value: 1, fmt: (v) => v + ' cm' },
    { id: 'I1', label: 'Arus I₁', type: 'range', min: 0.5, max: 10, step: 0.5, value: 2, fmt: (v) => v + ' A' },
    { id: 'I2', label: 'Arus I₂ (searah)', type: 'range', min: 0.5, max: 10, step: 0.5, value: 1, fmt: (v) => v + ' A' },
    { type: 'note', label: 'Arus berlawanan jarum jam dilihat dari atas → m menunjuk keluar layar (+z).' },
  ], (id) => { if (id === 'a' || id === 'I1') mapDirty = true; if (id === 'a' || id === 'b') curveDirty = true; clampR(); });

  const clampR = () => {
    const r = Math.hypot(L2.x, L2.y), rmin = st.a + st.b + 0.15;
    if (r < rmin) { const s = rmin / (r || 1); L2.x = (L2.x || 1) * s; L2.y *= s; }
  };

  p5Sim(simEl, (p) => {
    const layout = () => {
      const narrow = p.width < 680;
      const mw = narrow ? p.width : p.width * 0.6, mh = narrow ? p.height * 0.58 : p.height;
      return { narrow, mw, mh };
    };
    const VIEW = 18; // lebar peta, cm
    p.draw = () => {
      const { narrow, mw, mh } = layout();
      const S = mw / VIEW, ox = mw * 0.3, oy = mh / 2; // loop-1 di (ox, oy)
      const tx = (x) => ox + x * S, ty = (y) => oy - y * S;
      const a = st.a / 100, b = st.b / 100;
      p.background(C.bg);

      if (mapDirty || !img || img.width !== Math.ceil(mw / 5)) {
        const gw = Math.ceil(mw / 5), gh = Math.ceil(mh / 5);
        img = p.createImage(gw, gh);
        img.loadPixels();
        const B0 = (MU0 * st.I1) / (2 * a); // medan di pusat loop-1, skala warna
        for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
          const x = ((i * 5 + 2.5 - ox) / S) / 100, y = ((oy - j * 5 - 2.5) / S) / 100;
          const bz = loopBzInPlane(a, st.I1, x, y, 72);
          const v = Math.sign(bz) * Math.log10(1 + Math.abs(bz) / (B0 * 1e-3)) / 3;
          const [r, g, bl] = diverging(v);
          const k = 4 * (j * gw + i);
          img.pixels[k] = r; img.pixels[k + 1] = g; img.pixels[k + 2] = bl; img.pixels[k + 3] = 255;
        }
        img.updatePixels();
        mapDirty = false;
      }
      p.image(img, 0, 0, mw, mh);

      // loop
      const drawLoop = (cx, cy, R, label) => {
        p.noFill(); p.stroke('#e0b070'); p.strokeWeight(3); p.circle(tx(cx), ty(cy), 2 * R * S);
        // panah arus (berlawanan jarum jam)
        const ax = tx(cx), ay = ty(cy) - R * S;
        p.noStroke(); p.fill('#e0b070'); p.triangle(ax - 7, ay, ax + 3, ay - 5, ax + 3, ay + 5);
        p.fill(C.fg); p.textSize(12); p.textAlign(p.CENTER, p.TOP); p.text(label, tx(cx), ty(cy) + R * S + 6);
        p.textAlign(p.CENTER, p.CENTER); p.text('⊙', tx(cx), ty(cy));
      };
      drawLoop(0, 0, st.a, 'loop-1 (a, I₁)');
      drawLoop(L2.x, L2.y, st.b, 'loop-2 (b, I₂)');
      const r = Math.hypot(L2.x, L2.y);
      p.stroke(C.green); p.strokeWeight(1.2); p.drawingContext.setLineDash([5, 4]); p.line(tx(0), ty(0), tx(L2.x), ty(L2.y)); p.drawingContext.setLineDash([]);
      p.noStroke(); p.fill(C.green); p.textAlign(p.CENTER, p.BOTTOM); p.text(`r = ${r.toFixed(2)} cm`, tx(L2.x / 2), ty(L2.y / 2) - 4);
      p.fill(C.dim); p.textAlign(p.LEFT, p.TOP); p.textSize(11);
      p.text('B_z loop-1: merah = keluar layar, biru = masuk', 8, 8);

      // kurva |M|(r) eksak vs dipol, log-log
      const rmin = st.a + st.b + 0.15, rmax = Math.max(30, 12 * Math.max(st.a, st.b));
      if (curveDirty) {
        curve = [];
        for (let k = 0; k <= 36; k++) {
          const rr = rmin * Math.pow(rmax / rmin, k / 36);
          curve.push([rr, -mutualNeumann(a, b, rr / 100, 120), -mutualDipole(a, b, rr / 100)]);
        }
        curveDirty = false;
      }
      const gx = narrow ? 50 : mw + 56, gy = narrow ? mh + 14 : 26, gw = (narrow ? p.width : p.width - mw) - 72, gh = (narrow ? p.height - mh : p.height) - 64;
      const lx = (v) => Math.log10(v), allM = curve.flatMap((c) => [c[1], c[2]]);
      const ylo = Math.floor(lx(Math.min(...allM))), yhi = Math.ceil(lx(Math.max(...allM)));
      const sx = (rr) => gx + ((lx(rr) - lx(rmin)) / (lx(rmax) - lx(rmin))) * gw, sy = (m) => gy + gh - ((lx(m) - ylo) / (yhi - ylo)) * gh;
      p.stroke(C.grid); p.strokeWeight(1);
      for (let e = ylo; e <= yhi; e++) p.line(gx, sy(10 ** e), gx + gw, sy(10 ** e));
      p.noStroke(); p.fill(C.dim); p.textAlign(p.RIGHT, p.CENTER);
      for (let e = ylo; e <= yhi; e += Math.max(1, Math.round((yhi - ylo) / 4))) p.text(`1e${e}`, gx - 4, sy(10 ** e));
      p.textAlign(p.CENTER, p.TOP);
      for (const rr of [1, 2, 5, 10, 20, 50]) if (rr >= rmin && rr <= rmax) p.text(rr, sx(rr), gy + gh + 4);
      p.text('r (cm), skala log', gx + gw / 2, gy + gh + 18);
      p.textAlign(p.LEFT, p.BOTTOM); p.text('|M| (H)', gx, gy - 4);
      p.noFill();
      p.stroke(C.teal); p.strokeWeight(2.2); p.beginShape(); for (const c of curve) p.vertex(sx(c[0]), sy(c[1])); p.endShape();
      p.stroke(C.amber); p.strokeWeight(1.5); p.drawingContext.setLineDash([6, 4]); p.beginShape(); for (const c of curve) p.vertex(sx(c[0]), sy(c[2])); p.endShape(); p.drawingContext.setLineDash([]);

      // nilai pada r sekarang
      const rm = r / 100;
      const Me = mutualNeumann(a, b, rm, 160), Md = mutualDipole(a, b, rm);
      const Bex = loopBzInPlane(a, st.I1, rm, 0, 180), Bd = (-MU0 * st.I1 * a * a) / (4 * rm ** 3);
      if (r >= rmin && r <= rmax) { p.noStroke(); p.fill(C.fg); p.circle(sx(r), sy(-Me), 9); }
      p.noStroke(); p.fill(C.teal); p.textAlign(p.RIGHT, p.TOP); p.text('eksak (Neumann)', gx + gw, gy + 4);
      p.fill(C.amber); p.text('dipol −μ0πa²b²/4r³', gx + gw, gy + 18);

      out(`<span><b>(a) B₁ di pusat loop-2</b> eksak ${fmtSI(Bex, 'T')} · dipol ${fmtSI(Bd, 'T')}</span>
        <span><b>(b) Φ₂₁ = M I₁</b> eksak ${fmtSI(Me * st.I1, 'Wb')} · dipol ${fmtSI(Md * st.I1, 'Wb')}</span>
        <span><b>(c) τ</b> <span class="good">0</span> (m₂ ∥ B₁) · <b>U = −m₂·B₁</b> ${fmtSI(-Md * st.I1 * st.I2, 'J')} &gt; 0 → tak stabil</span>
        <span><b>(d) M</b> eksak ${fmtSI(Me, 'H')} · dipol ${fmtSI(Md, 'H')} · <span class="${Math.abs(Me / Md - 1) < 0.05 ? 'good' : 'warn'}">rasio ${(Me / Md).toFixed(3)}</span></span>`);
    };
    const hit = () => {
      const { mw, mh } = layout(), S = mw / VIEW, ox = mw * 0.3, oy = mh / 2;
      return [S, ox, oy, Math.hypot(p.mouseX - (ox + L2.x * S), p.mouseY - (oy - L2.y * S)) < Math.max(14, st.b * S)];
    };
    p.mousePressed = () => { if (hit()[3]) { drag = true; return false; } };
    p.mouseDragged = () => {
      if (!drag) return;
      const [S, ox, oy] = hit();
      L2.x = (p.mouseX - ox) / S; L2.y = (oy - p.mouseY) / S;
      clampR();
      return false;
    };
    p.mouseReleased = () => { drag = false; };
    p.onResize = () => { mapDirty = true; };
  }, { aspect: 0.52, minH: 360 });
}
