// A tiny keyframe track: scroll position → values. Every visual of the film (camera,
// particle state, light in the sky) is a function of where the reader is on the page.

export type Val = number | number[];
type Key = { at: number; v: Val; ease: (t: number) => number };

export const ease = {
  lin: (t: number) => t,
  io: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
};

export class Track {
  private props = new Map<string, Key[]>();
  clear() {
    this.props.clear();
  }
  key(at: number, values: Record<string, Val>, e: (t: number) => number = ease.io) {
    for (const [k, v] of Object.entries(values)) {
      if (!this.props.has(k)) this.props.set(k, []);
      this.props.get(k)!.push({ at, v, ease: e });
    }
    return this;
  }
  finalize() {
    for (const keys of this.props.values()) keys.sort((a, b) => a.at - b.at);
  }
  get(name: string, s: number): Val | undefined {
    const keys = this.props.get(name);
    if (!keys || !keys.length) return undefined;
    if (s <= keys[0].at) return keys[0].v;
    const last = keys[keys.length - 1];
    if (s >= last.at) return last.v;
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].at <= s) i++;
    const a = keys[i], b = keys[i + 1];
    const span = b.at - a.at;
    const t = span <= 0 ? 1 : b.ease((s - a.at) / span);
    if (typeof a.v === 'number') return a.v + ((b.v as number) - a.v) * t;
    return (a.v as number[]).map((x, j) => x + ((b.v as number[])[j] - x) * t);
  }
}
