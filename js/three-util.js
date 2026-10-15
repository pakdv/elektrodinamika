// Scene Three.js bersama: sumbu z ke atas (konvensi fisika), OrbitControls, resize, pause saat tak terlihat.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function makeScene(simEl, { aspect = 0.68, maxH = 560, camPos = [5, -6, 4] } = {}) {
  const stage = simEl.querySelector('.stage');
  stage.querySelector('.loading')?.remove();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x0d1520);
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
  camera.up.set(0, 0, 1);
  camera.position.set(...camPos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(4, -3, 8);
  scene.add(sun);

  const resize = () => {
    const w = stage.clientWidth, h = Math.round(Math.min(maxH, Math.max(280, w * aspect)));
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(stage);

  const hooks = [];
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(simEl);
  renderer.setAnimationLoop((t) => {
    if (!visible) return;
    for (const f of hooks) f(t);
    controls.update();
    renderer.render(scene, camera);
  });
  return { THREE, scene, camera, renderer, controls, onFrame: (f) => hooks.push(f) };
}

// sumbu x (merah), y (hijau), z (biru) dengan label
export function axes(THREE, scene, len = 3) {
  const g = new THREE.Group();
  const mk = (dir, col, label) => {
    g.add(new THREE.ArrowHelper(new THREE.Vector3(...dir), new THREE.Vector3(), len, col, 0.18, 0.09));
    const s = textSprite(THREE, label, col);
    s.position.set(dir[0] * (len + 0.25), dir[1] * (len + 0.25), dir[2] * (len + 0.25));
    g.add(s);
  };
  mk([1, 0, 0], 0xff6b5e, 'x'); mk([0, 1, 0], 0x6fdc8c, 'y'); mk([0, 0, 1], 0x4ea8ff, 'z');
  scene.add(g);
  return g;
}

export function textSprite(THREE, text, color = 0xd7e4ef, size = 0.32) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = '500 40px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(size * 2, size, 1);
  return sp;
}

// hapus & buang isi grup
export function clearGroup(g) {
  for (const o of [...g.children]) {
    g.remove(o);
    o.traverse?.((c) => { c.geometry?.dispose(); if (c.material) [].concat(c.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
  }
}
