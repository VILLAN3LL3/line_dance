import React, { useId } from "react";

import { toBars } from "../model/dashboard";
import type { StatisticsItem } from "../../../types";

interface StatBarListProps {
  title: string;
  items: readonly StatisticsItem[];
  total: number;
  note?: string;
}

/** One statistic as horizontal bars; label and numbers are text, the bar is decoration. */
export const StatBarList: React.FC<StatBarListProps> = ({ title, items, total, note }) => {
  const headingId = useId();
  const bars = toBars(items, total);

  return (
    <section className="stat-card" aria-labelledby={headingId}>
      <h3 id={headingId} className="stat-card-title">
        {title}
      </h3>
      <ul className="stat-bars">
        {bars.map((bar) => (
          <li key={bar.key} className="stat-bar-row">
            <span className="stat-bar-label">{bar.label}</span>
            <span className="stat-bar-track" aria-hidden="true">
              <span className="stat-bar-fill" style={{ width: `${bar.widthPercent}%` }} />
            </span>
            <span className="stat-bar-value">
              {bar.count} <span className="stat-bar-share">({bar.shareText})</span>
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="stat-note">{note}</p>}
    </section>
  );
};
