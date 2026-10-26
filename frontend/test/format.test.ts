import { describe, expect, it } from "vitest";
import {
  formatCost,
  formatDuration,
  formatEnergy,
  formatPercent,
  formatPower,
  formatSoc,
  formatTime,
  formatWhen,
  formatDayTime,
  monthOf,
} from "../src/format";

describe("format", () => {
  it("formats a duration in hours and minutes", () => {
    expect(formatDuration(24900, "fr")).toBe("6 h 55");
  });
  it("shows a dash for an unknown cost", () => {
    expect(formatCost(null, "EUR", "fr")).toBe("—");
  });
  it("formats a cost in the currency", () => {
    expect(formatCost(2.1323, "EUR", "fr")).toBe("2,13 €");
  });
  it("shows a dash for an unknown battery level", () => {
    expect(formatSoc(null, null)).toBe("—");
  });
  it("formats battery start and end", () => {
    expect(formatSoc(40, 100)).toBe("40 → 100 %");
  });
});

describe("more format", () => {
  it("formats energy, power, time and percent", () => {
    expect(formatEnergy(15.63, "fr")).toBe("15,6 kWh");
    expect(formatEnergy(null, "fr")).toBe("—");
    expect(formatPower(2200, "fr")).toBe("2,2 kW");
    expect(formatTime(1761078600, "fr", "Europe/Paris")).toBe("22:30");
    expect(formatWhen(1761078600, "fr", "Europe/Paris", 1761078600 + 86400)).toBe("21/10 22:30");
    expect(formatPercent(0.972, "fr")).toBe("97 %");
    expect(formatSoc(62, null)).toBe("62 → — %");
  });
});

describe("months and dates", () => {
  it("gives the current month in Home Assistant's time zone", () => {
    const t = Date.UTC(2026, 9, 31, 23, 30) / 1000; // 1 Nov 00:30 in Paris
    expect(monthOf(t, "Europe/Paris")).toBe("2026-11");
    expect(monthOf(t, "UTC")).toBe("2026-10");
  });
  it("formats a day with its weekday and time", () => {
    expect(formatDayTime(1761078600, "fr", "Europe/Paris")).toBe("mar. 21/10 22:30");
  });
});

import { formatDelta } from "../src/format";

describe("delta", () => {
  it("shows a decrease with a down arrow", () => {
    expect(formatDelta(-0.12, "fr")).toBe("▼ 12 %");
    expect(formatDelta(0.05, "en")).toBe("▲ 5%");
  });
});
