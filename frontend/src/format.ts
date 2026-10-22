// Display helpers. Unknown values are shown as a dash, never as 0.
export const DASH = "—";

// Intl puts no-break spaces in "2,13 €"; plain spaces keep the strings predictable (CSS stops wrapping).
const plain = (s: string) => s.replace(/[  ]/g, " ");

const number = (value: number, locale: string, digits: number) =>
  plain(
    value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  );

export function formatEnergy(kwh: number | null | undefined, locale: string): string {
  return kwh == null ? DASH : `${number(kwh, locale, 1)} kWh`;
}

export function formatPower(w: number | null | undefined, locale: string): string {
  return w == null ? DASH : `${number(w / 1000, locale, 1)} kW`;
}

export function formatCost(value: number | null | undefined, currency: string, locale: string): string {
  if (value == null) return DASH;
  return plain(new Intl.NumberFormat(locale, { style: "currency", currency }).format(value));
}

export function formatDuration(seconds: number, lang: string): string {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  const mm = String(m).padStart(2, "0");
  return lang === "fr" ? `${h} h ${mm}` : `${h} h ${mm} min`;
}

export function formatSoc(start: number | null | undefined, end: number | null | undefined): string {
  if (start == null && end == null) return DASH;
  const pct = (v: number | null | undefined) => (v == null ? DASH : String(Math.round(v)));
  return `${pct(start)} → ${pct(end)} %`;
}

export function formatPercent(share: number, locale: string): string {
  return plain(share.toLocaleString(locale, { style: "percent", maximumFractionDigits: 0 }));
}

const parts = (ts: number, locale: string, timeZone: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { timeZone, ...opts }).format(new Date(ts * 1000));

/** "05:10" for a Unix timestamp (seconds) in Home Assistant's time zone. */
export function formatTime(ts: number, locale: string, timeZone: string): string {
  return parts(ts, locale, timeZone, { hour: "2-digit", minute: "2-digit" });
}

/** "21/10" for a Unix timestamp (seconds) in Home Assistant's time zone. */
export function formatDay(ts: number, locale: string, timeZone: string): string {
  return parts(ts, locale, timeZone, { day: "2-digit", month: "2-digit" });
}

/** The time, preceded by the day when it is not today. */
export function formatWhen(ts: number, locale: string, timeZone: string, now = Date.now() / 1000) {
  const time = formatTime(ts, locale, timeZone);
  const day = formatDay(ts, locale, timeZone);
  return day === formatDay(now, locale, timeZone) ? time : `${day} ${time}`;
}

/** "mar. 21/10 22:30": weekday, day and time in Home Assistant's time zone. */
export function formatDayTime(ts: number, locale: string, timeZone: string): string {
  const weekday = parts(ts, locale, timeZone, { weekday: "short" });
  return `${weekday} ${formatDay(ts, locale, timeZone)} ${formatTime(ts, locale, timeZone)}`;
}

/** "2026-10": the month of a Unix timestamp in Home Assistant's time zone (sessions filter). */
export function monthOf(ts: number, timeZone: string): string {
  return parts(ts, "en-CA", timeZone, { year: "numeric", month: "2-digit" });
}
