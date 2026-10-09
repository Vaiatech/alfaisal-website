import * as THREE from 'three';
import { vert, frag } from './shaders';
import { FOV, LOGO_H, LOGO_W, worldPerPixel, type V3 } from './math';
export type { V3 } from './math';

export type Stroke = { d: string; w: number; l: number };
export type Frame = {
  seq: number; // position along SEQ
  cam: V3;
  look: V3;
  spread: number;
  turb: number;
  mouseK: number;
  write: number;
  rot: number;
  gain: number;
  par: number;
  near: number;
  far: number;
};

/** The journey of the particles, in scroll order: signature → knot → line → number → air → line → air → line to the horizon → signature */
export const SEQ = [0, 1, 2, 3, 4, 2, 4, 2, 0];
const TR = 4.3;
const PATH_L = 22;
const NODES = 11;
const LA: V3[] = [[2, 3, 0], [3, 2, 0], [2, 5, 0], [3, 4, 0], [1, 3, 0], [3, 5, 0], [2, 7, 0]];
const RM = LA.map((_, i) => new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(i * 1.13 + 0.4, i * 2.07 + 0.9, i * 0.61))));
const LP: V3[] = LA.map((_, i) => [i * 1.7 + 0.3, i * 2.3 + 1.1, i * 0.9 + 2.0]);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function pathBase(x: number): V3 {
  return [x, 0.55 * Math.sin(x * 0.35 + 0.4), 0.9 * Math.sin(x * 0.21)];
}
export function tanglePoint(k: number, tt: number, time: number, rot: number): V3 {
  const t = tt * Math.PI * 2 + time * 0.045;
  const [P, Q] = LA[k];
  const r = 1 + 0.4 * Math.cos(Q * t);
  const v = new THREE.Vector3(r * Math.cos(P * t), r * Math.sin(P * t), 0.5 * Math.sin(Q * t)).multiplyScalar(TR * 0.68).applyMatrix3(RM[k]);
  const a = rot + time * 0.03, c = Math.cos(a), s = Math.sin(a);
  // GLSL mat2(c,-s,s,c) * v  (column-major) → (c*x + s*z, -s*x + c*z)
  return [c * v.x + s * v.z, v.y, -s * v.x + c * v.z];
}

async function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  return img;
}

type Opts = { mobile: boolean; strokes: Stroke[]; onProgress: (p: number) => void };

export async function createStage(canvas: HTMLCanvasElement, opts: Opts) {
  const { mobile } = opts;
  const step = (p: number) => opts.onProgress(p);
  const tick = () => new Promise((r) => requestAnimationFrame(() => r(null)));

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const maxDpr = mobile ? 1.5 : 1.6;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  step(0.12);
  await tick();

  // ── Sample the signature ───────────────────────────────────────────────
  const COUNT = mobile ? 26000 : 74000;
  const S = mobile ? 0.9 : 1.25;
  const CW = Math.round(830 * S), CH = Math.round(835 * S);
  const d = (id: string) => document.getElementById(id)!.getAttribute('d');
  const idSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 -10 830 835" width="${CW}" height="${CH}"><path d="${d('lg-calligraphy')}" fill="#f00"/><path d="${d('lg-scale')}" fill="#00f"/><path d="${d('lg-pen')}" fill="#0f0"/><path d="${d('lg-penband')}" fill="#fff"/></svg>`;
  const img = await loadSvgImage(idSvg);
  step(0.3);
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  cx.drawImage(img, 0, 0, CW, CH);
  const idData = cx.getImageData(0, 0, CW, CH).data;

  // writing-time map: every stroke drawn in order, colour = normalised time
  cx.clearRect(0, 0, CW, CH);
  cx.save();
  cx.scale(S, S);
  cx.translate(-100, 10);
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  const total = opts.strokes.reduce((a, s) => a + s.l, 0);
  let cum = 0;
  for (const s of opts.strokes) {
    const pts = s.d.replace(/[ML]/g, ' ').trim().split(/\s+/).map(Number);
    let acc = 0;
    cx.lineWidth = s.w * 1.3;
    for (let i = 2; i < pts.length; i += 2) {
      const x0 = pts[i - 2], y0 = pts[i - 1], x1 = pts[i], y1 = pts[i + 1];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      const v = Math.floor(((cum + acc) / total) * 65535);
      cx.strokeStyle = `rgb(${v >> 8},${v & 255},0)`;
      cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke();
      acc += seg;
    }
    cum += s.l;
  }
  cx.restore();
  const tData = cx.getImageData(0, 0, CW, CH).data;
  step(0.42);
  await tick();

  const filled: number[] = [];
  for (let i = 0, n = CW * CH; i < n; i++) if (idData[i * 4 + 3] > 140) filled.push(i);

  const readT = (px: number, py: number) => {
    for (let r = 0; r <= 10; r += 2) {
      for (let a = 0; a < (r ? 8 : 1); a++) {
        const qx = Math.round(px + Math.cos((a / 8) * Math.PI * 2) * r), qy = Math.round(py + Math.sin((a / 8) * Math.PI * 2) * r);
        if (qx < 0 || qy < 0 || qx >= CW || qy >= CH) continue;
        const j = (qy * CW + qx) * 4;
        if (tData[j + 3] === 255) return ((tData[j] << 8) | tData[j + 1]) / 65535;
      }
    }
    return -1;
  };

  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const num = new Float32Array(COUNT * 4);
  const dust = new Float32Array(COUNT * 3);
  const rnd = new Float32Array(COUNT * 4);
  const meta = new Float32Array(COUNT * 4);
  const cTop = new THREE.Color('#f0d391'), cBot = new THREE.Color('#a87b2a'), cPen = new THREE.Color('#efe4d0'), cBand = new THREE.Color('#c48d2e'), cScale = new THREE.Color('#d6ad5e');
  const tmp = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const pi = filled[(Math.random() * filled.length) | 0];
    const px = pi % CW, py = (pi / CW) | 0;
    const j = pi * 4;
    const r = idData[j], g = idData[j + 1], b = idData[j + 2];
    const fx = (px + Math.random()) / CW, fy = (py + Math.random()) / CH;
    let part = 0; // 0 calligraphy, 1 pen, 2 scale, 3 band
    if (r > 180 && g > 180 && b > 180) part = 3;
    else if (g >= r && g >= b) part = 1;
    else if (b >= r && b >= g) part = 2;
    let wt: number;
    if (part === 0) {
      const t = readT(px, py);
      wt = (t < 0 ? 0.3 + Math.random() * 0.5 : t) * 0.78;
      tmp.copy(cTop).lerp(cBot, Math.min(1, fy * 1.15 + (Math.random() - 0.5) * 0.12));
    } else if (part === 1) {
      wt = 0.79 + (fy * 0.95) * 0.12;
      tmp.copy(cPen).multiplyScalar(0.82);
    } else if (part === 3) {
      wt = 0.86 + Math.random() * 0.02;
      tmp.copy(cBand);
    } else {
      wt = 0.9 + fy * 0.3;
      tmp.copy(cScale);
    }
    const thick = part === 0 ? 0.32 : 0.14;
    pos[i * 3] = (fx - 0.5) * LOGO_W;
    pos[i * 3 + 1] = -(fy - 0.5) * LOGO_H;
    pos[i * 3 + 2] = (Math.random() - 0.5) * thick;
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    dust[i * 3] = (Math.random() - 0.5) * 34;
    dust[i * 3 + 1] = (Math.random() - 0.5) * 24;
    dust[i * 3 + 2] = (Math.random() - 0.5) * 26;
    rnd[i * 4] = Math.random(); rnd[i * 4 + 1] = Math.random(); rnd[i * 4 + 2] = Math.random(); rnd[i * 4 + 3] = Math.random();
    meta[i * 4] = Math.floor(Math.random() * 7);
    meta[i * 4 + 1] = Math.random();
    meta[i * 4 + 2] = Math.min(wt, 0.999);
    meta[i * 4 + 3] = 0.62 + Math.pow(Math.random(), 4) * 1.0;
    num[i * 4 + 3] = 1;
  }
  step(0.55);
  await tick();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const numAttr = new THREE.BufferAttribute(num, 4);
  geo.setAttribute('aNum', numAttr);
  geo.setAttribute('aDust', new THREE.BufferAttribute(dust, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
  geo.setAttribute('aMeta', new THREE.BufferAttribute(meta, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const u = {
    uTime: { value: 0 }, uFrom: { value: 0 }, uTo: { value: 0 }, uMix: { value: 0 },
    uSpread: { value: 0.3 }, uTurb: { value: 0 }, uSize: { value: mobile ? 23 : 23 }, uPx: { value: 1 },
    uGain: { value: 0 }, uWrite: { value: 1 }, uMouseK: { value: 0 }, uFocus: { value: 18 }, uDof: { value: 0.035 },
    uRot: { value: 0 }, uNear: { value: 9 }, uFar: { value: 400 }, uTR: { value: TR }, uPathL: { value: PATH_L }, uNodes: { value: NODES },
    uMouse: { value: new THREE.Vector3(99, 99, 0) }, uMouseVel: { value: new THREE.Vector3() }, uDustC: { value: new THREE.Vector3() },
    uLA: { value: LA.map((a) => new THREE.Vector3(...a)) }, uLP: { value: LP.map((a) => new THREE.Vector3(...a)) }, uRM: { value: RM },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, uniforms: u, transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 2;
  scene.add(points);
  step(0.68);
  await tick();

  // compile everything once, behind the loader
  renderer.compile(scene, camera);
  step(0.94);

  // ── State ─────────────────────────────────────────────────────────────
  const cur: Frame = { seq: 0, cam: [0, 0, 20], look: [0, 0, 0], spread: 0.3, turb: 0, mouseK: 0, write: 1, rot: 0, gain: 0, par: 1, near: 9, far: 400 };
  let target: Frame = { ...cur, cam: [...cur.cam] as V3, look: [...cur.look] as V3 };
  const mouse = { x: 0, y: 0, active: false };
  const mWorld = new THREE.Vector3(99, 99, 0), mPrev = new THREE.Vector3(99, 99, 0), mVel = new THREE.Vector3();
  let vw = 1, vh = 1, time = 0, running = true;
  const words: { el: HTMLElement; w: number; h: number; tK: number; tT: number; path: V3 }[] = [];
  let introGain = 0, wordVis = 0;
  // adaptive quality
  let ftAcc = 0, ftN = 0, quality = 1, drewEmpty = false;

  function resize() {
    vw = document.documentElement.clientWidth || window.innerWidth; vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    u.uPx.value = dpr * Math.min(1.25, Math.max(0.7, vh / 900));
  }
  resize();

  const seqState = (s: number) => {
    const i = Math.max(0, Math.min(SEQ.length - 1, Math.floor(s)));
    const j = Math.min(SEQ.length - 1, i + 1);
    return { from: SEQ[i], to: SEQ[j], mix: s - i };
  };

  const v = new THREE.Vector3();
  function project(p: V3) {
    v.set(p[0], p[1], p[2]).project(camera);
    return { x: (v.x * 0.5 + 0.5) * vw, y: (-v.y * 0.5 + 0.5) * vh, z: v.z };
  }

  const wpos: { x: number; y: number; s: number }[] = [];
  function updateWords() {
    if (!words.length) return;
    const pts: { x: number; y: number; s: number; o: number }[] = [];
    // morph between knot (seq 1) and line (seq 2), staggered like the particles
    const s = cur.seq;
    const vis = clamp01((s - 0.55) / 0.35) * clamp01((2.75 - s) / 0.4) * wordVis;
    const m0 = clamp01(s - 1);
    const camPos = camera.position;
    words.forEach((w, i) => {
      if (vis <= 0.001) { pts.push({ x: -999, y: -999, s: 1, o: 0 }); return; }
      let m = clamp01(m0 * 1.7 - (i / 7) * 0.7);
      m = m * m * (3 - 2 * m);
      const a = tanglePoint(w.tK, w.tT, time, cur.rot);
      const p: V3 = [lerp(a[0], w.path[0], m), lerp(a[1], w.path[1], m), lerp(a[2], w.path[2], m)];
      const q = project(p);
      const dz = Math.hypot(p[0] - camPos.x, p[1] - camPos.y, p[2] - camPos.z);
      const sc = Math.max(0.55, Math.min(1.5, (mobile ? 24 : 16) / dz));
      pts.push({ x: q.x, y: q.y, s: sc, o: vis * Math.min(1, sc * sc) });
    });
    // keep the labels legible: push overlapping boxes apart, then clamp to the frame
    for (let it = 0; it < 6; it++) {
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        if (!a.o || !b.o) continue;
        const ox = (words[i].w * a.s + words[j].w * b.s) / 2 + 18 - Math.abs(a.x - b.x);
        const oy = (words[i].h * a.s + words[j].h * b.s) / 2 + 12 - Math.abs(a.y - b.y);
        if (ox > 0 && oy > 0) {
          const d = (oy / 2 + 0.5) * (a.y <= b.y ? 1 : -1);
          a.y -= d; b.y += d;
        }
      }
    }
    pts.forEach((p, i) => {
      const w = words[i];
      if (!p.o) { w.el.style.opacity = '0'; return; }
      const hw = (w.w * p.s) / 2 + 14, hh = (w.h * p.s) / 2;
      const x = Math.min(vw - hw, Math.max(hw, p.x)), y = Math.min(vh - hh - 30, Math.max(hh + 80, p.y));
      const prev = wpos[i];
      const k = prev && Math.abs(prev.x - x) < 200 && Math.abs(prev.y - y) < 200 ? 0.35 : 1;
      const nx = prev ? prev.x + (x - prev.x) * k : x, ny = prev ? prev.y + (y - prev.y) * k : y;
      wpos[i] = { x: nx, y: ny, s: p.s };
      w.el.style.transform = `translate3d(${(nx - w.w / 2).toFixed(1)}px, ${(ny - w.h / 2).toFixed(1)}px, 0) scale(${p.s.toFixed(3)})`;
      w.el.style.opacity = p.o.toFixed(3);
    });
  }

  function frame(dt: number) {
    time += dt;
    const k = 1 - Math.exp(-dt * 5.5);
    const ks = 1 - Math.exp(-dt * 7);
    for (let i = 0; i < 3; i++) {
      cur.cam[i] = lerp(cur.cam[i], target.cam[i], k);
      cur.look[i] = lerp(cur.look[i], target.look[i], k);
    }
    cur.seq = lerp(cur.seq, target.seq, ks);
    cur.spread = lerp(cur.spread, target.spread, ks);
    cur.turb = lerp(cur.turb, target.turb, ks);
    cur.mouseK = lerp(cur.mouseK, target.mouseK, ks);
    cur.write = lerp(cur.write, target.write, ks);
    cur.rot = lerp(cur.rot, target.rot, ks);
    cur.gain = lerp(cur.gain, target.gain, ks);
    cur.par = lerp(cur.par, target.par ?? 1, ks);
    cur.near = lerp(cur.near, target.near ?? 9, ks);
    u.uNear.value = cur.near;
    cur.far = lerp(cur.far, target.far ?? 400, ks);
    u.uFar.value = cur.far;

    // subtle parallax from the pointer
    const px = mouse.active ? mouse.x * cur.par : 0, py = mouse.active ? mouse.y * cur.par : 0;
    camera.position.set(cur.cam[0] + px * 0.35, cur.cam[1] + py * 0.22, cur.cam[2]);
    camera.lookAt(cur.look[0], cur.look[1], cur.look[2]);
    camera.updateMatrixWorld();

    const st = seqState(cur.seq);
    u.uFrom.value = st.from; u.uTo.value = st.to; u.uMix.value = st.mix;
    u.uTime.value = time;
    u.uSpread.value = cur.spread;
    u.uTurb.value = cur.turb;
    u.uWrite.value = cur.write;
    u.uRot.value = cur.rot;
    u.uGain.value = cur.gain * introGain * (mobile ? 1.7 : 1.55);
    u.uDustC.value.set(cur.look[0], cur.look[1], cur.look[2] + 2);
    const dcam = Math.hypot(cur.cam[0] - cur.look[0], cur.cam[1] - cur.look[1], cur.cam[2] - cur.look[2]);
    u.uFocus.value = dcam;

    // pointer on the z=0 plane
    if (mouse.active && cur.mouseK > 0.01) {
      v.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(camera.position).normalize();
      const t = -camera.position.z / v.z;
      mWorld.copy(camera.position).addScaledVector(v, t);
    } else mWorld.set(99, 99, 0);
    mVel.subVectors(mWorld, mPrev).clampLength(0, 1.5);
    if (mPrev.x > 90 || mWorld.x > 90) mVel.set(0, 0, 0);
    mPrev.copy(mWorld);
    u.uMouse.value.lerp(mWorld, mWorld.x > 90 ? 1 : 0.35);
    u.uMouseVel.value.lerp(mVel.multiplyScalar(6), 0.12);
    u.uMouseK.value = cur.mouseK;

    updateWords();
    // nothing visible (no light, no scale): skip the draw
    const visible = u.uGain.value > 0.002;
    if (visible || drewEmpty === false) renderer.render(scene, camera);
    drewEmpty = !visible;

    // adaptive quality: if frames are slow, render fewer particles at a lower ratio
    ftAcc += dt; ftN++;
    if (ftN >= 90) {
      const avg = ftAcc / ftN;
      ftAcc = 0; ftN = 0;
      if (avg > 0.034 && quality > 0.5) {
        quality -= 0.15;
        dpr = Math.max(0.75, dpr * 0.85);
        renderer.setPixelRatio(dpr);
        resize();
        geo.setDrawRange(0, Math.floor(COUNT * quality));
      }
    }
  }

  let last = performance.now();
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (running) frame(dt);
    requestAnimationFrame(loop);
  }

  // first frame behind the loader
  frame(0.016);
  step(1);
  requestAnimationFrame(loop);

  return {
    renderer,
    camera,
    resize,
    set(f: Partial<Frame>) { target = { ...target, ...f } as Frame; },
    snap() { Object.assign(cur, { ...target, cam: [...target.cam] as V3, look: [...target.look] as V3 }); },
    setIntroGain(g: number) { introGain = g; },
    setWordVis(v: number) { wordVis = v; },
    setPointer(x: number, y: number, active: boolean) { mouse.x = x; mouse.y = y; mouse.active = active; },
    setRunning(r: boolean) { running = r; if (r) last = performance.now(); },
    get seq() { return cur.seq; },
    debug() { return { cur, target, cam: camera.position.toArray() }; },
    /** sample the engraved number's glyphs at their exact screen place (when pinned, camera straight at distance D) */
    sampleNumber(el: HTMLElement, rect: { x: number; y: number; w: number; h: number }, camPos: V3, D: number) {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || fs * 1.12;
      const text = el.dataset.text || el.textContent || '';
      const q = 0.6; // sampling resolution
      const c = document.createElement('canvas');
      c.width = Math.ceil(rect.w * q); c.height = Math.ceil(rect.h * q);
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.scale(q, q);
      g.font = `800 ${fs}px Almarai`;
      g.textBaseline = 'alphabetic';
      g.direction = 'ltr';
      g.fillStyle = '#fff';
      const base = (lh - (0.905 + 0.211) * fs) / 2 + 0.905 * fs;
      g.fillText(text, 0, base);
      const data = g.getImageData(0, 0, c.width, c.height).data;
      const on: number[] = [];
      for (let i = 0, n = c.width * c.height; i < n; i++) if (data[i * 4 + 3] > 120) on.push(i);
      const wpp = worldPerPixel(D, vh);
      const glyphShare = 0.72;
      for (let i = 0; i < COUNT; i++) {
        let sx: number, sy: number, z: number, w: number;
        if (on.length && rnd[i * 4 + 3] < glyphShare) {
          const pi = on[(Math.random() * on.length) | 0];
          sx = rect.x + ((pi % c.width) + Math.random()) / q;
          sy = rect.y + (((pi / c.width) | 0) + Math.random()) / q;
          z = (Math.random() - 0.5) * 0.18;
          w = 0.85;
        } else {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
          sx = rect.x + rect.w / 2 + Math.cos(a) * r * rect.w * 0.95;
          sy = rect.y + rect.h / 2 + Math.sin(a) * r * rect.h * 1.4;
          z = (Math.random() - 0.5) * 6;
          w = 0.28;
        }
        num[i * 4] = camPos[0] + (sx - vw / 2) * wpp;
        num[i * 4 + 1] = camPos[1] - (sy - vh / 2) * wpp;
        num[i * 4 + 2] = camPos[2] - D + z;
        num[i * 4 + 3] = w;
      }
      numAttr.needsUpdate = true;
    },
    /** the seven floating words: knot anchors + positions along the line */
    setWords(els: HTMLElement[], spacing: number, alternate: boolean) {
      words.length = 0;
      els.forEach((el, i) => {
        const x = ((els.length - 1) / 2 - i) * spacing; // first word on the right (RTL)
        const b = pathBase(x);
        const yOff = alternate ? (i % 2 ? -0.75 : 0.75) : 0.62;
        words.push({ el, w: el.offsetWidth, h: el.offsetHeight, tK: i, tT: (i * 0.137 + 0.05) % 1, path: [b[0], b[1] + yOff, b[2]] });
      });
    },
  };
}
export type Stage = Awaited<ReturnType<typeof createStage>>;

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
