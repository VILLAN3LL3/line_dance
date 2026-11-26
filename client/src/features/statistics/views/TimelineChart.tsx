import React from "react";

import { toMonthColumns } from "../model/dashboard";
import type { StatisticsMonth } from "../../../types";

interface TimelineChartProps {
  months: readonly StatisticsMonth[];
  undated: number;
}

/** Learned dances and practices per month, the size of the repertoire over time and a table. */
export const TimelineChart: React.FC<TimelineChartProps> = ({ months, undated }) => {
  const columns = toMonthColumns(months);

  return (
    <section className="stat-card stat-timeline" aria-labelledby="stat-timeline-title">
      <h3 id="stat-timeline-title" className="stat-card-title">
        Over time
      </h3>
      {columns.length === 0 ? (
        <p className="stat-note">No dated learning or practice yet.</p>
      ) : (
        <>
          <ul className="stat-legend" aria-hidden="true">
            <li>
              <span className="stat-swatch stat-swatch-learned" /> Learned per month
            </li>
            <li>
              <span className="stat-swatch stat-swatch-practice" /> Practices per month
            </li>
            <li>
              <span className="stat-swatch stat-swatch-total" /> Repertoire size
            </li>
          </ul>
          <div className="stat-columns" aria-hidden="true">
            {columns.map((column) => (
              <div key={column.month} className="stat-column" title={column.description}>
                <div className="stat-column-bars">
                  <span
                    className="stat-column-bar stat-column-learned"
                    style={{ height: `${column.learnedPercent}%` }}
                  />
                  <span
                    className="stat-column-bar stat-column-practice"
                    style={{ height: `${column.practicesPercent}%` }}
                  />
                  <span
                    className="stat-column-bar stat-column-total"
                    style={{ height: `${column.totalPercent}%` }}
                  />
                </div>
                <span className="stat-column-label">{column.label}</span>
              </div>
            ))}
          </div>
          <details className="stat-details">
            <summary>Show as table</summary>
            <table className="stat-table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Learned</th>
                  <th scope="col">Practices</th>
                  <th scope="col">Learned in total</th>
                </tr>
              </thead>
              <tbody>
                {[...columns].reverse().map((column) => (
                  <tr key={column.month}>
                    <th scope="row">{column.label}</th>
                    <td>{column.learned}</td>
                    <td>{column.practices}</td>
                    <td>{column.totalLearned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
      {undated > 0 && (
        <p className="stat-note">
          {undated === 1 ? "1 learned dance has" : `${undated} learned dances have`} no learning
          date and counts as learned before the first month.
        </p>
      )}
    </section>
  );
};
