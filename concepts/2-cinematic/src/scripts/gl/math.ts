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
