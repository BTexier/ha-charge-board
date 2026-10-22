import { LitElement, css, html, type PropertyValues } from "lit";
import { subscribeUpdates, type HomeAssistant } from "./api";
import { langOf, t, type Key } from "./i18n";
import "./overview";

const MENU_ICON =
  "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"; // mdi:menu

type Tab = "overview" | "sessions";

/** Sidebar panel "Recharge": toolbar, tabs, and the selected tab. */
class ChargeBoardPanel extends LitElement {
  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    route: { attribute: false },
    panel: { attribute: false },
    _tab: { state: true },
    _version: { state: true },
  };

  hass!: HomeAssistant;
  narrow = false;
  route?: unknown;
  panel?: unknown;
  private _tab: Tab = "overview";
  /** Bumped on every charge_board/subscribe event; tabs re-fetch when it changes. */
  private _version = 0;
  private _unsub?: Promise<() => Promise<void>>;

  connectedCallback() {
    super.connectedCallback();
    this._subscribe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsub?.then((unsub) => unsub()).catch(() => undefined);
    this._unsub = undefined;
  }

  protected updated(changed: PropertyValues) {
    if (changed.has("hass")) this._subscribe();
  }

  private _subscribe() {
    if (!this.hass || this._unsub) return;
    this._unsub = subscribeUpdates(this.hass, () => this._version++);
    // Not loaded: the tabs show the error from their own fetch; no retry loop.
    this._unsub.catch(() => undefined);
  }

  private _t(key: Key) {
    return t(langOf(this.hass), key);
  }

  private _toggleMenu() {
    this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass) return html``;
    const tabs: Tab[] = ["overview", "sessions"];
    return html`
      <header>
        <div class="toolbar">
          ${this.narrow
            ? html`<button class="menu" aria-label=${this._t("menu")} @click=${this._toggleMenu}>
                <svg viewBox="0 0 24 24"><path d=${MENU_ICON}></path></svg>
              </button>`
            : html``}
          <div class="title">${this._t("title")}</div>
        </div>
        <nav role="tablist">
          ${tabs.map(
            (tab) => html`<button
              role="tab"
              aria-selected=${this._tab === tab}
              @click=${() => (this._tab = tab)}
            >
              ${this._t(tab === "overview" ? "tab_overview" : "tab_sessions")}
            </button>`,
          )}
        </nav>
      </header>
      <main>
        ${this._tab === "overview"
          ? html`<charge-board-overview .hass=${this.hass} .version=${this._version}></charge-board-overview>`
          : html`<p class="placeholder">${this._t("sessions_soon")}</p>`}
      </main>
    `;
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, inherit);
    }
    header {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, var(--text-primary-color, #fff));
      border-bottom: var(--app-header-border-bottom, none);
      padding-top: env(safe-area-inset-top);
    }
    .toolbar {
      display: flex;
      align-items: center;
      height: 56px;
      padding: 0 12px;
      gap: 12px;
    }
    .title {
      font-size: 20px;
      font-weight: 400;
      margin-left: 12px;
    }
    .menu + .title {
      margin-left: 0;
    }
    button {
      all: unset;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 2px solid currentColor;
    }
    .menu {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .menu svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }
    nav {
      display: flex;
      padding: 0 12px;
    }
    nav button {
      padding: 12px 16px;
      text-transform: uppercase;
      font-size: 14px;
      font-weight: 500;
      opacity: 0.7;
      border-bottom: 2px solid transparent;
    }
    nav button[aria-selected="true"] {
      opacity: 1;
      border-bottom-color: currentColor;
    }
    .placeholder {
      text-align: center;
      color: var(--secondary-text-color);
    }
  `;
}

customElements.define("charge-board-panel", ChargeBoardPanel);
