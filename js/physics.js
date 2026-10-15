// Fungsi fisika murni (tanpa DOM). Dipakai simulasi dan diuji di physics.test.mjs.
export const MU0 = 4e-7 * Math.PI;
export const K_E = 8.9875517923e9; // 1/(4πε0)

// ---------- vektor 3D [x,y,z] ----------
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => Math.hypot(a[0], a[1], a[2]);

// ---------- Coulomb (SI) ----------
// target {q,pos}, sources [{q,pos}] → langkah per pasangan + total
export function coulombSteps(target, sources) {
  const steps = sources.map((s) => {
    const rv = sub(target.pos, s.pos);
    const r = norm(rv);
    const F = scale(rv, (K_E * target.q * s.q) / r ** 3);
    return { src: s, rv, r, F };
  });
  const total = steps.reduce((acc, s) => add(acc, s.F), [0, 0, 0]);
  return { steps, total, mag: norm(total), angleXY: (Math.atan2(total[1], total[0]) * 180) / Math.PI };
}

// ---------- medan 2D ternormalisasi (k = 1) ----------
export function field2D(x, y, charges, soft = 1e-4) {
  let ex = 0, ey = 0, v = 0;
  for (const c of charges) {
    const dx = x - c.x, dy = y - c.y;
    const r2 = dx * dx + dy * dy + soft;
    const r = Math.sqrt(r2);
    ex += (c.q * dx) / (r2 * r);
    ey += (c.q * dy) / (r2 * r);
    v += c.q / r;
  }
  return { ex, ey, v };
}

// ---------- Laplace: celah dua pelat (separasi variabel) ----------
// V(x,y) = 4V0/π Σ_{n ganjil} (1/n) e^{-nπx/a} sin(nπy/a), nTerms = jumlah suku ganjil
export function slotV(x, y, a, V0, nTerms) {
  let s = 0;
  for (let k = 0; k < nTerms; k++) {
    const n = 2 * k + 1;
    s += (Math.exp((-n * Math.PI * x) / a) * Math.sin((n * Math.PI * y) / a)) / n;
  }
  return ((4 * V0) / Math.PI) * s;
}
// bentuk tertutup jumlah tak hingga (Griffiths 3.39)
export const slotVExact = (x, y, a, V0) =>
  ((2 * V0) / Math.PI) * Math.atan(Math.sin((Math.PI * y) / a) / Math.sinh((Math.PI * x) / a));

// satu sapuan Gauss-Seidel; fixed[i] = true → nilai syarat batas. Return perubahan maksimum.
export function relaxSweep(V, fixed, w, h) {
  let maxd = 0;
  for (let j = 1; j < h - 1; j++)
    for (let i = 1; i < w - 1; i++) {
      const k = j * w + i;
      if (fixed[k]) continue;
      const nv = 0.25 * (V[k - 1] + V[k + 1] + V[k - w] + V[k + w]);
      const d = Math.abs(nv - V[k]);
      if (d > maxd) maxd = d;
      V[k] = nv;
    }
  return maxd;
}

// ---------- Legendre & ekspansi multipol ----------
export function legendre(n, x) {
  if (n === 0) return 1;
  let p0 = 1, p1 = x;
  for (let k = 2; k <= n; k++) [p0, p1] = [p1, ((2 * k - 1) * x * p1 - (k - 1) * p0) / k];
  return p1;
}
// muatan pada sumbu z: [{q,z}]. Suku ke-n: Σ q z^n P_n(cosθ) / r^{n+1}  (k = 1)
export function multipoleTerms(charges, r, theta, L) {
  const c = Math.cos(theta), out = [];
  for (let n = 0; n <= L; n++) {
    let m = 0;
    for (const q of charges) m += q.q * q.z ** n;
    out.push((m * legendre(n, c)) / r ** (n + 1));
  }
  return out;
}
export function axisChargesV(charges, r, theta) {
  const x = r * Math.sin(theta), z = r * Math.cos(theta);
  return charges.reduce((s, q) => s + q.q / Math.hypot(x, z - q.z), 0);
}
export function moments(charges) {
  // monopol Q, dipol p_z, kuadrupol Q_zz = Σ q (3z² - z²)/2 → Σ q z² (pada sumbu)
  return {
    Q: charges.reduce((s, q) => s + q.q, 0),
    p: charges.reduce((s, q) => s + q.q * q.z, 0),
    Qzz: charges.reduce((s, q) => s + q.q * q.z * q.z, 0),
  };
}

// ---------- metode bayangan ----------
export const planeSigma = (x, y, q, d) => (-q * d) / (2 * Math.PI * (x * x + y * y + d * d) ** 1.5);
// bola dibumikan jari-jari R, muatan q di jarak a dari pusat
export const sphereImage = (q, a, R) => ({ q: (-q * R) / a, b: (R * R) / a });

// ---------- dielektrik ----------
// sudut terhadap normal (rad): tanθ2 / tanθ1 = ε2 / ε1 (σ_bebas = 0)
export const refractE = (theta1, e1, e2) => Math.atan((e2 / e1) * Math.tan(theta1));

// ---------- Biot-Savart (SI) ----------
// medan dari ruas lurus A→B, eksak (rumus ruas berhingga)
export function segmentB(A, B, I, P) {
  const L = sub(B, A), R1 = sub(P, A), R2 = sub(P, B);
  const c = cross(L, R1);
  const c2 = dot(c, c);
  const n1 = norm(R1), n2 = norm(R2);
  if (c2 < 1e-18 * dot(L, L) || n1 < 1e-12 || n2 < 1e-12) return [0, 0, 0];
  const f = ((MU0 * I) / (4 * Math.PI)) * (dot(L, R1) / n1 - dot(L, R2) / n2) / c2;
  return scale(c, f);
}
export function pathB(path, I, P) {
  let b = [0, 0, 0];
  for (let i = 0; i < path.length - 1; i++) b = add(b, segmentB(path[i], path[i + 1], I, P));
  return b;
}
// loop di bidang z = z0, berlawanan jarum jam dilihat dari +z (normal +z)
export function loopPath(R, z0 = 0, n = 72, cx = 0, cy = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n;
    pts.push([cx + R * Math.cos(t), cy + R * Math.sin(t), z0]);
  }
  return pts;
}
export function solenoidPath(R, L, turns, perTurn = 36) {
  const pts = [], n = turns * perTurn;
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / perTurn;
    pts.push([R * Math.cos(t), R * Math.sin(t), -L / 2 + (L * i) / n]);
  }
  return pts;
}
export const loopAxisB = (I, R, z, N = 1) => (MU0 * N * I * R * R) / (2 * (R * R + z * z) ** 1.5);
export const helmholtzB = (I, R, d, z, N = 1) => loopAxisB(I, R, z - d / 2, N) + loopAxisB(I, R, z + d / 2, N);
// solenoida N lilitan, panjang L, di sumbu pada z0 diukur dari ujung (0..L)
export const solenoidAxisB = (I, R, L, N, z0) =>
  ((MU0 * N * I) / (2 * L)) * ((L - z0) / Math.hypot(L - z0, R) + z0 / Math.hypot(z0, R));
export const wireB = (I, a) => (MU0 * I) / (2 * Math.PI * a);

// ---------- tugas: dua loop sebidang ----------
// induktansi silang via rumus Neumann: M = μ0/4π ∮∮ dl1·dl2 / |r1 - r2|
export function mutualNeumann(a, b, r, n = 240) {
  let s = 0;
  const d = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * d, ct = Math.cos(t), st = Math.sin(t);
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) * d, cu = Math.cos(u), su = Math.sin(u);
      const dx = a * ct - (r + b * cu), dy = a * st - b * su;
      s += (ct * cu + st * su) / Math.hypot(dx, dy); // dl1·dl2 = ab cos(t-u) dt du
    }
  }
  return (MU0 / (4 * Math.PI)) * s * a * b * d * d;
}
export const mutualDipole = (a, b, r) => (-MU0 * Math.PI * a * a * b * b) / (4 * r ** 3);
// B_z loop-1 (pusat di asal, bidang z=0) pada titik sebidang (x,y): eksak numerik
export const loopBzInPlane = (a, I, x, y, n = 180) => pathB(loopPath(a, 0, n), I, [x, y, 0])[2];
