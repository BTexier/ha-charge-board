import type { HomeAssistant } from "./api";

export type Lang = "fr" | "en";

const fr = {
  title: "Recharge",
  tab_overview: "Aperçu",
  tab_sessions: "Sessions",
  loading: "Chargement…",
  error: "Impossible de charger les données",
  not_loaded: "Charge Board n'est pas chargé",
  no_chargers: "Aucun chargeur configuré. Ajoutez-en un dans les paramètres de l'intégration Charge Board.",
  sessions_soon: "…",
  charging: "En charge",
  plugged: "Branché",
  free: "Libre",
  power: "puissance",
  session: "session",
  cost: "coût",
  end: "fin estimée",
  end_short: "fin {time}",
  plugged_since: "Branchée depuis {time}",
  charging_since: "en charge depuis {time}",
  charge_started: "début de charge {time}",
  off_peak: "{share} heures creuses",
  last_session: "Dernière session : {summary}",
  no_session: "Aucune session enregistrée",
  no_vehicle: "aucun véhicule",
  menu: "Menu",
  close: "Fermer",
};

const en: typeof fr = {
  title: "Charging",
  tab_overview: "Overview",
  tab_sessions: "Sessions",
  loading: "Loading…",
  error: "Could not load the data",
  not_loaded: "Charge Board is not loaded",
  no_chargers: "No charger configured. Add one in the Charge Board integration settings.",
  sessions_soon: "…",
  charging: "Charging",
  plugged: "Plugged in",
  free: "Free",
  power: "power",
  session: "session",
  cost: "cost",
  end: "estimated end",
  end_short: "end {time}",
  plugged_since: "Plugged in since {time}",
  charging_since: "charging since {time}",
  charge_started: "charge started {time}",
  off_peak: "{share} off-peak",
  last_session: "Last session: {summary}",
  no_session: "No session recorded",
  no_vehicle: "no vehicle",
  menu: "Menu",
  close: "Close",
};

export type Key = keyof typeof fr;

const texts: Record<Lang, typeof fr> = { fr, en };

export const langOf = (hass: HomeAssistant): Lang => (hass.language?.startsWith("fr") ? "fr" : "en");

/** Locale for number and date formats. */
export const localeOf = (hass: HomeAssistant): string => hass.locale?.language ?? hass.language ?? "en";

export function t(lang: Lang, key: Key, vars: Record<string, string> = {}): string {
  return texts[lang][key].replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}
