// One particle system, five places it can be: the signature (LOGO), the knot of details
// (TANGLE), the single braided line (PATH), the engraved number (NUMBER) and the motes of
// light in the air (DUST). The page's scroll moves every particle between these states.

export const vert = /* glsl */ `
uniform float uTime;
uniform float uFrom;
uniform float uTo;
uniform float uMix;
uniform float uSpread;
uniform float uTurb;
uniform float uSize;
uniform float uPx;
uniform float uGain;
uniform float uWrite;
uniform float uMouseK;
uniform float uFocus;
uniform float uDof;
uniform float uRot;
uniform float uNear;
uniform float uTR;
uniform float uPathL;
uniform float uNodes;
uniform vec3 uMouse;
uniform vec3 uMouseVel;
uniform vec3 uDustC;
uniform vec3 uLA[7];
uniform vec3 uLP[7];
uniform mat3 uRM[7];

attribute vec3 aCol;
attribute vec4 aNum;
attribute vec3 aDust;
attribute vec4 aRnd;
attribute vec4 aMeta; // thread, t, write time, size

varying vec3 vCol;
varying float vA;

const float PI = 3.14159265;
const float TAU = 6.2831853;

vec3 stLogo() {
  vec3 p = position;
  p.z += sin(uTime * 0.7 + aRnd.x * TAU) * 0.035;
  p.xy += vec2(sin(uTime * 0.5 + aRnd.y * TAU), cos(uTime * 0.43 + aRnd.z * TAU)) * 0.012;
  return p;
}

vec3 stTangle() {
  int k = int(aMeta.x);
  float t = aMeta.y * TAU + uTime * (0.035 + 0.02 * aRnd.y);
  vec2 pq = uLA[k].xy;
  float r = 1.0 + 0.4 * cos(pq.y * t);
  vec3 p = vec3(r * cos(pq.x * t), r * sin(pq.x * t), 0.5 * sin(pq.y * t)) * (uTR * 0.68);
  p = uRM[k] * p;
  p += (aRnd.xyz - 0.5) * (0.06 + 0.16 * aRnd.w * aRnd.w);
  float rr = uRot + uTime * 0.03;
  float c = cos(rr), s = sin(rr);
  p.xz = mat2(c, -s, s, c) * p.xz;
  return p;
}

vec3 pathBase(float x) {
  return vec3(x, 0.55 * sin(x * 0.35 + 0.4), 0.9 * sin(x * 0.21));
}

vec3 stPath() {
  float t = fract(aMeta.y + uTime * 0.0035 * (0.6 + aRnd.y));
  float x = mix(uPathL, -uPathL, t);
  vec3 b = pathBase(x);
  float s = sin(t * PI * uNodes);
  float ang = (aMeta.x + aRnd.z * 0.25) / 7.0 * TAU;
  vec2 d = vec2(cos(ang), sin(ang));
  b.yz += d * s * uSpread;
  b += (aRnd.xyz - 0.5) * (0.05 + 0.16 * abs(s) * uSpread);
  return b;
}

vec3 stNum() {
  return aNum.xyz + vec3(sin(uTime * 0.6 + aRnd.x * TAU), cos(uTime * 0.5 + aRnd.y * TAU), sin(uTime * 0.8 + aRnd.z * TAU)) * 0.025;
}

vec3 stDust() {
  vec3 size = vec3(34.0, 24.0, 26.0);
  vec3 p = aDust + vec3(sin(uTime * 0.07 + aRnd.x * TAU), cos(uTime * 0.06 + aRnd.y * TAU), sin(uTime * 0.05 + aRnd.z * TAU)) * 0.9;
  p.y += uTime * (0.05 + aRnd.w * 0.08);
  p = mod(p - uDustC + size * 0.5, size) - size * 0.5 + uDustC;
  return p;
}

vec3 st(float i) {
  if (i < 0.5) return stLogo();
  if (i < 1.5) return stTangle();
  if (i < 2.5) return stPath();
  if (i < 3.5) return stNum();
  return stDust();
}

vec3 flow(vec3 p) {
  return vec3(
    sin(p.y * 0.9 + uTime * 0.4) + sin(p.z * 1.3 + uTime * 0.27),
    sin(p.z * 0.8 + uTime * 0.33) + sin(p.x * 1.1 - uTime * 0.21),
    sin(p.x * 0.7 + uTime * 0.29) + sin(p.y * 1.2 + uTime * 0.36)
  );
}

void main() {
  float m = clamp(uMix * 1.7 - aRnd.w * 0.7, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  vec3 p = mix(st(uFrom), st(uTo), m);
  float bump = sin(m * PI);
  p += flow(p * 0.35 + aRnd.xyz) * bump * uTurb * (0.45 + aRnd.x * 0.8);

  float lw = (uFrom < 0.5 ? 1.0 - m : 0.0) + (uTo < 0.5 ? m : 0.0);
  float nw = (uFrom > 2.5 && uFrom < 3.5 ? 1.0 - m : 0.0) + (uTo > 2.5 && uTo < 3.5 ? m : 0.0);

  // writing order of the signature
  float vis = 1.0 - smoothstep(uWrite - 0.025, uWrite, aMeta.z);
  float tip = exp(-pow((uWrite - aMeta.z) * 38.0, 2.0)) * step(uWrite, 0.999);
  float alpha = mix(1.0, vis, lw);

  // the cursor parts the ink
  vec2 dm = p.xy - uMouse.xy;
  float f = exp(-dot(dm, dm) / 1.6) * uMouseK;
  p.xy += normalize(dm + 1e-4) * f * 0.75 + uMouseVel.xy * f * 0.9;
  p.z += f * (aRnd.z - 0.35) * 1.6;

  vec4 mv = viewMatrix * vec4(p, 1.0);
  float dist = max(-mv.z, 0.1);
  float coc = abs(dist - uFocus) * uDof;
  float near = smoothstep(1.5, uNear, dist);
  gl_Position = projectionMatrix * mv;
  float glow = step(aRnd.y, 0.07);
  gl_PointSize = clamp(aMeta.w * uSize * uPx * (1.0 + coc * 1.3) * (1.0 + glow * 3.2) / dist, 0.0, 44.0);

  vec3 gold = mix(vec3(0.68, 0.51, 0.18), vec3(0.92, 0.78, 0.5), aRnd.y);
  if (aRnd.z > 0.93) gold = vec3(0.78, 0.22, 0.17);
  if (aRnd.x > 0.985) gold = vec3(1.0, 0.94, 0.82);
  vec3 c = mix(gold, aCol, lw);
  c = mix(c, mix(vec3(0.95, 0.8, 0.5), vec3(1.0, 0.93, 0.78), aRnd.y), nw * 0.6);
  vCol = c;

  float halo = mix(1.0, aNum.w, nw);
  vA = (0.5 + 0.5 * aRnd.y) * alpha * halo * uGain * (1.0 + lw * 0.95) * (1.0 + f * 1.4 + tip * 4.0) / (1.0 + coc * coc * 1.6);
  vA *= mix(1.0, 0.13, glow) * near;
}
`;

export const frag = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  float o = a * vA;
  if (o < 0.002) discard;
  gl_FragColor = vec4(vCol * o, o * 0.45);
}
`;
