// Typed wrappers for the charge_board websocket commands (see websocket_api.py).

export interface HomeAssistant {
  language: string;
  locale?: { language: string };
  config: { time_zone: string };
  connection: {
    sendMessagePromise<T>(msg: Record<string, unknown>): Promise<T>;
    subscribeMessage<T>(
      callback: (event: T) => void,
      msg: Record<string, unknown>,
    ): Promise<() => Promise<void>>;
  };
}

export interface TariffSlice {
  kwh: number;
  cost: number | null;
}

export interface Session {
  id: string;
  charger_id: string;
  vehicle_id: string | null;
  plugged_at: number | null; // Unix seconds
  charge_start: number | null;
  charge_end: number | null;
  unplugged_at: number | null;
  charging_s: number;
  energy_kwh: number;
  cost: number | null;
  off_peak: TariffSlice;
  peak: TariffSlice;
  by_price: Record<string, TariffSlice>;
  has_off_peak_source: boolean;
  soc_start: number | null;
  soc_end: number | null;
  curve: { t: number; w: number; off_peak?: boolean | null }[];
  estimated: boolean;
  edited: boolean;
  open: boolean;
  // Present on finished sessions returned by the API.
  vehicle_name?: string | null;
  charger_name?: string | null;
}

export type ChargerState = "charging" | "plugged" | "free";

export interface ChargerOverview {
  id: string;
  name: string;
  state: ChargerState;
  vehicle: {
    id: string;
    name: string;
    soc: number | null;
    target: number | null;
    capacity_kwh: number | null;
  } | null;
  power_w: number | null;
  session: Session | null; // the session in progress
  estimated_end: number | null;
  last_session: Session | null;
}

export interface Overview {
  style: "detailed" | "compact";
  currency: string;
  chargers: ChargerOverview[];
  vehicles: { id: string; name: string }[];
}

export interface SessionsSummary {
  count: number;
  energy_kwh: number;
  cost: number | null;
  unpriced_count: number;
  off_peak_share: number | null;
}

export interface SessionFilter {
  vehicle_id?: string;
  charger_id?: string;
  month?: string; // "YYYY-MM"
}

/** Ids of the sessions that replace the corrected one. */
export interface CorrectionResult {
  sessions: string[];
}

const call = <T>(hass: HomeAssistant, type: string, data: Record<string, unknown> = {}) =>
  hass.connection.sendMessagePromise<T>({ type: `charge_board/${type}`, ...data });

export const getOverview = (hass: HomeAssistant) => call<Overview>(hass, "overview");

export const getSessions = (hass: HomeAssistant, filter: SessionFilter = {}) =>
  call<{ sessions: Session[]; summary: SessionsSummary }>(hass, "sessions", { ...filter });

export const getSession = (hass: HomeAssistant, session_id: string) =>
  call<Session>(hass, "session", { session_id });

export const setVehicle = (hass: HomeAssistant, session_id: string, vehicle_id: string) =>
  call<CorrectionResult>(hass, "set_vehicle", { session_id, vehicle_id });

export const deleteSession = (hass: HomeAssistant, session_id: string) =>
  call<CorrectionResult>(hass, "delete", { session_id });

export const mergeSessions = (hass: HomeAssistant, session_id: string, other_id: string) =>
  call<CorrectionResult>(hass, "merge", { session_id, other_id });

export const splitSession = (hass: HomeAssistant, session_id: string, at: number) =>
  call<CorrectionResult>(hass, "split", { session_id, at });

/** One month (or the year's total, month = null) of the Statistics and Vehicles tabs. */
export interface StatsRow {
  month: string | null; // "YYYY-MM"
  sessions: number;
  energy_kwh: number;
  cost: number | null;
  unpriced: number;
  off_peak_share: number | null;
  off_peak_cost: number;
  peak_cost: number;
  km: number | null; // null: odometer statistics do not cover the month
  fuel_price: number | null;
  fuel_l100: number | null;
  cost_per_100km: number | null;
  fuel_cost: number | null;
  savings: number | null;
  kwh_100km?: number | null;
}

export interface Stats {
  currency: string;
  rows: StatsRow[];
  total: StatsRow;
}

export interface ConfigItem {
  key: "soc_entity" | "target" | "odometer_entity" | "fuel_price";
  entity_id: string | null;
  value: number | null;
  ok: boolean;
}

export interface VehicleCard {
  id: string;
  name: string;
  capacity_kwh: number | null;
  soc: number | null;
  target: number | null;
  target_source: "vehicle" | "home";
  odometer: number | null;
  consumption_30d: number | null;
  autonomy_km: number | null;
  consumption_since: number | null;
  fuel_l100: number | null;
  currency: string;
  rows: StatsRow[];
  sessions: { start: number; end: number | null }[];
  config: ConfigItem[];
  cut_ignored: boolean;
}

export const getStats = (hass: HomeAssistant, year: number, vehicle_id?: string) =>
  call<Stats>(hass, "stats", { year, ...(vehicle_id && { vehicle_id }) });

export const getVehicle = (hass: HomeAssistant, vehicle_id: string) =>
  call<VehicleCard>(hass, "vehicle", { vehicle_id });

/** Hourly mean of an entity from Home Assistant's long-term statistics (t in Unix seconds). */
export async function hourlyMeans(hass: HomeAssistant, entity_id: string, start: number, end: number) {
  const res = await hass.connection.sendMessagePromise<
    Record<string, { start: number | string; mean: number | null }[]>
  >({
    type: "recorder/statistics_during_period",
    start_time: new Date(start * 1000).toISOString(),
    end_time: new Date(end * 1000).toISOString(),
    statistic_ids: [entity_id],
    period: "hour",
    types: ["mean"],
  });
  return (res[entity_id] ?? [])
    .filter((p) => p.mean != null)
    .map((p) => ({ t: (typeof p.start === "number" ? p.start : Date.parse(p.start)) / 1000, v: p.mean as number }));
}

/** Calls `onUpdate` whenever sessions or live data change; resolves to the unsubscribe function. */
export const subscribeUpdates = (hass: HomeAssistant, onUpdate: () => void) =>
  hass.connection.subscribeMessage(onUpdate, { type: "charge_board/subscribe" });
