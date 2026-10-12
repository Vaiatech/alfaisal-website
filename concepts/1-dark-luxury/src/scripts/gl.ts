// The single light of the site.
// A clean, deep navy base (#060a13 → #0b1526) and ONE precise gold light placed
// behind the focal element of the current scene — no clouds, no fog, no drifting
// noise. The light is carried from scene to scene (logo → ring core → 6,750 →
// astrolabe → method front → «بمنظومة» → lamp → door → microphone → name).

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
uniform float uLightR; // radius as a fraction of viewport height
uniform float uDim;
uniform float uTheme; // 0 = the navy night, 1 = ivory daylight

float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float y = 1.0 - uv.y; // 0 at top

  // night: clean navy, a touch lighter at the top. day: warm ivory paper, a touch deeper at the bottom.
  vec3 top = mix(vec3(0.043, 0.082, 0.149), vec3(0.984, 0.973, 0.949), uTheme);  // #0b1526 | #fbf8f2
  vec3 bot = mix(vec3(0.024, 0.039, 0.075), vec3(0.945, 0.922, 0.878), uTheme);  // #060a13 | #f1ebe0
  vec3 col = mix(top, bot, smoothstep(0.0, 1.0, y));

  // the light: crisp, deliberate falloff (reaches zero at r), measured in screen-height units
  vec2 px = vec2((uv.x - uLight.x) * uRes.x / uRes.y, (1.0 - uv.y) - uLight.y);
  float d = length(px);
  float r = max(uLightR, 0.04);
  float halo = 1.0 - smoothstep(0.0, r, d);
  halo = halo * halo * halo;
  float core = exp(-(d * d) / (r * r * 0.05));
  vec3 gold = vec3(0.886, 0.690, 0.380);
  vec3 pale = vec3(1.0, 0.89, 0.66);
  // at night the light is added (a lamp in the dark); by day it is a warm pool of sun on paper
  vec3 night = col + gold * halo * 0.30 * uLightI + pale * core * 0.22 * uLightI;
  float rim = (1.0 - smoothstep(r * 0.5, r * 1.9, d)) * (1.0 - halo);
  night += vec3(0.008, 0.022, 0.055) * rim * uLightI; // rich blue rather than grey where the gold fades
  vec3 day = mix(col, vec3(0.973, 0.886, 0.706), halo * 0.42 * uLightI);
  day = mix(day, vec3(1.0, 0.985, 0.95), core * 0.5 * uLightI);
  col = mix(night, day, uTheme);

  // gentle vignette (multiplicative; softer by day)
  vec2 vc = uv - 0.5;
  col *= 1.0 - dot(vc, vc) * mix(0.55, 0.16, uTheme);
  // at night the lamp dims to an ember at the very end; by day the paper stays clean (dimming would turn it grey)
  col *= 1.0 - uDim * (1.0 - uTheme);

  // dither against banding
  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

export type GLState = { lx: number; ly: number; li: number; lr: number; dim: number; theme: number };

export function createGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false });
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
  const U = { res: u('uRes'), time: u('uTime'), light: u('uLight'), li: u('uLightI'), lr: u('uLightR'), dim: u('uDim'), theme: u('uTheme') };

  const state: GLState = { lx: 0.5, ly: 0.45, li: 0, lr: 0.3, dim: 0, theme: document.documentElement.dataset.theme === 'light' ? 1 : 0 };

  // The shader is cheap; render at CSS-pixel resolution (DPR capped at 1) so falloffs stay crisp.
  const resize = () => {
    const w = Math.max(2, Math.round(window.innerWidth));
    const h = Math.max(2, Math.round(window.innerHeight));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  resize();

  let last = '';
  const render = (time: number) => {
    // skip identical frames (the light is still most of the time)
    const key = `${state.lx.toFixed(4)}|${state.ly.toFixed(4)}|${state.li.toFixed(3)}|${state.lr.toFixed(4)}|${state.dim.toFixed(3)}|${state.theme.toFixed(3)}|${canvas.width}x${canvas.height}`;
    if (key === last) return;
    last = key;
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform1f(U.time, time);
    gl.uniform2f(U.light, state.lx, state.ly);
    gl.uniform1f(U.li, state.li);
    gl.uniform1f(U.lr, state.lr);
    gl.uniform1f(U.dim, state.dim);
    gl.uniform1f(U.theme, state.theme);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  return { state, render, resize };
}
