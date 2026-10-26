import { LitElement, css, html, nothing, svg, type PropertyValues } from "lit";
import {
  getOverview,
  getVehicle,
  hourlyMeans,
  type ConfigItem,
  type HomeAssistant,
  type Overview,
  type VehicleCard,
} from "./api";
import { linePath } from "./chart";
import { DASH, formatCost, formatDay, formatEnergy } from "./format";
import { errorKey, langOf, localeOf, t, type Key } from "./i18n";
import { cardStyles } from "./styles";

const DAYS = 30;
const W = 300;
const H = 80;

/** Vehicles tab: one card per vehicle with battery history, consumption and its settings. */
export class ChargeBoardVehicles extends LitElement {
  static properties = {
    hass: { attribute: false },
    version: { type: Number },
    _overview: { state: true },
    _card: { state: true },
    _soc: { state: true },
    _error: { state: true },
    _vehicle: { state: true },
  };

  hass!: HomeAssistant;
  version = 0;
  private _overview?: Overview;
  private _card?: VehicleCard;
  private _soc: { t: number; v: number }[] = [];
  private _error?: Key;
  private _vehicle?: string;
  private _req = 0;
  private _socFor?: string; // vehicle whose battery history is loaded (fetched once per vehicle)

  protected updated(changed: PropertyValues) {
    if (["version", "_vehicle"].some((k) => changed.has(k)) && this.hass) this._fetch();
  }

  private async _fetch() {
    const req = ++this._req;
    try {
      const overview = await getOverview(this.hass);
      if (req !== this._req) return;
      this._overview = overview;
      if (!this._vehicle || !overview.vehicles.some((v) => v.id === this._vehicle)) {
        this._vehicle = overview.vehicles[0]?.id;
        if (!this._vehicle) return;
      }
      const card = await getVehicle(this.hass, this._vehicle);
      if (req !== this._req) return;
      this._card = card;
      this._error = undefined;
      const entity = card.config.find((c) => c.key === "soc_entity")?.entity_id;
      if (entity && this._socFor !== card.id) {
        const now = Date.now() / 1000;
        this._soc = await hourlyMeans(this.hass, entity, now - DAYS * 86400, now).catch(() => []);
        this._socFor = card.id;
      }
    } catch (err) {
      if (req === this._req) this._error = errorKey(err);
    }
  }

  private _t(key: Key, vars?: Record<string, string>) {
    return t(langOf(this.hass), key, vars);
  }

  render() {
    if (this._error && !this._card) return html`<p class="message">${this._t(this._error)}</p>`;
    if (this._overview && !this._overview.vehicles.length) return html`<p class="message">${this._t("no_vehicles")}</p>`;
    if (!this._card || !this._overview) return html`<p class="message">${this._t("loading")}</p>`;
    return html`
      <div class="filters">
        ${this._overview.vehicles.map(
          (v) => html`<button
            class="chip"
            aria-pressed=${v.id === this._vehicle}
            @click=${() => {
              if (v.id === this._vehicle) return;
              this._vehicle = v.id;
              this._soc = [];
            }}
          >
            ${v.name}
          </button>`,
        )}
      </div>
      ${this._card.cut_ignored && this._card.target_source === "home"
        ? html`<p class="error">${this._t("cut_ignored")}</p>`
        : nothing}
      ${this._figures()} ${this._chart()} ${this._table()} ${this._config()}
    `;
  }

  private _figures() {
    const c = this._card!;
    const locale = localeOf(this.hass);
    const num = (v: number | null, digits = 0) =>
      v == null ? DASH : v.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits });
    const fig = (value: string, label: string, sub?: string) =>
      html`<div class="fig"><b>${value}</b><span>${label}</span>${sub ? html`<small>${sub}</small>` : nothing}</div>`;
    return html`<div class="card">
      <div class="figs">
        ${fig(
          c.soc == null ? DASH : `${num(c.soc)} %`,
          this._t("battery_now"),
          c.target == null ? undefined : this._t("target_n", { n: num(c.target) }),
        )}
        ${fig(c.consumption_30d == null ? DASH : `${num(c.consumption_30d, 1)} kWh`, this._t("consumption_30d"))}
        ${fig(c.odometer == null ? DASH : `${num(c.odometer)} km`, this._t("odometer"))}
        ${fig(c.autonomy_km == null ? DASH : `≈ ${num(c.autonomy_km)} km`, this._t("autonomy"))}
      </div>
      ${c.consumption_since == null
        ? nothing
        : html`<div class="note">${this._t("consumption_since", { value: num(c.consumption_since, 1) })}</div>`}
    </div>`;
  }

  private _chart() {
    const now = Date.now() / 1000;
    const start = now - DAYS * 86400;
    const tz = this.hass.config.time_zone;
    const locale = localeOf(this.hass);
    const x = (t: number) => ((Math.max(t, start) - start) / (now - start)) * W;
    return html`<div class="card">
      <div class="label">${this._t("battery_30d")} · <span class="band">▮</span> ${this._t("recharges")}</div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="line" role="img">
        ${this._card!.sessions.map(
          (s) => svg`<rect class="band" x=${x(s.start)} y="0" height=${H}
            width=${Math.max(x(s.end ?? now) - x(s.start), 1.5)}></rect>`,
        )}
        <path d=${linePath(this._soc, W, H, start, now)}></path>
      </svg>
      <div class="axis">
        <span>${formatDay(start, locale, tz)}</span><span>${formatDay(now, locale, tz)}</span>
      </div>
    </div>`;
  }

  private _table() {
    const c = this._card!;
    const locale = localeOf(this.hass);
    const rows = c.rows.filter((r) => r.sessions || r.km != null).reverse();
    if (!rows.length) return nothing;
    const month = (m: string) =>
      new Date(`${m}-15T12:00:00Z`).toLocaleString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
    const cols: Key[] = ["col_month", "col_km", "col_kwh", "col_kwh_100", "col_per_100"];
    return html`<div class="card">
      <div class="label">${this._t("consumption_by_month")}</div>
      <div class="scroll flat">
        <table>
          <thead>
            <tr>${cols.map((k) => html`<th>${this._t(k)}</th>`)}</tr>
          </thead>
          <tbody>
            ${rows.map(
              (r) => html`<tr>
                <td>${month(r.month!)}</td>
                <td>
                  ${r.km == null ? DASH : Math.round(r.km).toLocaleString(locale)}${r.km_partial ? " *" : ""}
                </td>
                <td>${formatEnergy(r.energy_kwh, locale)}</td>
                <td>${r.kwh_100km == null ? DASH : r.kwh_100km.toLocaleString(locale, { maximumFractionDigits: 1 })}</td>
                <td>${formatCost(r.cost_per_100km, c.currency, locale)}</td>
              </tr>`,
            )}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  private _config() {
    const c = this._card!;
    const locale = localeOf(this.hass);
    const dot = (item: ConfigItem) =>
      html`<span class=${item.ok ? "good" : "bad"}>●</span> ${item.value == null
          ? DASH
          : item.value.toLocaleString(locale, { maximumFractionDigits: 3 })}`;
    const row = (label: Key, item: ConfigItem, extra?: string) => html`<tr>
      <td>${this._t(label)}</td>
      <td>
        ${item.entity_id ?? (item.key === "target" || item.key === "fuel_price" ? this._t("fixed_value") : DASH)}
        ${dot(item)}${extra ? html` <small>${extra}</small>` : nothing}</td>
    </tr>`;
    const item = (key: ConfigItem["key"]) => c.config.find((i) => i.key === key)!;
    return html`<div class="card">
      <div class="head">
        <span class="label">${this._t("configuration")}</span>
        <a href="/config/integrations/integration/charge_board">${this._t("edit")} ↗</a>
      </div>
      <table class="cfg">
        <tbody>
          <tr>
            <td>${this._t("cfg_capacity")}</td>
            <td>${c.capacity_kwh == null ? DASH : `${c.capacity_kwh.toLocaleString(locale)} kWh`}</td>
          </tr>
          ${row("cfg_soc_entity", item("soc_entity"))}
          ${row(
            "cfg_target",
            item("target"),
            this._t(c.target_source === "home" ? "target_home" : "target_vehicle"),
          )}
          ${row("cfg_odometer_entity", item("odometer_entity"))} ${row("cfg_fuel_price", item("fuel_price"))}
          <tr>
            <td>${this._t("cfg_fuel_l100")}</td>
            <td>${c.fuel_l100 == null ? DASH : `${c.fuel_l100.toLocaleString(locale)} L/100 km`}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
  }

  static styles = [
    cardStyles,
    css`
      .line {
        width: 100%;
        height: 90px;
      }
      .line path {
        fill: none;
        stroke: var(--info-color, #3b82f6);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
      }
      rect.band {
        fill: var(--success-color, #22c55e);
        opacity: 0.25;
      }
      span.band {
        color: var(--success-color, #22c55e);
      }
      .axis,
      .head {
        display: flex;
        justify-content: space-between;
      }
      .axis {
        font-size: 0.75em;
        color: var(--secondary-text-color);
      }
      .head a {
        color: var(--primary-color);
        text-decoration: none;
      }
      .flat {
        border: none;
        margin: 0;
      }
      table.cfg td:first-child {
        color: var(--secondary-text-color);
      }
      table.cfg tr {
        border: none;
      }
    `,
  ];
}

customElements.define("charge-board-vehicles", ChargeBoardVehicles);
