// Camera maths shared by the director and the WebGL stage (no three.js import here, so the
// static path never downloads the 3D bundle).
export type V3 = [number, number, number];
export const FOV = 35;
export const LOGO_H = 10;
export const LOGO_W = (10 * 830) / 835;
export const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

/** Camera that shows a world box of height `worldH` (centred at `center`) exactly inside a screen rect. */
export function fitCamera(rect: { x: number; y: number; w: number; h: number }, vw: number, vh: number, worldH: number, center: V3 = [0, 0, 0]) {
  const D = (worldH / (2 * TAN)) * (vh / rect.h);
  const wpp = (2 * D * TAN) / vh;
  const dx = rect.x + rect.w / 2 - vw / 2;
  const dy = rect.y + rect.h / 2 - vh / 2;
  const cx = center[0] - dx * wpp, cy = center[1] + dy * wpp;
  return { cam: [cx, cy, center[2] + D] as V3, look: [cx, cy, center[2]] as V3, wpp, D };
}
export const worldPerPixel = (D: number, vh: number) => (2 * D * TAN) / vh;

/** Where a world direction lands on screen (NDC) for a camera at C looking at L (three.js lookAt convention). */
function vanishingNdc(C: V3, L: V3, d: V3, asp: number) {
  const z = norm([C[0] - L[0], C[1] - L[1], C[2] - L[2]]);
  const x = norm(cross([0, 1, 0], z));
  const y = cross(z, x);
  const zc = dot(d, z);
  return [dot(d, x) / -zc / (TAN * asp), dot(d, y) / -zc / TAN];
}
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Aim a camera so that the direction `d` (e.g. the line of light running away) vanishes at screen NDC (tx, ty). */
export function aimVanishing(C: V3, d: V3, tx: number, ty: number, asp: number): V3 {
  let yaw = 0, pitch = 0;
  const look = (yw: number, pt: number): V3 => {
    const dir: V3 = [d[0] * Math.cos(yw) * Math.cos(pt) - d[2] * Math.sin(yw), Math.sin(pt), d[2] * Math.cos(yw) + d[0] * Math.sin(yw) * Math.cos(pt)];
    return [C[0] + dir[0] * 10, C[1] + dir[1] * 10, C[2] + dir[2] * 10];
  };
  for (let i = 0; i < 24; i++) {
    const v = vanishingNdc(C, look(yaw, pitch), d, asp);
    const e = 1e-3;
    const vy1 = vanishingNdc(C, look(yaw + e, pitch), d, asp);
    const vp1 = vanishingNdc(C, look(yaw, pitch + e), d, asp);
    const a = (vy1[0] - v[0]) / e, b = (vp1[0] - v[0]) / e, c = (vy1[1] - v[1]) / e, dd = (vp1[1] - v[1]) / e;
    const det = a * dd - b * c || 1e-6;
    const ex = tx - v[0], ey = ty - v[1];
    yaw += (dd * ex - b * ey) / det;
    pitch += (-c * ex + a * ey) / det;
    if (Math.abs(ex) + Math.abs(ey) < 1e-4) break;
  }
  return look(yaw, pitch);
}
