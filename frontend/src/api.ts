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

/** Calls `onUpdate` whenever sessions or live data change; resolves to the unsubscribe function. */
export const subscribeUpdates = (hass: HomeAssistant, onUpdate: () => void) =>
  hass.connection.subscribeMessage(onUpdate, { type: "charge_board/subscribe" });
