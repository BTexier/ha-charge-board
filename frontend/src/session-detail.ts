import { LitElement, css, html, nothing, svg, type PropertyValues } from "lit";
import {
  deleteSession,
  getSession,
  getSessions,
  mergeSessions,
  setVehicle,
  splitSession,
  type CorrectionResult,
  type HomeAssistant,
  type Session,
  type TariffSlice,
} from "./api";
import { bandsFor, pathFor, timeAt } from "./chart";
import {
  DASH,
  formatCost,
  formatDayTime,
  formatDuration,
  formatEnergy,
  formatPower,
  formatSoc,
  formatTime,
  formatWhen,
} from "./format";
import { errorKey, langOf, localeOf, t, type Key } from "./i18n";

const W = 600; // chart viewBox; stretched to the element width
const H = 160;

type Pending = { kind: "delete" } | { kind: "split"; at: number };

/**
 * Detail of a finished session with its corrections. Fires `session-changed` ({id, error})
 * after a correction (id = session to show next, none when deleted) and `back` (narrow screens).
 */
export class ChargeBoardSessionDetail extends LitElement {
  static properties = {
    hass: { attribute: false },
    sessionId: { attribute: false },
    version: { type: Number },
    currency: { attribute: false },
    vehicles: { attribute: false },
    _s: { state: true },
    _prev: { state: true },
    _next: { state: true },
    _pending: { state: true },
    _busy: { state: true },
  };

  hass!: HomeAssistant;
  sessionId!: string;
  version = 0;
  currency = "EUR";
  vehicles: { id: string; name: string }[] = [];
  private _s?: Session;
  private _prev?: string; // neighbours on the same charger, for merging
  private _next?: string;
  private _pending?: Pending;
  private _busy = false;
  private _req = 0;

  protected updated(changed: PropertyValues) {
    if (changed.has("sessionId")) {
      this._s = undefined;
      this._pending = undefined;
    }
    if ((changed.has("sessionId") || changed.has("version")) && this.hass) this._fetch();
  }

  private async _fetch() {
    const req = ++this._req;
    try {
      const s = await getSession(this.hass, this.sessionId);
      // All the charger's sessions (any month or vehicle): neighbours as the server sees them.
      const { sessions } = await getSessions(this.hass, { charger_id: s.charger_id });
      if (req !== this._req) return;
      const start = (x: Session) => x.charge_start ?? x.plugged_at ?? 0;
      const sorted = [...sessions].sort((a, b) => start(a) - start(b));
      const i = sorted.findIndex((x) => x.id === s.id);
      this._prev = i > 0 ? sorted[i - 1].id : undefined;
      this._next = i >= 0 && i + 1 < sorted.length ? sorted[i + 1].id : undefined;
      this._s = s;
    } catch (err) {
      // Could not load it (gone, or in progress): close the detail and say why.
      if (req === this._req) this._emit("session-changed", { id: undefined, error: errorKey(err) });
    }
  }

  private _emit(type: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** Run a correction, then let the list refresh (and show the error, if any). */
  private async _run(action: () => Promise<CorrectionResult>) {
    this._pending = undefined;
    this._busy = true;
    try {
      const { sessions } = await action();
      this._emit("session-changed", { id: sessions[0] });
      if (sessions[0] === this.sessionId) this._fetch();
    } catch (err) {
      const error = errorKey(err);
      this._emit("session-changed", { id: error === "err_not_found" ? undefined : this.sessionId, error });
      this._fetch();
    } finally {
      this._busy = false;
    }
  }

  private _t(key: Key, vars?: Record<string, string>) {
    return t(langOf(this.hass), key, vars);
  }

  private get _range() {
    const s = this._s!;
    const start = s.charge_start ?? s.curve[0]?.t ?? 0;
    return { start, end: Math.max(s.charge_end ?? start, start + 1) };
  }

  private _chartClick(e: MouseEvent) {
    const s = this._s!;
    if (s.open) return;
    const box = (e.currentTarget as SVGElement).getBoundingClientRect();
    const { start, end } = this._range;
    const at = Math.round(timeAt(e.clientX - box.left, box.width, start, end));
    if (start < at && at < end) this._pending = { kind: "split", at };
  }

  render() {
    if (!this._s) return html`<div class="card"><p class="muted">${this._t("loading")}</p></div>`;
    const s = this._s;
    const locale = localeOf(this.hass);
    const tz = this.hass.config.time_zone;
    const ref = s.charge_start ?? undefined;
    const when = (ts: number | null) => (ts == null ? DASH : formatWhen(ts, locale, tz, ref));
    const cost = (v: number | null) => formatCost(v, this.currency, locale);
    const average = s.charging_s > 0 ? (s.energy_kwh * 3.6e6) / s.charging_s : null;
    const plugged = s.plugged_at != null && s.unplugged_at != null ? s.unplugged_at - s.plugged_at : null;
    const lang = langOf(this.hass);
    const head = [
      s.charge_start != null ? this._t("session_of", { day: formatDayTime(s.charge_start, locale, tz) }) : null,
      s.vehicle_name,
      s.charger_name,
    ].filter(Boolean);
    return html`
      <div class="card">
        <button class="back" @click=${() => this._emit("back")}>← ${this._t("back")}</button>
        <div class="head">
          <b>${head.join(" · ")}</b>
          ${s.edited ? html`<span class="badge">${this._t("edited")}</span>` : nothing}
        </div>
        <div class="figures">
          ${this._figure(formatEnergy(s.energy_kwh, locale), "energy")}
          ${this._figure(`${cost(s.cost)}${s.estimated ? " *" : ""}`, "cost")}
          ${this._figure(formatSoc(s.soc_start, s.soc_end), "battery")}
          ${this._figure(formatPower(average, locale), "average")}
        </div>
        ${this._chart()}
        <table class="facts">
          <tr><td>${this._t("plugged_at")}</td><td>${when(s.plugged_at)}</td></tr>
          <tr><td>${this._t("charge")}</td><td>${when(s.charge_start)} → ${when(s.charge_end)}</td></tr>
          <tr><td>${this._t("unplugged_at")}</td><td>${when(s.unplugged_at)}</td></tr>
          ${this._slices(locale).map(
            ([label, slice]) =>
              html`<tr><td>${label}</td><td>${formatEnergy(slice.kwh, locale)} · ${cost(slice.cost)}</td></tr>`,
          )}
          <tr>
            <td>${this._t("charging_time")}</td>
            <td>
              ${formatDuration(s.charging_s, lang)}
              ${plugged == null ? nothing : html` / ${this._t("plugged_time", { time: formatDuration(plugged, lang) })}`}
            </td>
          </tr>
        </table>
        ${s.open ? html`<p class="muted">${this._t("in_progress_note")}</p>` : this._actions()}
      </div>
    `;
  }

  private _figure(value: string, label: Key) {
    return html`<div><div class="value">${value}</div><div class="muted">${this._t(label)}</div></div>`;
  }

  /** Energy and cost per tariff: off-peak / peak with an off-peak source, else per price. */
  private _slices(locale: string): [string, TariffSlice][] {
    const s = this._s!;
    if (s.has_off_peak_source) {
      return [
        [this._t("off_peak_slice"), s.off_peak],
        [this._t("peak_slice"), s.peak],
      ];
    }
    return Object.entries(s.by_price).map(([price, slice]) => [
      price === "none"
        ? this._t("unknown_price")
        : this._t("price_slice", {
            price: new Intl.NumberFormat(locale, {
              style: "currency",
              currency: this.currency,
              maximumFractionDigits: 4,
            }).format(Number(price)),
          }),
      slice,
    ]);
  }

  private _chart() {
    const s = this._s!;
    const { start, end } = this._range;
    const x = (ts: number) => ((ts - start) / (end - start)) * W;
    const locale = localeOf(this.hass);
    const tz = this.hass.config.time_zone;
    const max = Math.max(0, ...s.curve.map((p) => p.w));
    const split = this._pending?.kind === "split" ? this._pending.at : undefined;
    return html`
      <svg
        class="chart ${s.open ? "" : "clickable"}"
        viewBox="0 0 ${W} ${H}"
        preserveAspectRatio="none"
        role="img"
        @click=${this._chartClick}
      >
        ${s.has_off_peak_source
          ? svg`<rect class="peak" x="0" y="0" width=${W} height=${H}></rect>
              ${bandsFor(s.curve, end).map(
                (b) => svg`<rect class="off-peak" x=${x(b.from)} y="0" width=${x(b.to) - x(b.from)} height=${H}></rect>`,
              )}`
          : nothing}
        <path class="line" d=${pathFor(s.curve, W, H - 4, start, end)} transform="translate(0 4)"></path>
        ${split == null ? nothing : svg`<line class="cut" x1=${x(split)} x2=${x(split)} y1="0" y2=${H}></line>`}
      </svg>
      <div class="axis muted">
        <span>${formatTime(start, locale, tz)}</span>
        <span>${max ? `max ${formatPower(max, locale)}` : ""}</span>
        <span>${formatTime(end, locale, tz)}</span>
      </div>
      ${s.has_off_peak_source
        ? html`<div class="legend muted">
            <span><i class="off-peak"></i>${this._t("off_peak_slice")}</span>
            <span><i class="peak"></i>${this._t("peak_slice")}</span>
          </div>`
        : nothing}
    `;
  }

  private _actions() {
    const s = this._s!;
    const id = s.id;
    const p = this._pending;
    const tz = this.hass.config.time_zone;
    const confirm = (text: string, run: () => Promise<CorrectionResult>) => html`
      <div class="confirm">
        <span>${text}</span>
        <button class="primary" ?disabled=${this._busy} @click=${() => this._run(run)}>${this._t("confirm")}</button>
        <button @click=${() => (this._pending = undefined)}>${this._t("cancel")}</button>
      </div>
    `;
    return html`
      <p class="muted">${this._t("chart_hint")}</p>
      ${p?.kind === "split"
        ? confirm(
            this._t("confirm_split", { time: formatWhen(p.at, localeOf(this.hass), tz, s.charge_start ?? undefined) }),
            () => splitSession(this.hass, id, p.at),
          )
        : nothing}
      ${p?.kind === "delete" ? confirm(this._t("confirm_delete"), () => deleteSession(this.hass, id)) : nothing}
      <div class="actions">
        <label>
          ${this._t("vehicle")}
          <select
            ?disabled=${this._busy}
            @change=${(e: Event) => {
              const select = e.target as HTMLSelectElement;
              const v = select.value;
              select.value = s.vehicle_id ?? ""; // shows the new vehicle once the server confirms
              if (v && v !== s.vehicle_id) this._run(() => setVehicle(this.hass, id, v));
            }}
          >
            ${s.vehicle_id == null ? html`<option value="" selected>${DASH}</option>` : nothing}
            ${this.vehicles.map((v) => html`<option value=${v.id} .selected=${v.id === s.vehicle_id}>${v.name}</option>`)}
          </select>
        </label>
        <button
          ?disabled=${this._busy || !this._prev}
          @click=${() => this._run(() => mergeSessions(this.hass, id, this._prev!))}
        >
          ${this._t("merge_prev")}
        </button>
        <button
          ?disabled=${this._busy || !this._next}
          @click=${() => this._run(() => mergeSessions(this.hass, id, this._next!))}
        >
          ${this._t("merge_next")}
        </button>
        <button class="danger" ?disabled=${this._busy} @click=${() => (this._pending = { kind: "delete" })}>
          ${this._t("delete")}
        </button>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --cb-off-peak: rgba(3, 155, 229, 0.15);
      --cb-peak: rgba(255, 166, 0, 0.18);
    }
    .card {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 16px;
    }
    .muted {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .badge {
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 0.8em;
      background: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
    .figures {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      text-align: center;
      margin-bottom: 12px;
    }
    .value {
      font-size: 1.1em;
      font-weight: 600;
      white-space: nowrap;
    }
    .chart {
      display: block;
      width: 100%;
      height: 160px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }
    .chart.clickable {
      cursor: crosshair;
    }
    .line {
      fill: none;
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
    }
    rect.off-peak,
    i.off-peak {
      fill: var(--cb-off-peak);
      background: var(--cb-off-peak);
    }
    rect.peak,
    i.peak {
      fill: var(--cb-peak);
      background: var(--cb-peak);
    }
    .cut {
      stroke: var(--error-color, #db4437);
      stroke-width: 2;
      stroke-dasharray: 4 3;
      vector-effect: non-scaling-stroke;
    }
    .axis,
    .legend {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }
    .legend {
      justify-content: flex-start;
      gap: 16px;
    }
    .legend i {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 4px;
      vertical-align: middle;
      border: 1px solid var(--divider-color, #e0e0e0);
    }
    .facts {
      width: 100%;
      margin: 12px 0;
      border-collapse: collapse;
    }
    .facts td {
      padding: 4px 0;
    }
    .facts td:first-child {
      color: var(--secondary-text-color);
      padding-right: 12px;
    }
    .actions,
    .confirm {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .confirm {
      padding: 8px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: var(--secondary-background-color, #f5f5f5);
    }
    .confirm span {
      flex: 1 1 100%;
    }
    button,
    select {
      font: inherit;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      cursor: pointer;
    }
    select {
      margin-left: 4px;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    button.danger {
      color: var(--error-color, #db4437);
    }
    .back {
      display: none;
      margin-bottom: 8px;
    }
    @media (max-width: 900px) {
      .back {
        display: inline-block;
      }
    }
    @media (max-width: 600px) {
      .figures {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `;
}

customElements.define("charge-board-session-detail", ChargeBoardSessionDetail);
