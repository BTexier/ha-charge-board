import { describe, expect, it } from "vitest";
import { CURVE_WINDOW_MAX_S, bandsFor, pathFor, timeAt } from "../src/chart";

describe("chart", () => {
  it("maps an x position to a time", () => {
    expect(timeAt(50, 100, 0, 3600)).toBe(1800);
  });
  it("draws nothing without points", () => {
    expect(pathFor([], 100, 50)).toBe("");
  });
  it("draws a path from two points", () => {
    const d = pathFor([{ t: 0, w: 1000 }, { t: 60, w: 2000 }], 100, 50);
    expect(d).toMatch(/^M[-\d.]+ [-\d.]+ L/);
  });
  it("finds the off-peak runs of the curve", () => {
    const curve = [
      { t: 0, w: 1, off_peak: true },
      { t: 10, w: 1, off_peak: true },
      { t: 20, w: 1, off_peak: false },
      { t: 30, w: 1, off_peak: true },
    ];
    expect(bandsFor(curve, 40)).toEqual([
      { from: 0, to: 20 },
      { from: 30, to: 40 },
    ]);
  });
});

describe("chart gaps (merged sessions)", () => {
  // A point covers at most CURVE_WINDOW_MAX_S; past that the power is 0 and there is no band.
  const curve = [
    { t: 0, w: 1000, off_peak: true },
    { t: 1000, w: 1000, off_peak: true },
  ];
  it("drops the path to zero across a gap", () => {
    const d = pathFor(curve, 1300, 50, 0, 1300); // x == t
    expect(d).toContain(`L${CURVE_WINDOW_MAX_S} 0 L${CURVE_WINDOW_MAX_S} 50 L1000 50 L1000 0`);
  });
  it("draws no band over a gap", () => {
    expect(bandsFor(curve, 1300)).toEqual([
      { from: 0, to: CURVE_WINDOW_MAX_S },
      { from: 1000, to: 1300 },
    ]);
  });
});
