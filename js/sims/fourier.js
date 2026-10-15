// Sim 3.2: V(x,y) celah dua pelat dari deret Fourier sinus; profil V(x0,y) dan fenomena Gibbs.
import { p5Sim, controls, readout, C, diverging, blit, contourSegments, drawSegments } from '../ui.js';
import { slotV, slotVExact } from '../physics.js';

export default function mount(simEl) {
  const out = readout(simEl);
  let dirty = true, inst;
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'N', label: 'Jumlah suku (n ganjil)', type: 'range', min: 1, max: 60, step: 1, value: 3 },
    { id: 'x0', label: 'Profil pada x / a', type: 'range', min: 0, max: 1.5, step: 0.01, value: 0 },
    { id: 'terms', label: 'Tampilkan suku individual', type: 'check', value: true },
    { type: 'note', label: 'a = 1, V₀ = 1. Pelat ground di y = 0 dan y = a, ujung x = 0 bertegangan V₀.' },
  ], () => { dirty = true; inst?.redraw(); });

  inst = p5Sim(simEl, (p) => {
    let img, segs = [];
    const X = 2; // x ∈ [0, 2a]
    p.static = true;
    p.setup = () => { p.noLoop(); };
    p.onResize = () => { dirty = true; };
    p.draw = () => {
      const pad = 34, mapH = Math.round(p.height * 0.48), plotTop = mapH + 26;
      const mw = p.width - pad - 12;
      if (dirty || !img) {
        const gw = Math.ceil(mw / 3), gh = Math.ceil(mapH / 3);
        img = p.createImage(gw, gh);
        img.loadPixels();
        const vals = new Float32Array(gw * gh);
        for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
          const x = ((i + 0.5) / gw) * X, y = 1 - (j + 0.5) / gh;
          const v = slotV(x, y, 1, 1, st.N);
          vals[j * gw + i] = v;
          const [r, g, b] = diverging(v);
          const k = 4 * (j * gw + i);
          img.pixels[k] = r; img.pixels[k + 1] = g; img.pixels[k + 2] = b; img.pixels[k + 3] = 255;
        }
        img.updatePixels();
        segs = contourSegments(vals, gw, gh, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], mw / gw, mapH / gh);
        dirty = false;
      }
      p.background(C.bg);
      // peta
      blit(p, img, pad, 8, mw, mapH);
      p.push(); p.translate(pad, 8); drawSegments(p, segs, 'rgba(255,255,255,0.4)', 1); p.pop();
      p.stroke(C.fg); p.strokeWeight(3);
      p.line(pad, 8, pad + mw, 8); p.line(pad, 8 + mapH, pad + mw, 8 + mapH);
      p.stroke(C.amber); p.line(pad, 8, pad, 8 + mapH);
      const xl = pad + (st.x0 / X) * mw;
      p.stroke(C.green); p.strokeWeight(1.5); p.drawingContext.setLineDash([5, 4]); p.line(xl, 8, xl, 8 + mapH); p.drawingContext.setLineDash([]);
      p.noStroke(); p.fill(C.dim); p.textSize(11); p.textAlign(p.LEFT, p.TOP);
      p.text('V = 0', pad + 6, 12); p.text('V = 0', pad + 6, mapH - 8);
      p.fill(C.amber); p.text('V₀', 6, 8 + mapH / 2 - 6);
      p.fill(C.dim); p.textAlign(p.RIGHT, p.TOP); p.text('x = 2a', pad + mw, 8 + mapH + 3);

      // plot profil V(x0, y)
      const ph = p.height - plotTop - 22, pw = mw;
      const sx = (y) => pad + y * pw, sy = (v) => plotTop + ph - ((v + 0.2) / 1.4) * ph;
      p.stroke(C.grid); p.strokeWeight(1);
      for (const v of [0, 0.5, 1]) p.line(pad, sy(v), pad + pw, sy(v));
      p.noStroke(); p.fill(C.dim); p.textAlign(p.RIGHT, p.CENTER);
      for (const v of [0, 0.5, 1]) p.text(v, pad - 5, sy(v));
      p.textAlign(p.CENTER, p.TOP); p.text('y / a', pad + pw / 2, plotTop + ph + 4);
      p.noFill();
      // target (x0 = 0: kotak V0) atau eksak
      p.stroke(C.amber); p.strokeWeight(1.5);
      p.beginShape();
      for (let k = 0; k <= 200; k++) { const y = k / 200; const v = st.x0 === 0 ? (y > 0 && y < 1 ? 1 : 0) : slotVExact(st.x0, y, 1, 1); p.vertex(sx(y), sy(v)); }
      p.endShape();
      if (st.terms) {
        const cols = [C.violet, C.neg, C.pos];
        for (let n = 0; n < Math.min(3, st.N); n++) {
          p.stroke(cols[n]); p.strokeWeight(1); p.drawingContext.setLineDash([4, 4]);
          p.beginShape();
          for (let k = 0; k <= 200; k++) { const y = k / 200, m = 2 * n + 1; p.vertex(sx(y), sy(((4 / Math.PI) / m) * Math.exp(-m * Math.PI * st.x0) * Math.sin(m * Math.PI * y))); }
          p.endShape();
          p.drawingContext.setLineDash([]);
        }
      }
      p.stroke(C.green); p.strokeWeight(2.2);
      p.beginShape();
      let vmax = 0;
      for (let k = 0; k <= 400; k++) { const y = k / 400, v = slotV(st.x0, y, 1, 1, st.N); vmax = Math.max(vmax, v); p.vertex(sx(y), sy(v)); }
      p.endShape();

      const vc = slotV(Math.max(st.x0, 1e-9), 0.5, 1, 1, st.N), ve = st.x0 === 0 ? 1 : slotVExact(st.x0, 0.5, 1, 1);
      out(`<span><b>suku</b> n = 1, 3, …, ${2 * st.N - 1}</span>
        <span><b>V(x₀, a/2)</b> deret ${vc.toFixed(4)} · eksak ${ve.toFixed(4)}</span>
        <span><b>maks profil</b> ${vmax.toFixed(4)} ${st.x0 === 0 && st.N > 5 ? `<span class="warn">overshoot ${((vmax - 1) * 100).toFixed(1)}% (Gibbs)</span>` : ''}</span>
        <span style="color:var(--muted)">hijau = deret · kuning = target · putus-putus = suku n = 1, 3, 5</span>`);
    };
  }, { aspect: 0.72 });
}
