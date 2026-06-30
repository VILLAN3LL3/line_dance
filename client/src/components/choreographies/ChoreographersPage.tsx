import "../../styles/ChoreographersPage.css";

import React, { useEffect, useMemo, useState } from "react";

import { getAuthorStats, getLevels } from "../../api";
import { AuthorStats, LevelOption } from "../../types";
import { EmptyState, ErrorMessage, LoadingState } from "../shared/ui";

type SortField = "name" | "total";
type SortDir = "asc" | "desc";

function openAuthorSearch(author: string, level?: string) {
  const filters: Record<string, unknown> = { authors: [author] };
  if (level) filters.level = [level];
  globalThis.open(
    "/?filters=" + encodeURIComponent(JSON.stringify(filters)),
    "_blank",
    "noopener,noreferrer",
  );
}

const ChoreographersPage: React.FC = () => {
  const [stats, setStats] = useState<AuthorStats[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [activeLevels, setActiveLevels] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAuthorStats(), getLevels()])
      .then(([s, l]) => {
        if (!cancelled) {
          setStats(s);
          setLevels(l);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load choreographer statistics.");
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const levelNames = useMemo(
    () =>
      levels
        .slice()
        .sort((a, b) => a.value - b.value)
        .map((l) => l.name),
    [levels],
  );

  const toggleLevel = (level: string) => {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    let rows = stats;
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (activeLevels.size > 0) {
      rows = rows.filter((r) => [...activeLevels].some((l) => (r.by_level[l] ?? 0) > 0));
    }
    return [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "name") return dir * a.name.localeCompare(b.name);
      return dir * (a.total - b.total);
    });
  }, [stats, nameFilter, activeLevels, sortField, sortDir]);

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return <span className="sort-indicator">↕</span>;
    return <span className="sort-indicator">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="choreographers-page">
      <div className="choreographers-header">
        <h2>Choreographers</h2>
        <span className="choreographers-count">
          {filtered.length} {filtered.length === 1 ? "choreographer" : "choreographers"}
        </span>
      </div>

      <div className="choreographers-filters">
        <input
          className="choreographers-name-filter"
          type="search"
          placeholder="Filter by name…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          aria-label="Filter by choreographer name"
        />
        <div className="choreographers-level-filters" role="group" aria-label="Filter by level">
          {levelNames.map((level) => (
            <button
              key={level}
              className={`level-filter-btn${activeLevels.has(level) ? " active" : ""}`}
              onClick={() => toggleLevel(level)}
              aria-pressed={activeLevels.has(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No choreographers match the current filters.</EmptyState>
      ) : (
        <div className="choreographers-table-wrap">
          <table className="choreographers-table">
            <thead>
              <tr>
                <th
                  className="th-name"
                  onClick={() => handleSort("name")}
                  aria-sort={
                    sortField === "name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  Choreographer {sortIndicator("name")}
                </th>
                <th
                  className="th-rotated"
                  onClick={() => handleSort("total")}
                  aria-sort={
                    sortField === "total"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
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
              {filtered.map((row) => (
                <tr key={row.name}>
                  <td>
                    <button
                      className="author-name-btn"
                      onClick={() => openAuthorSearch(row.name)}
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
                            onClick={() => openAuthorSearch(row.name, level)}
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
