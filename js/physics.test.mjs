// Jalankan: node web/js/physics.test.mjs
import assert from 'node:assert/strict';
import * as P from './physics.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.abs(b), `${msg}: ${a} vs ${b}`);

// Biot-Savart: pusat loop = μ0 I / 2R, sumbu sesuai analitik
close(P.pathB(P.loopPath(0.1, 0, 360), 2, [0, 0, 0])[2], (P.MU0 * 2) / 0.2, 1e-3, 'loop center');
close(P.pathB(P.loopPath(0.1, 0, 360), 2, [0, 0, 0.1])[2], P.loopAxisB(2, 0.1, 0.1), 1e-3, 'loop axis');
// kawat panjang
close(P.norm(P.segmentB([0, 0, -1e3], [0, 0, 1e3], 3, [0.05, 0, 0])), P.wireB(3, 0.05), 1e-6, 'long wire');
// solenoida panjang: pusat ≈ μ0 N I / L
close(P.solenoidAxisB(1, 0.01, 1, 1000, 0.5), (P.MU0 * 1000) / 1, 1e-3, 'solenoid');
close(P.pathB(P.solenoidPath(0.02, 0.5, 200), 1, [0, 0, 0])[2], P.solenoidAxisB(1, 0.02, 0.5, 200, 0.25), 1e-2, 'solenoid numeric');
// Helmholtz: turunan kedua di tengah = 0 saat d = R
const h = 1e-3, R = 0.1;
const d2 = (P.helmholtzB(1, R, R, h) - 2 * P.helmholtzB(1, R, R, 0) + P.helmholtzB(1, R, R, -h)) / (h * h);
assert.ok(Math.abs((d2 * R * R) / P.helmholtzB(1, R, R, 0)) < 1e-3, 'helmholtz flat');
const d2off = (P.helmholtzB(1, R, 2 * R, h) - 2 * P.helmholtzB(1, R, 2 * R, 0) + P.helmholtzB(1, R, 2 * R, -h)) / (h * h);
assert.ok(Math.abs((d2off * R * R) / P.helmholtzB(1, R, 2 * R, 0)) > 0.1, 'helmholtz tidak datar saat d = 2R');
// Tugas: Neumann numerik → aproksimasi dipol untuk r ≫ a,b (tanda negatif)
const Mn = P.mutualNeumann(0.01, 0.015, 0.4), Md = P.mutualDipole(0.01, 0.015, 0.4);
assert.ok(Mn < 0, 'M negatif');
close(Mn, Md, 0.02, 'neumann vs dipol');
close(P.loopBzInPlane(0.01, 1, 0.4, 0), -(P.MU0 * 1 * 0.01 ** 2) / (4 * 0.4 ** 3), 0.01, 'B1 in-plane');
// Coulomb contoh slide 7: arah 151.3°
const a = 0.02, ex = P.coulombSteps({ q: 3e-6, pos: [a, a, 0] }, [{ q: 6e-6, pos: [0, 0, 0] }, { q: -6e-6, pos: [0, a, 0] }]);
close(ex.angleXY, 151.3, 1e-3, 'coulomb angle');
// Legendre
close(P.legendre(2, 0.5), -0.125, 1e-12, 'P2');
close(P.legendre(3, 0.5), -0.4375, 1e-12, 'P3');
// Multipol: jumlah suku → potensial eksak (dipol, r = 5a)
const dip = [{ q: 1, z: 0.1 }, { q: -1, z: -0.1 }];
close(P.multipoleTerms(dip, 0.5, 0.7, 12).reduce((s, t) => s + t, 0), P.axisChargesV(dip, 0.5, 0.7), 1e-6, 'multipole sum');
// Laplace: deret Fourier → bentuk tertutup
close(P.slotV(0.3, 0.4, 1, 1, 400), P.slotVExact(0.3, 0.4, 1, 1), 1e-6, 'slot series');
// Bayangan bola: V = 0 di permukaan
const im = P.sphereImage(1, 2, 1);
for (const t of [0, 1, 2.5]) {
  const x = Math.cos(t), y = Math.sin(t);
  assert.ok(Math.abs(1 / Math.hypot(x - 2, y) + im.q / Math.hypot(x - im.b, y)) < 1e-12, 'sphere V=0');
}
// Bayangan bidang: total muatan induksi = -q (integrasi polar)
let Qi = 0;
for (let r = 0.0005; r < 2000; r *= 1.001) Qi += P.planeSigma(r, 0, 1, 1) * 2 * Math.PI * r * (r * 0.001);
close(Qi, -1, 2e-3, 'induced charge');
console.log('physics: semua tes lulus');
