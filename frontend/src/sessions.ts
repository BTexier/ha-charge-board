import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import {
  getOverview,
  getSessions,
  type HomeAssistant,
  type Overview,
  type Session,
  type SessionsSummary,
} from "./api";
import { DASH, formatCost, formatDayTime, formatDuration, formatEnergy, formatPercent, formatSoc, monthOf } from "./format";
import { errorKey, langOf, localeOf, t, type Key } from "./i18n";
import "./session-detail";

/** Sessions tab: filters, month summary, list on the left, detail on the right. */
export class ChargeBoardSessions extends LitElement {
  static properties = {
    hass: { attribute: false },
    version: { type: Number },
    _sessions: { state: true },
    _summary: { state: true },
    _overview: { state: true },
    _error: { state: true },
    _message: { state: true },
    _vehicle: { state: true },
    _charger: { state: true },
    _month: { state: true },
    _selected: { state: true },
  };

  hass!: HomeAssistant;
  version = 0;
  private _sessions?: Session[];
  private _summary?: SessionsSummary;
  private _overview?: Overview;
  private _error?: Key; // the list could not be loaded
  private _message?: Key; // a correction was refused
  private _vehicle = "";
  private _charger = "";
  private _month?: string; // "" = all months; set to the current month on first render
  private _selected?: string;
  private _req = 0;

  protected willUpdate() {
    if (this._month === undefined && this.hass) {
      this._month = monthOf(Date.now() / 1000, this.hass.config.time_zone);
    }
  }

  protected updated(changed: PropertyValues) {
    if (["version", "_vehicle", "_charger", "_month"].some((k) => changed.has(k)) && this.hass) this._fetch();
  }

  private async _fetch() {
    const req = ++this._req; // a slow response must not overwrite a newer one
    const filter = {
      ...(this._vehicle && { vehicle_id: this._vehicle }),
      ...(this._charger && { charger_id: this._charger }),
      ...(this._month && { month: this._month }),
    };
    try {
      const [list, overview] = await Promise.all([getSessions(this.hass, filter), getOverview(this.hass)]);
      if (req !== this._req) return;
      this._sessions = list.sessions;
      this._summary = list.summary;
      this._overview = overview;
      this._error = undefined;
    } catch (err) {
      if (req === this._req) this._error = errorKey(err);
    }
  }

  private _t(key: Key, vars?: Record<string, string>) {
    return t(langOf(this.hass), key, vars);
  }

  private _changed(e: CustomEvent<{ id?: string; error?: Key }>) {
    this._selected = e.detail.id;
    this._message = e.detail.error;
    this._fetch();
  }

  render() {
    if (this._error && !this._sessions) return html`<p class="message">${this._t(this._error)}</p>`;
    if (!this._sessions || !this._overview) return html`<p class="message">${this._t("loading")}</p>`;
    const ov = this._overview;
    const select = (value: string, all: Key, items: { id: string; name: string }[], set: (v: string) => void) =>
      html`<select @change=${(e: Event) => set((e.target as HTMLSelectElement).value)}>
        <option value="" ?selected=${!value}>${this._t(all)}</option>
        ${items.map((i) => html`<option value=${i.id} ?selected=${i.id === value}>${i.name}</option>`)}
      </select>`;
    return html`
      <div class="filters">
        ${select(this._vehicle, "all_vehicles", ov.vehicles, (v) => (this._vehicle = v))}
        ${select(this._charger, "all_chargers", ov.chargers, (v) => (this._charger = v))}
        <input
          type="month"
          aria-label=${this._t("month")}
          .value=${this._month ?? ""}
          @change=${(e: Event) => (this._month = (e.target as HTMLInputElement).value)}
        />
      </div>
      ${this._error ? html`<p class="error">${this._t(this._error)}</p>` : nothing}
      ${this._message ? html`<p class="error">${this._t(this._message)}</p>` : nothing}
      <div class="layout ${this._selected ? "has-detail" : ""}">
        <div class="list">${this._banner()} ${this._table()}</div>
        ${this._selected
          ? html`<charge-board-session-detail
              .hass=${this.hass}
              .sessionId=${this._selected}
              .version=${this.version}
              .currency=${ov.currency}
              .vehicles=${ov.vehicles}
              @session-changed=${this._changed}
              @back=${() => (this._selected = undefined)}
            ></charge-board-session-detail>`
          : nothing}
      </div>
    `;
  }

  private _banner() {
    const s = this._summary!;
    const locale = localeOf(this.hass);
    let cost = formatCost(s.cost, this._overview!.currency, locale);
    if (s.cost != null && s.unpriced_count > 0) cost = `≥ ${cost}`; // some sessions have no price
    const month = this._month
      ? new Date(`${this._month}-15T12:00:00Z`).toLocaleString(locale, {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : null;
    const parts = [
      month,
      this._t("sessions_count", { n: String(s.count) }),
      formatEnergy(s.energy_kwh, locale),
      html`<b>${cost}</b>`,
      s.off_peak_share == null ? DASH : this._t("off_peak_short", { share: formatPercent(s.off_peak_share, locale) }),
    ].filter((p) => p != null);
    return html`<div class="banner">${parts.map((p, i) => html`${i ? " · " : ""}${p}`)}</div>`;
  }

  private _table() {
    const list = this._sessions!;
    if (!list.length) return html`<p class="message">${this._t("no_sessions")}</p>`;
    const locale = localeOf(this.hass);
    const tz = this.hass.config.time_zone;
    const when = (ts: number | null) => (ts == null ? DASH : formatDayTime(ts, locale, tz));
    const cols: Key[] = ["col_start", "col_end", "col_vehicle", "col_battery", "col_kwh", "col_duration", "col_cost"];
    const unpriced = this._summary!.unpriced_count;
    return html`
      <div class="scroll">
        <table>
          <thead>
            <tr>${cols.map((c) => html`<th>${this._t(c)}</th>`)}</tr>
          </thead>
          <tbody>
            ${list.map(
              (s) => html`<tr
                class=${s.id === this._selected ? "selected" : ""}
                tabindex="0"
                @click=${() => (this._selected = s.id)}
                @keydown=${(e: KeyboardEvent) => e.key === "Enter" && (this._selected = s.id)}
              >
                <td>${when(s.charge_start)}</td>
                <td>${when(s.charge_end)}</td>
                <td>${s.vehicle_name ?? DASH}</td>
                <td>${formatSoc(s.soc_start, s.soc_end)}</td>
                <td>${s.energy_kwh.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                <td>${formatDuration(s.charging_s, langOf(this.hass))}</td>
                <td>
                  ${formatCost(s.cost, this._overview!.currency, locale)}${s.estimated ? " *" : ""}
                  ${s.edited ? html`<span class="badge">${this._t("edited")}</span>` : nothing}
                </td>
              </tr>`,
            )}
          </tbody>
        </table>
      </div>
      <div class="note">
        ${this._t("estimated_note")}${unpriced ? html` · ${this._t("unpriced_note", { n: String(unpriced) })}` : nothing}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .message,
    .note {
      color: var(--secondary-text-color);
    }
    .message {
      text-align: center;
    }
    .note {
      font-size: 0.85em;
      margin-top: 6px;
    }
    .error {
      color: var(--error-color, #db4437);
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    select,
    input {
      font: inherit;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
    }
    .layout {
      display: grid;
      gap: 16px;
      align-items: start;
    }
    .layout.has-detail {
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    }
    .banner,
    .scroll {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    .banner {
      padding: 12px;
      margin-bottom: 8px;
    }
    .scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95em;
    }
    th {
      text-align: left;
      color: var(--secondary-text-color);
      font-weight: 500;
    }
    th,
    td {
      padding: 8px;
      white-space: nowrap;
    }
    tbody tr {
      border-top: 1px solid var(--divider-color, #e0e0e0);
      cursor: pointer;
    }
    tbody tr:hover,
    tbody tr.selected {
      background: var(--secondary-background-color, #f5f5f5);
    }
    tbody tr:focus-visible {
      outline: 2px solid var(--primary-color);
    }
    .badge {
      margin-left: 4px;
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 0.8em;
      background: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
    /* One column: the detail replaces the list (back button in the detail). */
    @media (max-width: 900px) {
      .layout.has-detail {
        grid-template-columns: 1fr;
      }
      .layout.has-detail .list {
        display: none;
      }
    }
    @media (max-width: 600px) {
      :host {
        padding: 8px;
      }
    }
  `;
}

customElements.define("charge-board-sessions", ChargeBoardSessions);
