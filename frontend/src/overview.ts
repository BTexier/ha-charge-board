import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { getOverview, type ChargerOverview, type HomeAssistant, type Overview } from "./api";
import {
  DASH,
  formatCost,
  formatDay,
  formatEnergy,
  formatPercent,
  formatPower,
  formatSoc,
  formatTime,
  formatWhen,
} from "./format";
import { langOf, localeOf, t, type Key } from "./i18n";

const STATE_COLOR = {
  charging: "var(--success-color, #43a047)",
  plugged: "var(--info-color, #039be5)",
  free: "var(--disabled-text-color, #9e9e9e)",
};

export class ChargeBoardOverview extends LitElement {
  static properties = {
    hass: { attribute: false },
    version: { type: Number },
    _data: { state: true },
    _error: { state: true },
    _open: { state: true },
  };

  hass!: HomeAssistant;
  /** Bumped by the panel on every update event: triggers a re-fetch. */
  version = 0;
  private _data?: Overview;
  private _error?: string;
  private _open?: string; // charger shown in the dialog (compact style)

  protected updated(changed: PropertyValues) {
    if (changed.has("version") && this.hass) this._fetch();
    if (changed.has("_open") && this._open) this.renderRoot.querySelector("dialog")?.showModal();
  }

  private async _fetch() {
    try {
      this._data = await getOverview(this.hass);
      this._error = undefined;
    } catch (err) {
      this._error = (err as { code?: string }).code === "not_loaded" ? "not_loaded" : "error";
    }
  }

  private _t(key: Key, vars?: Record<string, string>) {
    return t(langOf(this.hass), key, vars);
  }

  render() {
    if (this._error) return html`<p class="message">${this._t(this._error as Key)}</p>`;
    if (!this._data) return html`<p class="message">${this._t("loading")}</p>`;
    const { chargers, style } = this._data;
    if (!chargers.length) return html`<p class="message">${this._t("no_chargers")}</p>`;
    if (style !== "compact") {
      return html`<div class="grid">${chargers.map((c) => this._card(c))}</div>`;
    }
    const open = chargers.find((c) => c.id === this._open);
    return html`
      <div class="grid compact">${chargers.map((c) => this._tile(c))}</div>
      ${open
        ? html`<dialog @close=${() => (this._open = undefined)} @click=${this._backdropClose}>
            <div class="dialog-bar">
              <button aria-label=${this._t("close")} @click=${this._close}>×</button>
            </div>
            ${this._card(open)}
          </dialog>`
        : nothing}
    `;
  }

  private _backdropClose(e: MouseEvent) {
    if (e.target === e.currentTarget) this._close();
  }

  private _close() {
    this.renderRoot.querySelector("dialog")?.close();
  }

  private get _fmt() {
    const locale = localeOf(this.hass);
    const tz = this.hass.config.time_zone;
    return {
      locale,
      when: (ts: number) => formatWhen(ts, locale, tz),
      time: (ts: number) => formatTime(ts, locale, tz),
      day: (ts: number) => formatDay(ts, locale, tz),
      cost: (v: number | null | undefined) => formatCost(v, this._data!.currency, locale),
    };
  }

  private _stateLabel(c: ChargerOverview) {
    return this._t(c.state);
  }

  /** A free charger without a session in progress shows its last session instead. */
  private _idle(c: ChargerOverview) {
    return c.state === "free" && !c.session;
  }

  private _card(c: ChargerOverview) {
    const f = this._fmt;
    const s = c.session;
    const soc = c.vehicle?.soc ?? null;
    const footer = s
      ? [
          s.plugged_at != null ? this._t("plugged_since", { time: f.when(s.plugged_at) }) : null,
          s.charge_start != null
            ? this._t(c.state === "charging" ? "charging_since" : "charge_started", {
                time: f.when(s.charge_start),
              })
            : null,
          s.has_off_peak_source && s.energy_kwh > 0
            ? this._t("off_peak", { share: formatPercent(s.off_peak.kwh / s.energy_kwh, f.locale) })
            : null,
        ].filter(Boolean)
      : [];
    return html`
      <ha-card class="card" style="--state:${STATE_COLOR[c.state]}">
        <div class="head">
          <span class="name"><ha-icon icon="mdi:ev-station"></ha-icon>${c.name}</span>
          <span class="state">${this._stateLabel(c)}</span>
        </div>
        ${this._idle(c)
          ? html`<div class="muted">${this._lastSession(c)}</div>`
          : html`
              <div class="vehicle">
                <ha-icon icon="mdi:car-electric"></ha-icon>
                <b>${c.vehicle?.name ?? DASH}</b> ·
                ${soc == null ? DASH : formatSoc(soc, c.vehicle?.target)}
              </div>
              ${soc == null
                ? nothing
                : html`<div class="bar"><div style="width:${Math.min(100, Math.max(0, soc))}%"></div></div>`}
              <div class="stats">
                ${this._stat(formatPower(c.power_w, f.locale), "power")}
                ${this._stat(formatEnergy(s?.energy_kwh, f.locale), "session")}
                ${this._stat(f.cost(s?.cost), "cost")}
                ${c.estimated_end == null ? nothing : this._stat(f.time(c.estimated_end), "end")}
              </div>
              ${footer.length ? html`<div class="muted">${footer.join(" · ")}</div>` : nothing}
            `}
      </ha-card>
    `;
  }

  private _stat(value: string, label: Key) {
    return html`<div><div class="value">${value}</div><div class="muted">${this._t(label)}</div></div>`;
  }

  private _lastSession(c: ChargerOverview) {
    const s = c.last_session;
    if (!s) return this._t("no_session");
    const f = this._fmt;
    const start = s.charge_start ?? s.plugged_at;
    const summary = [
      s.vehicle_name ?? DASH,
      start != null ? f.day(start) : null,
      formatEnergy(s.energy_kwh, f.locale),
      f.cost(s.cost),
    ].filter(Boolean);
    return this._t("last_session", { summary: summary.join(" · ") });
  }

  private _tile(c: ChargerOverview) {
    const f = this._fmt;
    const soc = this._idle(c) ? null : (c.vehicle?.soc ?? null);
    const gauge = soc == null ? "0" : String(Math.min(100, Math.max(0, soc)));
    const center = this._idle(c) ? this._t("free").toLowerCase() : soc == null ? DASH : `${Math.round(soc)} %`;
    const details = [
      formatPower(c.power_w, f.locale),
      f.cost(c.session?.cost),
      c.estimated_end == null ? null : this._t("end_short", { time: f.time(c.estimated_end) }),
    ].filter(Boolean);
    return html`
      <ha-card class="tile" style="--state:${STATE_COLOR[c.state]}">
        <button @click=${() => (this._open = c.id)}>
          <div class="gauge" style="--soc:${gauge}%"><span>${center}</span></div>
          <b>${c.name}</b>
          ${this._idle(c)
            ? html`<div class="muted">${this._t("no_vehicle")}</div>`
            : html`
                <div>${c.vehicle?.name ?? DASH} · ${this._stateLabel(c).toLowerCase()}</div>
                <div class="muted">${details.join(" · ")}</div>
              `}
        </button>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    .message {
      color: var(--secondary-text-color);
      text-align: center;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .grid.compact {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    @media (max-width: 600px) {
      :host {
        padding: 8px;
      }
      .grid,
      .grid.compact {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }
    ha-card {
      display: block;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      border-radius: var(--ha-card-border-radius, 12px);
      box-shadow: var(--ha-card-box-shadow, none);
      border: 1px solid var(--divider-color, #e0e0e0);
    }
    .card {
      padding: 16px;
      border-left: 5px solid var(--state);
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .name,
    .vehicle {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .state {
      color: var(--state);
      white-space: nowrap;
    }
    .state::before {
      content: "● ";
    }
    .vehicle {
      margin: 12px 0 6px;
    }
    ha-icon {
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
    }
    .bar {
      height: 10px;
      border-radius: 5px;
      background: var(--divider-color, #e0e0e0);
      overflow: hidden;
    }
    .bar > div {
      height: 100%;
      background: var(--state);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
      gap: 8px;
      margin: 12px 0 8px;
      text-align: center;
    }
    .value {
      font-size: 1.15em;
      font-weight: 600;
      white-space: nowrap;
    }
    .muted {
      color: var(--secondary-text-color);
      font-size: 0.9em;
      margin-top: 4px;
    }
    .tile > button {
      all: unset;
      box-sizing: border-box;
      display: block;
      width: 100%;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      border-radius: inherit;
    }
    .tile > button:focus-visible {
      outline: 2px solid var(--primary-color);
    }
    .gauge {
      width: 72px;
      height: 72px;
      margin: 0 auto 8px;
      border-radius: 50%;
      background: conic-gradient(var(--state) var(--soc), var(--divider-color, #e0e0e0) 0);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .gauge span {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--card-background-color, #fff);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }
    dialog {
      border: none;
      padding: 0;
      width: min(480px, calc(100vw - 32px));
      background: transparent;
      color: var(--primary-text-color);
    }
    dialog::backdrop {
      background: rgba(0, 0, 0, 0.5);
    }
    .dialog-bar {
      text-align: right;
    }
    .dialog-bar button {
      all: unset;
      cursor: pointer;
      font-size: 28px;
      line-height: 1;
      padding: 4px 8px;
      color: #fff;
    }
  `;
}

customElements.define("charge-board-overview", ChargeBoardOverview);
