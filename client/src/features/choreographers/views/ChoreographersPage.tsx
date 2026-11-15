import "../../../styles/ChoreographersPage.css";

import React from "react";

import { EmptyState, ErrorMessage, LoadingState } from "../../../shared/ui";
import { useChoreographersViewModel } from "../viewmodels/useChoreographersViewModel";

const ChoreographersPage: React.FC = () => {
  const { state, actions } = useChoreographersViewModel();
  const { rows, levelNames, activeLevels, sort } = state;

  const sortIndicator = (field: "name" | "total") => {
    if (sort.field !== field) return <span className="sort-indicator">↕</span>;
    return <span className="sort-indicator">{sort.dir === "asc" ? "↑" : "↓"}</span>;
  };

  if (state.isLoading) return <LoadingState />;
  if (state.error) return <ErrorMessage message={state.error} />;

  return (
    <div className="choreographers-page">
      <div className="choreographers-header">
        <h2>Choreographers</h2>
        <span className="choreographers-count">
          {rows.length} {rows.length === 1 ? "choreographer" : "choreographers"}
        </span>
      </div>

      <div className="choreographers-filters">
        <input
          className="choreographers-name-filter"
          type="search"
          placeholder="Filter by name…"
          value={state.nameFilter}
          onChange={(e) => actions.changeNameFilter(e.target.value)}
          aria-label="Filter by choreographer name"
        />
        <fieldset className="choreographers-level-filters">
          <legend className="sr-only">Filter by level</legend>
          {levelNames.map((level) => (
            <button
              key={level}
              className={`level-filter-btn${activeLevels.has(level) ? " active" : ""}`}
              onClick={() => actions.toggleLevel(level)}
              aria-pressed={activeLevels.has(level)}
            >
              {level}
            </button>
          ))}
        </fieldset>
      </div>

      {rows.length === 0 ? (
        <EmptyState>No choreographers match the current filters.</EmptyState>
      ) : (
        <div className="choreographers-table-wrap">
          <table className="choreographers-table">
            <thead>
              <tr>
                <th
                  className="th-name"
                  onClick={() => actions.sortBy("name")}
                  aria-sort={actions.getAriaSort("name")}
                >
                  Choreographer {sortIndicator("name")}
                </th>
                <th
                  className="th-rotated"
                  onClick={() => actions.sortBy("total")}
                  aria-sort={actions.getAriaSort("total")}
                >
                  <div className="th-rotated-inner">Total {sortIndicator("total")}</div>
                </th>
                {levelNames.map((level) => (
                  <th key={level} className="th-rotated">
                    <div className="th-rotated-inner">{level}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td>
                    <button
                      className="author-name-btn"
                      onClick={() => actions.searchAuthor(row.name)}
                      title={`Search all choreographies by ${row.name}`}
                    >
                      {row.name}
                    </button>
                  </td>
                  <td>{row.total}</td>
                  {levelNames.map((level) => {
                    const count = row.by_level[level] ?? 0;
                    return (
                      <td key={level}>
                        {count > 0 ? (
                          <button
                            className="level-count-btn"
                            onClick={() => actions.searchAuthor(row.name, level)}
                            title={`Search ${level} choreographies by ${row.name}`}
                            aria-label={`${count} ${level} choreographies by ${row.name}`}
                          >
                            {count}
                          </button>
                        ) : (
                          <span className="level-count-zero">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChoreographersPage;
