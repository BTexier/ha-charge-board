import { css } from "lit";

/** Shared look of the Statistics and Vehicles tabs: filters, cards, figures, tables. */
export const cardStyles = css`
  :host {
    display: block;
    padding: 16px;
    max-width: 1100px;
    margin: 0 auto;
  }
  .message,
  .note,
  .label,
  small {
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
  button.chip {
    font: inherit;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color);
    cursor: pointer;
  }
  button.chip[aria-pressed="true"] {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  .card,
  .scroll {
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: var(--ha-card-border-radius, 12px);
    margin-bottom: 12px;
  }
  .card {
    padding: 12px;
  }
  .label {
    margin-bottom: 8px;
  }
  .figs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    text-align: center;
  }
  .fig b {
    display: block;
    font-size: 1.3em;
  }
  .fig span,
  .fig small {
    display: block;
    font-size: 0.85em;
  }
  .good {
    color: var(--success-color, #16a34a);
  }
  .bad {
    color: var(--error-color, #db4437);
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
  }
  @media (max-width: 600px) {
    :host {
      padding: 8px;
    }
  }
`;
