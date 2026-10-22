import { describe, expect, it } from "vitest";
import { bandsFor, pathFor, timeAt } from "../src/chart";

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
