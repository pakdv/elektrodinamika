// Sim 4.1: dipol dalam medan homogen. I θ'' = −pE sinθ − γ θ'; kurva U(θ) = −pE cosθ.
import { p5Sim, controls, readout, C, arrow } from '../ui.js';

export default function mount(simEl) {
  const out = readout(simEl);
  let th = 1.2, w = 0, th0 = 1.2, drag = false;
  const st = controls(simEl.querySelector('.controls'), [
    { id: 'E', label: 'Kuat medan E', type: 'range', min: 0, max: 3, step: 0.05, value: 1.5 },
    { id: 'p', label: 'Momen dipol p = 2qa', type: 'range', min: 0.2, max: 2, step: 0.05, value: 1 },
    { id: 'damp', label: 'Redaman γ', type: 'range', min: 0, max: 1.5, step: 0.05, value: 0.15 },
    { type: 'buttons', buttons: [['s90', 'Mulai 90°'], ['s179', 'Mulai 179°'], ['s180', 'Tepat 180°']] },
  ], (id) => {
    const set = { s90: Math.PI / 2, s179: (179 * Math.PI) / 180, s180: Math.PI }[id];
    if (set !== undefined) { th = th0 = set; w = 0; }
  });

  p5Sim(simEl, (p) => {
    p.draw = () => {
      const dt = Math.min(0.05, p.deltaTime / 1000);
      if (!drag) for (let k = 0; k < 4; k++) { const a = -st.p * st.E * Math.sin(th) - st.damp * w; w += (a * dt) / 4; th += (w * dt) / 4; }
      th = Math.atan2(Math.sin(th), Math.cos(th));
      p.background(C.bg);
      const narrow = p.width < 620, lw = narrow ? p.width : p.width * 0.55, lh = narrow ? p.height * 0.58 : p.height;
      // garis medan homogen (ke kanan)
      p.stroke(C.grid); p.strokeWeight(1);
      for (let y = 24; y < lh; y += 34) arrow(p, 10, y, lw - 10, y, '#24364a', 1, 7);
      p.noStroke(); p.fill(C.dim); p.textSize(12); p.textAlign(p.LEFT, p.TOP); p.text('E →', 12, 6);
      // dipol (θ diukur dari arah E)
      const cx = lw / 2, cy = lh / 2, L = Math.min(lw, lh) * 0.3;
      const ux = Math.cos(th), uy = -Math.sin(th);
      p.stroke(C.fg); p.strokeWeight(3); p.line(cx - L * ux, cy - L * uy, cx + L * ux, cy + L * uy);
      p.noStroke(); p.fill(C.pos); p.circle(cx + L * ux, cy + L * uy, 26);
      p.fill(C.neg); p.circle(cx - L * ux, cy - L * uy, 26);
      p.fill(255); p.textAlign(p.CENTER, p.CENTER); p.textStyle(p.BOLD);
      p.text('+q', cx + L * ux, cy + L * uy + 1); p.text('−q', cx - L * ux, cy - L * uy + 1);
      p.textStyle(p.NORMAL);
      // gaya pada tiap muatan
      const F = 22 * st.E;
      if (F > 1) { arrow(p, cx + L * ux, cy + L * uy, cx + L * ux + F, cy + L * uy, C.amber, 2, 7); arrow(p, cx - L * ux, cy - L * uy, cx - L * ux - F, cy - L * uy, C.amber, 2, 7); }
      // torka (busur)
      const tau = -st.p * st.E * Math.sin(th);
      if (Math.abs(tau) > 0.02) {
        p.noFill(); p.stroke(C.green); p.strokeWeight(2.5);
        const span = Math.min(1.4, Math.abs(tau)), a0 = -th;
        const [s0, s1] = tau > 0 ? [a0 - span, a0] : [a0, a0 + span];
        p.arc(cx, cy, L * 0.9, L * 0.9, s0, s1);
        const ae = tau > 0 ? s0 : s1, ex = cx + 0.45 * L * Math.cos(ae), ey = cy + 0.45 * L * Math.sin(ae);
        const tang = ae + (tau > 0 ? -Math.PI / 2 : Math.PI / 2);
        p.noStroke(); p.fill(C.green); p.triangle(ex + 7 * Math.cos(tang), ey + 7 * Math.sin(tang), ex + 5 * Math.cos(tang + 2.2), ey + 5 * Math.sin(tang + 2.2), ex + 5 * Math.cos(tang - 2.2), ey + 5 * Math.sin(tang - 2.2));
      }
      // panel U(θ)
      const ox = narrow ? 40 : lw + 40, oy = narrow ? lh + 12 : 30, pw = (narrow ? p.width : p.width - lw) - 60, ph = (narrow ? p.height - lh : p.height) - 60;
      const sx = (a) => ox + ((a + Math.PI) / (2 * Math.PI)) * pw, Um = Math.max(0.1, st.p * st.E), sy = (u) => oy + ph / 2 - (u / Um) * (ph / 2) * 0.9;
      p.stroke(C.grid); p.strokeWeight(1); p.line(ox, sy(0), ox + pw, sy(0)); p.line(sx(0), oy, sx(0), oy + ph);
      p.noFill(); p.stroke(C.teal); p.strokeWeight(2);
      p.beginShape(); for (let k = 0; k <= 120; k++) { const a = -Math.PI + (2 * Math.PI * k) / 120; p.vertex(sx(a), sy(-st.p * st.E * Math.cos(a))); } p.endShape();
      p.noStroke(); p.fill(C.amber); p.circle(sx(th), sy(-st.p * st.E * Math.cos(th)), 13);
      p.fill(C.dim); p.textAlign(p.CENTER, p.TOP); p.textSize(11);
      p.text('−180°', sx(-Math.PI), oy + ph + 4); p.text('0°', sx(0), oy + ph + 4); p.text('180°', sx(Math.PI), oy + ph + 4);
      p.textAlign(p.LEFT, p.TOP); p.text('U(θ) = −pE cos θ', ox + 4, oy - 18);
      p.fill(C.green); p.text('stabil', sx(0) + 4, sy(-Um) + 6);
      p.fill(C.pos); p.text('tak stabil', sx(Math.PI) - 52, sy(Um) - 16);

      const U = -st.p * st.E * Math.cos(th), Wk = st.p * st.E * (Math.cos(th) - Math.cos(th0));
      out(`<span><b>θ</b> ${((th * 180) / Math.PI).toFixed(1)}°</span><span><b>τ = −pE sin θ</b> ${tau.toFixed(3)}</span>
        <span><b>U = −p·E</b> ${U.toFixed(3)}</span><span><b>W medan dari θ₀ = ${((th0 * 180) / Math.PI).toFixed(0)}°</b> ${Wk.toFixed(3)}</span>`);
    };
    const center = () => { const lw = p.width < 620 ? p.width : p.width * 0.55, lh = p.width < 620 ? p.height * 0.58 : p.height; return [lw / 2, lh / 2]; };
    p.mousePressed = () => {
      const [cx, cy] = center();
      if (Math.hypot(p.mouseX - cx, p.mouseY - cy) < Math.min(p.width, p.height) * 0.35) { drag = true; return false; }
    };
    p.mouseDragged = () => { if (!drag) return; const [cx, cy] = center(); th = th0 = Math.atan2(-(p.mouseY - cy), p.mouseX - cx); w = 0; return false; };
    p.mouseReleased = () => { drag = false; };
  }, { aspect: 0.5, minH: 340 });
}
