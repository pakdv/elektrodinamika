// Helper UI bersama: panel kontrol, mount p5 (lazy + pause saat tak terlihat), warna kanvas.
export const C = {
  bg: '#0d1520', grid: '#1c2a3a', axis: '#3a4d63', fg: '#d7e4ef', dim: '#7f93a8',
  pos: '#ff6b5e', neg: '#4ea8ff', teal: '#3fd0c9', amber: '#ffc857', green: '#6fdc8c', violet: '#b59cff',
};

// spec: [{id,label,type:'range'|'select'|'check'|'buttons', min,max,step,value,options:[[v,label]],fmt,buttons:[[id,label]]}]
export function controls(el, spec, onChange = () => {}) {
  const state = {}, outs = {}, inputs = {};
  for (const s of spec) {
    const w = document.createElement('div');
    w.className = 'ctl' + (s.type === 'check' ? ' check' : '');
    const id = `${el.closest('.sim')?.dataset.sim || 'sim'}-${s.id}`;
    if (s.type === 'range') {
      state[s.id] = s.value;
      w.innerHTML = `<div class="row"><label for="${id}">${s.label}</label><span class="val"></span></div>
        <input type="range" id="${id}" min="${s.min}" max="${s.max}" step="${s.step ?? 'any'}" value="${s.value}">`;
      const inp = w.querySelector('input'), out = w.querySelector('.val');
      const fmt = s.fmt || ((v) => +v.toFixed(3));
      out.textContent = fmt(s.value);
      inp.addEventListener('input', () => { state[s.id] = +inp.value; out.textContent = fmt(+inp.value); onChange(s.id, state); });
      inputs[s.id] = inp; outs[s.id] = { out, fmt };
    } else if (s.type === 'select') {
      state[s.id] = s.value ?? s.options[0][0];
      w.innerHTML = `<label for="${id}">${s.label}</label><select id="${id}">${s.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
      const sel = w.querySelector('select');
      sel.value = state[s.id];
      sel.addEventListener('change', () => { state[s.id] = sel.value; onChange(s.id, state); });
      inputs[s.id] = sel;
    } else if (s.type === 'check') {
      state[s.id] = !!s.value;
      w.innerHTML = `<input type="checkbox" id="${id}" ${s.value ? 'checked' : ''}><label for="${id}">${s.label}</label>`;
      const cb = w.querySelector('input');
      cb.addEventListener('change', () => { state[s.id] = cb.checked; onChange(s.id, state); });
      inputs[s.id] = cb;
    } else if (s.type === 'buttons') {
      w.className = 'btns';
      for (const [bid, label, primary] of s.buttons) {
        const b = document.createElement('button');
        b.className = 'b' + (primary ? ' primary' : '');
        b.type = 'button';
        b.textContent = label;
        b.addEventListener('click', () => onChange(bid, state));
        w.appendChild(b);
      }
    } else if (s.type === 'note') {
      w.innerHTML = `<p style="margin:0;color:var(--muted);font-size:.85rem">${s.label}</p>`;
    }
    el.appendChild(w);
  }
  state.set = (k, v) => {
    state[k] = v;
    const inp = inputs[k];
    if (!inp) return;
    if (inp.type === 'checkbox') inp.checked = v; else inp.value = v;
    if (outs[k]) outs[k].out.textContent = outs[k].fmt(+v);
  };
  return state;
}

// Mount sketch p5 di .stage; ukuran ikut lebar stage, tinggi = lebar * aspect (dibatasi).
export function p5Sim(simEl, sketch, { aspect = 0.62, maxH = 560, minH = 260 } = {}) {
  const stage = simEl.querySelector('.stage');
  stage.querySelector('.loading')?.remove();
  const size = () => {
    const w = stage.clientWidth;
    return [w, Math.round(Math.max(minH, Math.min(maxH, w * aspect)))];
  };
  const inst = new p5((p) => {
    p.size = size;
    sketch(p);
    const userSetup = p.setup;
    p.setup = () => {
      const [w, h] = size();
      p.createCanvas(w, h);
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      userSetup?.();
    };
  }, stage);
  new ResizeObserver(() => {
    const [w, h] = size();
    if (inst.width !== w || inst.height !== h) { inst.resizeCanvas(w, h); inst.onResize?.(); inst.redraw(); }
  }).observe(stage);
  // pause saat di luar layar (hemat CPU). Sketch statis set p.static = true → gambar ulang saja.
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return inst.noLoop();
    if (inst.static) inst.redraw(); else inst.loop();
  }).observe(simEl);
  return inst;
}

export function arrow(p, x1, y1, x2, y2, col, w = 1.5, head = 7) {
  p.stroke(col); p.strokeWeight(w); p.line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.noStroke(); p.fill(col);
  p.triangle(x2, y2, x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4), x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
}

// peta warna divergen (negatif biru, nol gelap, positif merah); v dalam [-1,1]
export function diverging(v) {
  const t = Math.max(-1, Math.min(1, v));
  const base = [13, 21, 32];
  const tgt = t >= 0 ? [255, 107, 94] : [78, 168, 255];
  const s = Math.abs(t) ** 0.7;
  return base.map((b, i) => b + (tgt[i] - b) * s);
}

// gambar image resolusi rendah dengan interpolasi halus
export function blit(p, img, x, y, w, h) {
  const c = p.drawingContext;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  p.image(img, x, y, w, h);
}

// marching squares: grid nilai gw×gh (sampel di pusat sel ukuran cw×ch px) → segmen [x1,y1,x2,y2] per level
export function contourSegments(vals, gw, gh, levels, cw, ch, valid = () => true) {
  const segs = [];
  for (const lv of levels) for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
    const k = j * gw + i;
    if (!valid(k)) continue;
    const a = vals[k] - lv, b = vals[k + 1] - lv, c = vals[k + gw + 1] - lv, d = vals[k + gw] - lv;
    if (![a, b, c, d].every(Number.isFinite)) continue;
    const pts = [];
    const e = (v1, v2, x1, y1, x2, y2) => { if ((v1 > 0) !== (v2 > 0)) { const t = v1 / (v1 - v2); pts.push((x1 + t * (x2 - x1) + 0.5) * cw, (y1 + t * (y2 - y1) + 0.5) * ch); } };
    e(a, b, i, j, i + 1, j); e(b, c, i + 1, j, i + 1, j + 1); e(c, d, i + 1, j + 1, i, j + 1); e(d, a, i, j + 1, i, j);
    if (pts.length >= 4) segs.push(pts.slice(0, 4));
    if (pts.length === 8) segs.push(pts.slice(4, 8));
  }
  return segs;
}
export function drawSegments(p, segs, col, w = 1) {
  p.stroke(col); p.strokeWeight(w);
  for (const s of segs) p.line(s[0], s[1], s[2], s[3]);
}
// level potensial log-simetris: 0, ±base·2^k
export const symLevels = (base = 0.1, n = 6) => [0, ...Array.from({ length: n }, (_, k) => base * 2 ** k).flatMap((v) => [v, -v])];

export function readout(simEl) {
  const r = simEl.querySelector('.readout');
  return (html) => { r.innerHTML = html; };
}

export const fmtSI = (v, unit = '', digits = 3) => {
  if (v === 0 || !isFinite(v)) return `${v} ${unit}`;
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e < 4) return `${v.toPrecision(digits)} ${unit}`;
  return `${(v / 10 ** e).toFixed(digits - 1)}×10<sup>${e}</sup> ${unit}`;
};

// tombol drag umum: cari titik terdekat dalam radius
export function nearest(list, x, y, r, getXY) {
  let best = -1, bd = r * r;
  list.forEach((o, i) => {
    const [ox, oy] = getXY(o);
    const d = (ox - x) ** 2 + (oy - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

// garis medan: integrasi RK2 sepanjang arah medan ternormalisasi
export function traceLine(fieldFn, x, y, { step = 0.01, maxSteps = 600, dir = 1, stop = () => false } = {}) {
  const pts = [[x, y]];
  for (let i = 0; i < maxSteps; i++) {
    let [ex, ey] = fieldFn(x, y);
    let m = Math.hypot(ex, ey);
    if (!m) break;
    const mx = x + 0.5 * step * dir * ex / m, my = y + 0.5 * step * dir * ey / m;
    [ex, ey] = fieldFn(mx, my);
    m = Math.hypot(ex, ey);
    if (!m) break;
    x += step * dir * ex / m; y += step * dir * ey / m;
    pts.push([x, y]);
    if (stop(x, y)) break;
  }
  return pts;
}
