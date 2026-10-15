// Kalkulator 2.2: gaya Coulomb 3D langkah per langkah (PR slide 8).
import { coulombSteps, K_E } from '../physics.js';

// posisi dalam satuan pilihan, muatan dalam satuan pilihan. Indeks target = t.
const PRESETS = {
  contoh: { label: 'Contoh slide 7: F pada q₃', pos: 'm', q: 'µC', t: 2,
    list: [[6, 0, 0, 0], [-6, 0, 0.02, 0], [3, 0.02, 0.02, 0]] },
  pr1: { label: 'PR 1: F pada q₂ (susunan slide 7)', pos: 'm', q: 'µC', t: 1,
    list: [[6, 0, 0, 0], [-6, 0, 0.02, 0], [3, 0.02, 0.02, 0]] },
  pr2: { label: 'PR 2: F pada q₂(5,5,0)', pos: 'm', q: 'µC', t: 1,
    list: [[10, 5, 0, 5], [5, 5, 5, 0], [-10, 0, 5, 5]] },
  pr3: { label: 'PR 3: F pada q (10) di asal', pos: 'm', q: 'µC', t: 0,
    list: [[10, 0, 0, 0], [2, 0, 2, 0], [4, 2, 2, 0], [5, 0, 2, 2], [-5, 2, 2, 2]] },
};
const QU = { 'µC': 1e-6, nC: 1e-9, C: 1 };
const PU = { m: 1, cm: 1e-2 };

const fmt = (v) => {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  return e >= -2 && e < 4 ? (+v.toPrecision(4)).toString() : `${(v / 10 ** e).toFixed(3)}\\times10^{${e}}`;
};
const vec = (v) => `(${v.map(fmt).join(',\\ ')})`;

export default function mount(simEl) {
  const wrap = simEl.querySelector('.wrap');
  wrap.innerHTML = `
    <div class="btns" style="align-items:end;gap:12px">
      <div class="ctl" style="min-width:15rem"><label for="pr-preset">Soal</label><select id="pr-preset">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
      <div class="ctl"><label for="pr-qu">Satuan q</label><select id="pr-qu"><option>µC</option><option>nC</option><option>C</option></select></div>
      <div class="ctl"><label for="pr-pu">Satuan posisi</label><select id="pr-pu"><option>m</option><option>cm</option></select></div>
      <button class="b" type="button" id="pr-add">+ muatan</button>
    </div>
    <div class="tw"><table><thead><tr><th>target</th><th>muatan</th><th>q</th><th>x</th><th>y</th><th>z</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="res"></div>
    <p class="src" style="margin:0">Teks PDF tidak menampilkan simbol µ, jadi satuan muatan diasumsikan µC (umum pada soal Coulomb). Ganti satuan jika dosen memakai C.</p>`;
  const $ = (s) => wrap.querySelector(s);
  const tbody = $('tbody'), res = $('.res');
  let rows = [], target = 0;

  function load(key) {
    const P = PRESETS[key];
    rows = P.list.map((r) => [...r]);
    target = P.t;
    $('#pr-qu').value = P.q; $('#pr-pu').value = P.pos;
    renderTable(); compute();
  }

  function renderTable() {
    tbody.innerHTML = rows.map((r, i) => `<tr>
      <td><input type="radio" name="pr-t" value="${i}" ${i === target ? 'checked' : ''} aria-label="target q${i + 1}"></td>
      <td>q<sub>${i + 1}</sub></td>
      ${r.map((v, j) => `<td><input type="number" step="any" value="${v}" data-i="${i}" data-j="${j}" aria-label="${['q', 'x', 'y', 'z'][j]}${i + 1}"></td>`).join('')}
      <td><button class="b" type="button" data-del="${i}" aria-label="hapus q${i + 1}">×</button></td></tr>`).join('');
  }

  function tex(s) {
    const span = document.createElement('div');
    try { window.katex.render(s, span, { throwOnError: false, displayMode: true }); } catch { span.textContent = s; }
    return span.outerHTML;
  }

  function compute() {
    if (!rows[target]) target = 0;
    if (rows.length < 2) { res.textContent = 'Butuh minimal dua muatan.'; return; }
    const qu = QU[$('#pr-qu').value], pu = PU[$('#pr-pu').value];
    const mk = (r, i) => ({ q: r[0] * qu, pos: [r[1] * pu, r[2] * pu, r[3] * pu], i });
    const T = mk(rows[target], target);
    const sources = rows.map(mk).filter((s) => s.i !== target);
    if (sources.some((s) => s.pos.every((v, k) => v === T.pos[k]))) { res.textContent = 'Dua muatan berada di posisi yang sama, gaya tak terdefinisi.'; return; }
    const R = coulombSteps(T, sources);
    const t = target + 1;
    let html = tex(`\\vec F_{${t}}=\\sum_j \\frac{q_${t}\\,q_j}{4\\pi\\varepsilon_0}\\frac{\\vec r_{${t}j}}{|\\vec r_{${t}j}|^3},\\quad k=${fmt(K_E)}\\ \\mathrm{N\\,m^2/C^2}`);
    for (const s of R.steps) {
      const j = s.src.i + 1;
      html += tex(`\\vec r_{${t}${j}}=\\vec r_${t}-\\vec r_${j}=${vec(s.rv)}\\ \\mathrm m,\\quad |\\vec r_{${t}${j}}|=${fmt(s.r)}\\ \\mathrm m`);
      html += tex(`\\vec F_{${t}${j}}=\\frac{k\\,(${fmt(T.q)})(${fmt(s.src.q)})}{(${fmt(s.r)})^3}${vec(s.rv)}=${vec(s.F)}\\ \\mathrm N`);
    }
    const m = R.mag, F = R.total;
    const ang = F.map((c) => (Math.acos(c / m) * 180) / Math.PI);
    html += tex(`\\vec F_{${t}}=${vec(F)}\\ \\mathrm N,\\qquad |\\vec F_{${t}}|=${fmt(m)}\\ \\mathrm N`);
    html += tex(`\\text{arah: }\\alpha_x=${ang[0].toFixed(1)}^\\circ,\\ \\alpha_y=${ang[1].toFixed(1)}^\\circ,\\ \\alpha_z=${ang[2].toFixed(1)}^\\circ` +
      (Math.abs(F[2]) < 1e-12 * m ? `,\\quad \\varphi_{xy}=${(((R.angleXY % 360) + 360) % 360).toFixed(1)}^\\circ` : ''));
    res.innerHTML = html;
  }

  $('#pr-preset').addEventListener('change', (e) => load(e.target.value));
  $('#pr-qu').addEventListener('change', compute);
  $('#pr-pu').addEventListener('change', compute);
  $('#pr-add').addEventListener('click', () => { rows.push([1, 1, 1, 1]); renderTable(); compute(); });
  tbody.addEventListener('input', (e) => {
    const { i, j } = e.target.dataset;
    if (i === undefined) return;
    rows[+i][+j] = +e.target.value || 0;
    compute();
  });
  tbody.addEventListener('change', (e) => { if (e.target.name === 'pr-t') { target = +e.target.value; compute(); } });
  tbody.addEventListener('click', (e) => {
    const d = e.target.dataset.del;
    if (d === undefined) return;
    rows.splice(+d, 1);
    if (target >= rows.length) target = 0;
    renderTable(); compute();
  });
  load('contoh');
}
