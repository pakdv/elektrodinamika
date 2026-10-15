// Render rumus, sorot daftar isi, muat simulasi saat mendekati layar (lazy import).
function renderMath() {
  if (!window.renderMathInElement) return setTimeout(renderMath, 50);
  window.renderMathInElement(document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    ignoredClasses: ['stage', 'controls', 'readout'],
    throwOnError: false,
  });
}
renderMath();

const simIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    simIO.unobserve(e.target);
    const el = e.target, name = el.dataset.sim;
    import(`./sims/${name}.js`)
      .then((m) => m.default(el))
      .catch((err) => {
        console.error(err);
        el.querySelector('.stage, .wrap').innerHTML = `<div class="err">Simulasi gagal dimuat: ${err.message}</div>`;
      });
  }
}, { rootMargin: '300px 0px' });
document.querySelectorAll('[data-sim]').forEach((el) => simIO.observe(el));

// sorot bagian aktif di daftar isi
const links = [...document.querySelectorAll('nav.toc a')];
const targets = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const tocIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const id = '#' + e.target.id;
    links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === id));
  }
}, { rootMargin: '0px 0px -70% 0px' });
targets.forEach((t) => tocIO.observe(t));
