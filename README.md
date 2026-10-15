# Elektrodinamika Interaktif

Materi kuliah elektrodinamika (S2 Fisika) dalam bentuk web interaktif: ringkasan rumus + 15 simulasi.

| Bab | Isi | Simulasi |
|---|---|---|
| 1 | Sistem koordinat, divergensi/curl, delta Dirac | elemen volume 3D (three.js), fluks & sirkulasi |
| 2 | Coulomb, superposisi, Gauss, potensial & energi | lab muatan titik, kalkulator PR, permukaan Gauss |
| 3 | Laplace, separasi variabel, metode bayangan | relaksasi, deret Fourier, muatan bayangan |
| 4 | Dipol, ekspansi multipol, dielektrik | dipol dalam medan, multipol vs eksak, syarat batas |
| 5 | Biot-Savart, Helmholtz, solenoida | integrasi kawat, garis medan 3D (three.js), profil sumbu |
| 6 | Tugas: dua loop kecil sebidang | eksak (Neumann) vs pendekatan dipol |

## Menjalankan lokal

```bash
python3 -m http.server 8000
```

Buka http://localhost:8000. (Perlu server karena memakai ES modules.)

## Tes fisika

```bash
node js/physics.test.mjs
```

## Deploy GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.

Library dari CDN: p5.js 1.9.4, three.js 0.160, KaTeX 0.16.9.
