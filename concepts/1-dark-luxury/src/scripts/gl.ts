// The single light of the site: a slow navy aurora with a warm gold haze.
// One fragment shader on a full-screen triangle; the light travels between
// scene anchors (logo → threads → numbers → astrolabe → line → lamp → door → voice → name).

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLight;   // 0..1, y from top
uniform float uLightI;
uniform float uLightR;
uniform vec2 uMouse;
uniform float uDim;
uniform float uScroll;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++){ v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float y = 1.0 - uv.y; // from top

  vec3 deep = vec3(0.020, 0.031, 0.059);
  vec3 navy = vec3(0.059, 0.106, 0.176);
  vec3 high = vec3(0.106, 0.169, 0.271);
  vec3 col = mix(navy, deep, smoothstep(0.0, 1.0, y));
  col = mix(col, high, (1.0 - smoothstep(0.0, 0.55, y)) * 0.38);

  float t = uTime * 0.035;
  vec2 q = vec2(fbm(p * 1.25 + vec2(t, -t * 0.6) + uScroll * 0.15), noise(p * 2.1 + vec2(-t * 0.7, t) + 5.2));
  float f = fbm(p * 1.55 + q * 1.9 + vec2(t * 0.4, uScroll * 0.25));
  float aur = smoothstep(0.38, 0.92, f);

  // cool aurora drift in the navy
  col += vec3(0.07, 0.12, 0.2) * aur * 0.55;

  // the gold light
  vec2 L = vec2(uLight.x * asp, 1.0 - uLight.y);
  vec2 dv = p - L;
  dv.y *= 1.15;
  float d = length(dv);
  float r = max(uLightR, 0.05);
  float glow = exp(-(d * d) / (r * r));
  float halo = exp(-(d * d) / (r * r * 5.0));
  vec3 amber = vec3(0.78, 0.52, 0.22);
  vec3 gold = vec3(0.95, 0.78, 0.47);
  col += amber * halo * uLightI * 0.22 * (0.6 + aur);
  col += amber * glow * uLightI * (0.28 + 0.75 * aur);
  col += gold * pow(glow, 4.0) * uLightI * 0.35;

  // warm haze riding the aurora far from the light
  col += gold * 0.045 * smoothstep(0.62, 1.0, f) * (1.0 - y * 0.5);

  // pointer: a faint warm breath
  vec2 M = vec2(uMouse.x * asp, 1.0 - uMouse.y);
  float md = length(p - M);
  col += amber * 0.05 * exp(-md * md / 0.06);

  // vignette
  vec2 vc = uv - 0.5;
  col *= 1.0 - dot(vc, vc) * 0.95;
  col *= 1.0 - uDim;

  gl_FragColor = vec4(col, 1.0);
}
`;

export type GLState = {
  lx: number; ly: number; li: number; lr: number;
  mx: number; my: number; dim: number; scroll: number;
};

export function createGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const U = {
    res: u('uRes'), time: u('uTime'), light: u('uLight'), li: u('uLightI'), lr: u('uLightR'),
    mouse: u('uMouse'), dim: u('uDim'), scroll: u('uScroll'),
  };

  const state: GLState = { lx: 0.68, ly: 0.45, li: 0, lr: 0.32, mx: 0.5, my: 0.5, dim: 0, scroll: 0 };

  // The haze is low-frequency: a small buffer, linearly upscaled, is enough.
  // Quality adapts down if the device can't keep up.
  let quality = 0.42;
  const resize = () => {
    const scale = quality;
    const w = Math.max(2, Math.round(window.innerWidth * scale));
    const h = Math.max(2, Math.round(window.innerHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  resize();

  let frames = 0, since = performance.now(), skip = 0, every = 1;
  const adapt = () => {
    frames++;
    const now = performance.now();
    if (now - since > 1000) {
      const fps = (frames * 1000) / (now - since);
      frames = 0; since = now;
      if (fps < 40 && quality > 0.2) { quality = Math.max(0.2, quality * 0.75); resize(); }
      else if (fps < 40 && every < 3) every++;
    }
  };
  const render = (time: number) => {
    adapt();
    if (++skip % every) return;
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform1f(U.time, time);
    gl.uniform2f(U.light, state.lx, state.ly);
    gl.uniform1f(U.li, state.li);
    gl.uniform1f(U.lr, state.lr);
    gl.uniform2f(U.mouse, state.mx, state.my);
    gl.uniform1f(U.dim, state.dim);
    gl.uniform1f(U.scroll, state.scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  return { state, render, resize };
}
