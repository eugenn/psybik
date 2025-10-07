// Main module for 3x3 Rubik's Cube web game
// - Renders a 3x3 cube using Three.js
// - Each face is a 3x3 slice of an image (with fallbacks)
// - Orbit with trackpad/mouse, face turns by dragging on stickers

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const appEl = document.getElementById('app');

// Scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1c);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(4.5, 3.5, 5.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
appEl.appendChild(renderer.domElement);

// Resize handling
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, true);
}
window.addEventListener('resize', onResize);
onResize();

// Lighting
scene.add(new THREE.AmbientLight(0x8893a6, 0.55));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(5, 8, 7);
dirLight.castShadow = false;
scene.add(dirLight);

// Orbit Controls (trackpad-friendly)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.9;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.8;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 30;

function fitCameraToObject(object3D, cam, ctrls, offset = 1.2) {
  const box = new THREE.Box3().setFromObject(object3D);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxSize = Math.max(size.x, size.y, size.z);
  const fitHeightDistance = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
  const fitWidthDistance = fitHeightDistance / cam.aspect;
  const distance = offset * Math.max(fitHeightDistance, fitWidthDistance);

  const direction = cam.position.clone().sub(ctrls.target).normalize();
  cam.position.copy(direction.multiplyScalar(distance).add(center));
  cam.near = Math.max(0.1, distance / 100);
  cam.far = Math.max(100, distance * 4);
  cam.updateProjectionMatrix();

  ctrls.target.copy(center);
  ctrls.minDistance = Math.max(1, distance * 0.6);
  ctrls.maxDistance = distance * 4;
  ctrls.update();
}

// Cube root group
const cubeRoot = new THREE.Group();
scene.add(cubeRoot);

// Face keys and default colors for fallbacks
const FACE_KEYS = ['U', 'D', 'L', 'R', 'F', 'B'];
const FACE_TO_INDEX = { R: 0, L: 1, U: 2, D: 3, F: 4, B: 5 }; // BoxGeometry material order
const FACE_DEFAULTS = {
  U: { color: '#ffffff', label: 'U' },
  D: { color: '#f2d22e', label: 'D' },
  L: { color: '#0bb04b', label: 'L' },
  R: { color: '#e23d2e', label: 'R' },
  F: { color: '#2e6de2', label: 'F' },
  B: { color: '#f29b2e', label: 'B' }
};

// Desired image paths; place custom images into ./assets as face-U.jpg, etc.
const FACE_IMAGES = {
  U: './assets/face-U.jpg',
  D: './assets/face-D.jpg',
  L: './assets/face-L.jpg',
  R: './assets/face-R.jpg',
  F: './assets/face-F.jpg',
  B: './assets/face-B.jpg'
};

const textureLoader = new THREE.TextureLoader();

// Use procedural fractal faces instead of loading images
const USE_FRACTAL_FACES = true;

// Distinct hues for each face (degrees 0-360)
const FACE_HUES = {
  U: 52,   // warm yellow
  D: 20,   // orange
  L: 135,  // green
  R: 0,    // red
  F: 220,  // blue
  B: 285   // purple
};

// Global abstract palette (four main colors)
const ABSTRACT_PALETTE = ['#e23d2e', '#2e6de2', '#0bb04b', '#f2d22e'];

function makeSeededRng(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  return function rnd() {
    seed = (1664525 * seed + 1013904223) >>> 0; // LCG
    return (seed >>> 0) / 4294967296;
  };
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function generateAbstractFaceTexture(faceKey, size = 768) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const rnd = makeSeededRng(`${faceKey}-${Date.now()}`);

  // Background
  ctx.fillStyle = '#0b0f1c';
  ctx.fillRect(0, 0, size, size);

  // Draw multiple soft radial gradients using 4-color palette
  ctx.globalCompositeOperation = 'lighter';
  const blobs = 26;
  for (let i = 0; i < blobs; i++) {
    const color = ABSTRACT_PALETTE[i % ABSTRACT_PALETTE.length];
    const cx = Math.floor(rnd() * size);
    const cy = Math.floor(rnd() * size);
    const r = Math.floor((0.15 + rnd() * 0.35) * size);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, hexToRgba(color, 0.85));
    g.addColorStop(1, hexToRgba(color, 0.0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Overlay a few translucent polygon shapes for structure
  ctx.globalCompositeOperation = 'source-over';
  const polys = 8;
  for (let p = 0; p < polys; p++) {
    const color = ABSTRACT_PALETTE[(p * 2 + 1) % ABSTRACT_PALETTE.length];
    ctx.fillStyle = hexToRgba(color, 0.16 + rnd() * 0.14);
    const count = 3 + Math.floor(rnd() * 5);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rnd() * size);
      const y = Math.floor(rnd() * size);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // 3x3 guide lines, subtle
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    const p = Math.floor((size * i) / 3);
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }

  // Face key label, subtle
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = 'bold 120px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(faceKey, size / 2, size / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hp && hp < 1) { r = c; g = x; b = 0; }
  else if (1 <= hp && hp < 2) { r = x; g = c; b = 0; }
  else if (2 <= hp && hp < 3) { r = 0; g = c; b = x; }
  else if (3 <= hp && hp < 4) { r = 0; g = x; b = c; }
  else if (4 <= hp && hp < 5) { r = x; g = 0; b = c; }
  else if (5 <= hp && hp < 6) { r = c; g = 0; b = x; }
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function mix(a, b, t) { return a + (b - a) * t; }

function makePsyPalette(baseHue, rnd) {
  // Build a psychedelic multi-hue gradient around baseHue
  const offsets = [0, 45, 120, 200, 280, 330];
  const stops = offsets.map((off, i) => {
    const h = (baseHue + off) % 360;
    const s = 0.75 + 0.2 * (rnd() - 0.5); // 0.65..0.85
    const l = 0.40 + 0.25 * (i % 2);      // alternate 0.40/0.65
    const [r, g, b] = hslToRgb(h, clamp01(s), clamp01(l));
    return { t: i / (offsets.length - 1), rgb: [r, g, b] };
  });
  return stops;
}

function samplePalette(stops, t) {
  if (t <= 0) return stops[0].rgb;
  if (t >= 1) return stops[stops.length - 1].rgb;
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      const tt = (t - stops[i].t) / (stops[i + 1].t - stops[i].t);
      const a = stops[i].rgb, b = stops[i + 1].rgb;
      return [
        Math.round(mix(a[0], b[0], tt)),
        Math.round(mix(a[1], b[1], tt)),
        Math.round(mix(a[2], b[2], tt))
      ];
    }
  }
  return stops[stops.length - 1].rgb;
}

function generateFractalFaceTexture(faceKey, size = 720) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;

  // Seeded randomness per face for variety
  const rnd = makeSeededRng(`fractal-${faceKey}`);
  const hue = FACE_HUES[faceKey] || 200;
  const palette = makePsyPalette(hue, rnd);

  // Choose a fractal type per face
  const types = ['julia2', 'multibrot3', 'burningship', 'mandelbrot'];
  const type = types[Math.floor(rnd() * types.length)];

  // Parameters
  const seeds = {
    U: { cr: -0.745, ci: 0.186 },
    D: { cr: -0.391, ci: -0.587 },
    L: { cr: 0.355, ci: 0.355 },
    R: { cr: -0.70176, ci: -0.3842 },
    F: { cr: -0.8, ci: 0.156 },
    B: { cr: 0.285, ci: 0.01 }
  };
  const { cr, ci } = seeds[faceKey] || seeds.F;
  const maxIter = 80;
  const zoom = 1.7; // view scale
  const cx = 0.0, cy = 0.0; // center

  let idx = 0;
  for (let y = 0; y < size; y++) {
    const py = (y - size / 2) / (size / (2 * zoom)) + cy;
    for (let x = 0; x < size; x++) {
      const px = (x - size / 2) / (size / (2 * zoom)) + cx;
      // Swirl transform for psychedelic feel
      const r2 = px * px + py * py;
      const a = 0.55 * r2;
      const cosA = Math.cos(a), sinA = Math.sin(a);
      let sx = px * cosA - py * sinA;
      let sy = px * sinA + py * cosA;

      let zx, zy, cx0, cy0;
      if (type === 'mandelbrot' || type === 'burningship' || type === 'multibrot3') {
        zx = 0; zy = 0; cx0 = sx; cy0 = sy;
      } else { // julia2
        zx = sx; zy = sy; cx0 = cr; cy0 = ci;
      }

      let i = 0;
      for (; i < maxIter; i++) {
        let nx, ny;
        if (type === 'burningship') {
          const ax = Math.abs(zx), ay = Math.abs(zy);
          nx = ax * ax - ay * ay + cx0;
          ny = 2 * ax * ay + cy0;
        } else if (type === 'multibrot3') {
          // z = z^3 + c
          const zx2 = zx * zx, zy2 = zy * zy;
          nx = zx * (zx2 - 3 * zy2) + cx0;
          ny = zy * (3 * zx2 - zy2) + cy0;
        } else { // mandelbrot or julia2 (z^2 + c)
          nx = zx * zx - zy * zy + cx0;
          ny = 2 * zx * zy + cy0;
        }
        zx = nx; zy = ny;
        if (zx * zx + zy * zy > 4.0) break;
      }

      // Smooth coloring t in [0,1]
      let t = i / maxIter;
      if (i < maxIter) {
        const mod2 = zx * zx + zy * zy;
        const logZn = Math.log(mod2) / 2;
        const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
        t = clamp01((i + 1 - nu) / maxIter);
      }

      // Psychedelic modulation by angle and radius
      const ang = Math.atan2(zy, zx);
      const wobble = 0.5 + 0.5 * Math.sin(6 * ang + 10 * t);
      const tt = clamp01(0.25 + 0.75 * (0.7 * t + 0.3 * wobble));
      const [r8, g8, b8] = samplePalette(palette, tt);

      data[idx++] = r8;
      data[idx++] = g8;
      data[idx++] = b8;
      data[idx++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 3; i++) {
    const p = Math.floor((size * i) / 3);
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

async function loadBaseTextureForFace(faceKey) {
  if (USE_FRACTAL_FACES) {
    return generateFractalFaceTexture(faceKey);
  }
  const url = FACE_IMAGES[faceKey];
  try {
    const tex = await new Promise((resolve, reject) => {
      textureLoader.load(
        url,
        t => resolve(t),
        undefined,
        () => reject(new Error('load-failed'))
      );
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  } catch (e) {
    // Fallback: generate an abstract image using 4 colors
    return generateAbstractFaceTexture(faceKey);
  }
}

function makeStickerTextureFromBase(baseTexture, col, row) {
  // col,row in [0..2], origin bottom-left
  const tex = baseTexture.clone();
  tex.needsUpdate = true;
  tex.offset = new THREE.Vector2(col / 3, row / 3);
  tex.repeat = new THREE.Vector2(1 / 3, 1 / 3);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function roundedIndex(value) {
  // Round position coordinate to -1, 0, or 1
  const v = Math.round(value);
  if (v < -1) return -1;
  if (v > 1) return 1;
  return v;
}

function axisOfVector(v) {
  const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
  if (ax > ay && ax > az) return 'x';
  if (ay > ax && ay > az) return 'y';
  return 'z';
}

function signOfAxis(v, axis) {
  return Math.sign(v[axis]) || 1;
}

function vectorForAxis(axis, sign) {
  if (axis === 'x') return new THREE.Vector3(sign, 0, 0);
  if (axis === 'y') return new THREE.Vector3(0, sign, 0);
  return new THREE.Vector3(0, 0, sign);
}

// Build cube and interactions
(async function init() {
  const baseTextures = {
    U: await loadBaseTextureForFace('U'),
    D: await loadBaseTextureForFace('D'),
    L: await loadBaseTextureForFace('L'),
    R: await loadBaseTextureForFace('R'),
    F: await loadBaseTextureForFace('F'),
    B: await loadBaseTextureForFace('B')
  };

  let cubelets = [];
  const size = 0.98; // slightly smaller for visible gaps
  const geom = new THREE.BoxGeometry(size, size, size);
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });

  function buildSolvedCube() {
    // Remove existing
    for (const c of cubelets) {
      cubeRoot.remove(c);
      if (Array.isArray(c.material)) {
        for (const m of c.material) {
          if (m && m.map) m.map.dispose?.();
          m.dispose?.();
        }
      } else {
        if (c.material && c.material.map) c.material.map.dispose?.();
        c.material?.dispose?.();
      }
      c.geometry?.dispose?.();
    }
    cubelets = [];

    for (let xi = -1; xi <= 1; xi++) {
      for (let yi = -1; yi <= 1; yi++) {
        for (let zi = -1; zi <= 1; zi++) {
          const materials = new Array(6).fill(innerMat);

          // faceIndex mapping: 0:+X(R), 1:-X(L), 2:+Y(U), 3:-Y(D), 4:+Z(F), 5:-Z(B)
          function setSticker(faceIndex, faceKey, col, row) {
            const base = baseTextures[faceKey];
            const tex = makeStickerTextureFromBase(base, col, row);
            const mat = new THREE.MeshBasicMaterial({ map: tex });
            materials[faceIndex] = mat;
          }

          // Only assign sticker if cubelet is on that outer face
          if (zi === 1) {
            const col = xi + 1; // left->right
            const row = yi + 1; // bottom->top
            setSticker(FACE_TO_INDEX.F, 'F', col, row);
          }
          if (zi === -1) {
            const col = (-xi) + 1; // right-to-left
            const row = yi + 1;
            setSticker(FACE_TO_INDEX.B, 'B', col, row);
          }
          if (xi === 1) {
            const col = (-zi) + 1; // right->left as z increases
            const row = yi + 1;
            setSticker(FACE_TO_INDEX.R, 'R', col, row);
          }
          if (xi === -1) {
            const col = (zi) + 1; // left->right as z increases
            const row = yi + 1;
            setSticker(FACE_TO_INDEX.L, 'L', col, row);
          }
          if (yi === 1) {
            const col = xi + 1;
            const row = (-zi) + 1; // top face up-direction toward -Z
            setSticker(FACE_TO_INDEX.U, 'U', col, row);
          }
          if (yi === -1) {
            const col = xi + 1;
            const row = (zi) + 1; // bottom face up-direction toward +Z
            setSticker(FACE_TO_INDEX.D, 'D', col, row);
          }

          const mesh = new THREE.Mesh(geom, materials);
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.position.set(xi, yi, zi);
          mesh.userData.home = { x: xi, y: yi, z: zi };
          cubeRoot.add(mesh);
          cubelets.push(mesh);
        }
      }
    }
  }

  buildSolvedCube();
  fitCameraToObject(cubeRoot, camera, controls, 2.0);
  // Initialize UI state once scene is ready
  function noop() {}
  var updateSetupUI = noop, updateProgressUI = noop; // placeholders to be redefined later

  // Interaction state
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let isPointerDown = false;
  let dragInfo = null; // { normal, axis, sign, layer, plane, startPoint, uVec, vVec }
  let isTurning = false;
  const moveHistory = []; // { axis, sign, cw, quarters }
  let mode = 'idle'; // 'idle' | 'setup' | 'play'
  let setupCount = 0;
  const setupSequence = []; // auth sequence performed in setup

  function setPointerFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.set(x, y);
  }

  function pickCubelet(e) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(cubelets, false);
    return intersects[0] || null;
  }

  function computeFaceBasis(worldNormal) {
    // Compute orthonormal basis (u right, v up) for the face plane
    const up = new THREE.Vector3(0, 1, 0);
    let u = new THREE.Vector3().crossVectors(up, worldNormal);
    if (u.lengthSq() < 1e-6) {
      // Normal was colinear with up; use world right instead
      const right = new THREE.Vector3(1, 0, 0);
      u = new THREE.Vector3().crossVectors(right, worldNormal);
    }
    u.normalize();
    const v = new THREE.Vector3().crossVectors(worldNormal, u).normalize();
    return { u, v };
  }

  function planeIntersectionPoint(e, plane) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const out = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, out);
    return out;
  }

  function selectLayer(axis, sign) {
    const selected = [];
    for (const c of cubelets) {
      // Determine index along axis by rounding its position in cubeRoot space
      const v = c.position.clone();
      const idx = roundedIndex(v[axis]);
      if (idx === sign) selected.push(c);
    }
    return selected;
  }

  function attachPreserve(child, newParent) {
    newParent.attach(child);
  }

  function detachPreserve(child, newParent) {
    newParent.attach(child);
  }

  function snapToGrid(object) {
    object.position.set(
      Math.round(object.position.x),
      Math.round(object.position.y),
      Math.round(object.position.z)
    );
    object.updateMatrixWorld();
  }

  function animateTurn({ axis, sign, cw, quarters = 1, record = true }) {
    return new Promise(resolve => {
      if (isTurning) return resolve();
      isTurning = true;
      controls.enabled = false;

      const turnAxis = vectorForAxis(axis, sign); // world normal of face
      const group = new THREE.Group();
      cubeRoot.add(group);

      const layerCubelets = selectLayer(axis, sign);
      for (const c of layerCubelets) {
        attachPreserve(c, group);
      }

      const anglePerQuarter = Math.PI / 2;
      const targetAngle = (cw ? -anglePerQuarter : anglePerQuarter) * Math.max(1, quarters);
      const duration = 180 * Math.max(1, quarters); // ms
      const start = performance.now();

      const startQuat = group.quaternion.clone();
      const endQuat = startQuat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(turnAxis, targetAngle));

      function step(now) {
        const t = Math.min(1, (now - start) / duration);
        group.quaternion.slerpQuaternions(startQuat, endQuat, t);
        renderer.render(scene, camera);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          // Detach children back to cubeRoot and snap positions
          for (const c of [...group.children]) {
            detachPreserve(c, cubeRoot);
            snapToGrid(c);
          }
          cubeRoot.remove(group);
          if (record) {
            moveHistory.push({ axis, sign, cw, quarters });
            if (mode === 'setup') {
              setupCount += 1;
              setupSequence.push({ axis, sign, cw, quarters });
              updateSetupUI();
            }
            if (mode === 'play') {
              updateProgressUI();
            }
          }
          isTurning = false;
          controls.enabled = true;
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  function onPointerDown(e) {
    if (isTurning) return;
    const hit = pickCubelet(e);
    if (!hit) {
      isPointerDown = false;
      return;
    }
    isPointerDown = true;
    controls.enabled = false;

    const faceNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    const axis = axisOfVector(faceNormal);
    const sign = Math.sign(faceNormal[axis]) || 1;
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(faceNormal, hit.point.clone());
    const startPoint = planeIntersectionPoint(e, plane);
    const { u: uVec, v: vVec } = computeFaceBasis(faceNormal);

    dragInfo = { normal: faceNormal, axis, sign, plane, startPoint, uVec, vVec };
  }

  function onPointerMove(e) {
    if (!isPointerDown || !dragInfo || isTurning) return;
    // Optional: draw hover or preview; skipped for simplicity
  }

  async function onPointerUp(e) {
    if (!isPointerDown || !dragInfo) {
      controls.enabled = true;
      return;
    }
    isPointerDown = false;

    const { normal, axis, sign, plane, startPoint, uVec, vVec } = dragInfo;
    dragInfo = null;

    const endPoint = planeIntersectionPoint(e, plane);
    if (!endPoint || !startPoint) { controls.enabled = true; return; }
    const move = endPoint.clone().sub(startPoint);
    const du = move.dot(uVec);
    const dv = move.dot(vVec);

    const threshold = 0.18; // world units
    const adu = Math.abs(du);
    const adv = Math.abs(dv);
    if (Math.max(adu, adv) < threshold) {
      controls.enabled = true; // treat as click
      return;
    }

    let cw;
    if (adu >= adv) {
      // Drag along u (right/left) → clockwise if positive when looking along face normal
      cw = du > 0;
    } else {
      // Drag along v (up/down) → clockwise if negative (screen-space up is CCW)
      cw = dv < 0;
    }

    await animateTurn({ axis, sign, cw });
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointerleave', onPointerUp);

  function onDoubleClick(e) {
    if (isTurning) return;
    const hit = pickCubelet(e);
    if (!hit) return;
    const faceNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    const axis = axisOfVector(faceNormal);
    const sign = Math.sign(faceNormal[axis]) || 1;
    // 180° turn; direction is irrelevant for a half-turn
    animateTurn({ axis, sign, cw: true, quarters: 2 });
  }

  renderer.domElement.addEventListener('dblclick', onDoubleClick);

  // UI buttons
  const btnScramble = document.getElementById('btn-scramble');
  const btnReset = document.getElementById('btn-reset');
  const btnSetup = document.getElementById('btn-setup');
  const btnPlay = document.getElementById('btn-play');
  const setupCounterEl = document.getElementById('setup-count');
  const progressFill = document.querySelector('#progress-panel .fill');
  const progressValue = document.getElementById('progress-value');

  function computeCloseness() {
    // Fraction of non-core cubelets in their home position and orientation
    let correct = 0;
    let total = 0;
    for (const c of cubeRoot.children) {
      if (!(c instanceof THREE.Mesh)) continue;
      const home = c.userData.home;
      if (!home) continue;
      const isCore = home.x === 0 && home.y === 0 && home.z === 0;
      if (isCore) continue;
      total++;
      const posOk = Math.abs(c.position.x - home.x) < 1e-3 && Math.abs(c.position.y - home.y) < 1e-3 && Math.abs(c.position.z - home.z) < 1e-3;
      const xAxis = new THREE.Vector3(1,0,0).applyQuaternion(c.quaternion);
      const yAxis = new THREE.Vector3(0,1,0).applyQuaternion(c.quaternion);
      const zAxis = new THREE.Vector3(0,0,1).applyQuaternion(c.quaternion);
      const aligned = (Math.abs(Math.abs(xAxis.x) - 1) < 1e-3 || Math.abs(Math.abs(xAxis.y) - 1) < 1e-3 || Math.abs(Math.abs(xAxis.z) - 1) < 1e-3) &&
                      (Math.abs(Math.abs(yAxis.x) - 1) < 1e-3 || Math.abs(Math.abs(yAxis.y) - 1) < 1e-3 || Math.abs(Math.abs(yAxis.z) - 1) < 1e-3) &&
                      (Math.abs(Math.abs(zAxis.x) - 1) < 1e-3 || Math.abs(Math.abs(zAxis.y) - 1) < 1e-3 || Math.abs(Math.abs(zAxis.z) - 1) < 1e-3);
      if (posOk && aligned) correct++;
    }
    if (total === 0) return 1;
    return Math.max(0, Math.min(1, correct / total));
  }

  updateSetupUI = function updateSetupUIImpl() {
    if (!setupCounterEl) return;
    if (mode === 'setup') {
      setupCounterEl.textContent = `Setup moves: ${setupCount}`;
    } else {
      setupCounterEl.textContent = '';
    }
  };

  updateProgressUI = function updateProgressUIImpl() {
    if (!progressFill) return;
    const p = mode === 'play' ? computeCloseness() : 0;
    const pct = Math.round(p * 100);
    progressFill.style.width = `${pct}%`;
    if (progressValue) progressValue.textContent = `${pct}%`;
  };

  btnScramble.addEventListener('click', async () => {
    if (isTurning) return;
    controls.enabled = false;
    const faces = [
      { axis: 'x', sign: 1 }, { axis: 'x', sign: -1 },
      { axis: 'y', sign: 1 }, { axis: 'y', sign: -1 },
      { axis: 'z', sign: 1 }, { axis: 'z', sign: -1 }
    ];
    const n = 20;
    moveHistory.length = 0;
    for (let i = 0; i < n; i++) {
      const f = faces[Math.floor(Math.random() * faces.length)];
      const cw = Math.random() < 0.5;
      // Avoid immediate opposite turns for nicer sequence
      // eslint-disable-next-line no-await-in-loop
      await animateTurn({ axis: f.axis, sign: f.sign, cw });
    }
    controls.enabled = true;
    if (mode === 'play') updateProgressUI();
  });

  btnReset.addEventListener('click', async () => {
    if (isTurning) return;
    controls.enabled = false;
    buildSolvedCube();
    moveHistory.length = 0;
    controls.enabled = true;
    setupCount = 0; setupSequence.length = 0; updateSetupUI(); updateProgressUI();
  });

  const btnSolve = document.getElementById('btn-solve');
  btnSolve.addEventListener('click', async () => {
    if (isTurning || moveHistory.length === 0) return;
    controls.enabled = false;
    // Ensure progress bar reflects assembly progress
    mode = 'play';
    updateProgressUI();
    // Replay inverse moves
    for (let i = moveHistory.length - 1; i >= 0; i--) {
      const m = moveHistory[i];
      const inverse = { axis: m.axis, sign: m.sign, cw: !m.cw, quarters: m.quarters, record: false };
      // eslint-disable-next-line no-await-in-loop
      await animateTurn(inverse);
      // Update closeness after each animated step
      updateProgressUI();
    }
    moveHistory.length = 0;
    controls.enabled = true;
    updateProgressUI();
  });

  // Mode toggles
  if (btnSetup) {
    btnSetup.addEventListener('click', () => {
      if (isTurning) return;
      if (mode !== 'setup') {
        mode = 'setup';
        btnSetup.textContent = 'Stop';
        setupCount = 0; setupSequence.length = 0; moveHistory.length = 0;
        updateSetupUI();
      } else {
        mode = 'idle';
        btnSetup.textContent = 'Start';
        updateSetupUI();
      }
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      if (isTurning) return;
      mode = 'play';
      updateProgressUI();
    });
  }

  // Initial UI
  updateSetupUI();
  updateProgressUI();

  // Initial render loop
  function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();


