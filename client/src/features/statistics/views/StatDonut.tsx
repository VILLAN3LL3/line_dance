import React, { useId } from "react";

import { donutBackground, toDonutSlices } from "../model/dashboard";
import type { StatisticsItem } from "../../../types";

interface StatDonutProps {
  title: string;
  items: readonly StatisticsItem[];
  note?: string;
}

/** A statistic as donut with a legend; the legend carries the numbers, the donut is decoration. */
export const StatDonut: React.FC<StatDonutProps> = ({ title, items, note }) => {
  const headingId = useId();
  const slices = toDonutSlices(items);
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <section className="stat-card" aria-labelledby={headingId}>
      <h3 id={headingId} className="stat-card-title">
        {title}
      </h3>
      <div className="stat-donut-layout">
        <div
          className="stat-donut"
          style={{ background: donutBackground(slices) }}
          aria-hidden="true"
        >
          <span className="stat-donut-total">{total}</span>
        </div>
        <ul className="stat-legend-list">
          {slices.map((slice) => (
            <li key={slice.key} className="stat-legend-row">
              <span
                className="stat-legend-swatch"
                style={{ background: slice.color }}
                aria-hidden="true"
              />
              <span className="stat-legend-label">{slice.label}</span>
              <span className="stat-bar-value">
                {slice.count} <span className="stat-bar-share">({slice.shareText})</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {note && <p className="stat-note">{note}</p>}
    </section>
  );
};
