// Pure geometry for the session power chart (inline SVG, no chart library).

export interface Point {
  t: number; // Unix seconds, start of the window
  w: number; // mean power over the window
  off_peak?: boolean | null;
}

/** Time under the x position of a chart `width` wide spanning start → end. */
export function timeAt(x: number, width: number, start: number, end: number): number {
  return start + (Math.min(Math.max(x, 0), width) / width) * (end - start);
}

/**
 * A curve point covers at most this long (CURVE_WINDOW_MAX_S in const.py: 300 s window + 2 ticks);
 * past that, e.g. between the parts of a merged session, the power is 0 and there is no band.
 */
export const CURVE_WINDOW_MAX_S = 360;

/** End of the window of point i (capped, never before its start). */
const windowEnd = (curve: Point[], i: number, end: number) =>
  Math.max(Math.min(i + 1 < curve.length ? curve[i + 1].t : end, curve[i].t + CURVE_WINDOW_MAX_S), curve[i].t);

const r = (v: number) => Math.round(v * 10) / 10;

/** Step path: each point holds its power until the next one (the last until `end`), capped. */
export function pathFor(
  curve: Point[],
  width: number,
  height: number,
  start = curve[0]?.t ?? 0,
  end = curve[curve.length - 1]?.t ?? 0,
): string {
  if (!curve.length) return "";
  const max = Math.max(...curve.map((p) => p.w), 1);
  const span = end - start || 1;
  const x = (t: number) => r(((t - start) / span) * width);
  const y = (w: number) => r(height - (Math.max(w, 0) / max) * height);
  const parts = curve.map((p, i) => {
    const to = windowEnd(curve, i, end);
    const next = i + 1 < curve.length ? curve[i + 1].t : end;
    const step = `${i ? "L" : "M"}${x(p.t)} ${y(p.w)} L${x(to)} ${y(p.w)}`;
    return to < next ? `${step} L${x(to)} ${y(0)} L${x(next)} ${y(0)}` : step; // gap: no power
  });
  return parts.join(" ");
}

/** Off-peak periods [from, to) of the curve; points without the flag count as peak. */
export function bandsFor(curve: Point[], end: number): { from: number; to: number }[] {
  const bands: { from: number; to: number }[] = [];
  curve.forEach((p, i) => {
    if (!p.off_peak) return;
    const to = windowEnd(curve, i, end);
    const last = bands[bands.length - 1];
    if (last && last.to === p.t) last.to = to;
    else bands.push({ from: p.t, to });
  });
  return bands;
}
