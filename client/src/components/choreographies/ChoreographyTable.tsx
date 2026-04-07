import "../../styles/ChoreographyTable.css";

import React, { useEffect, useMemo, useState } from "react";

import { getStepFigures } from "../../api";
import { Choreography } from "../../types";
import { ActionButton } from "../shared/ui";

interface ChoreographyTableProps {
  choreographies: Choreography[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onSelect?: (id: number) => void;
  isLoading?: boolean;
}

type SortField = "name" | "level" | "count" | "wall_count" | "creation_year" | "restart" | "tag";
type SortDirection = "asc" | "desc";

const getSortIndicator = (
  activeField: SortField,
  field: SortField,
  direction: SortDirection,
): string => {
  if (activeField !== field) return "";
  if (direction === "asc") return " ⇧";
  return " ⇩";
};

const compareOptionalNumber = (a: number | undefined, b: number | undefined): number => {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a - b;
};

const compareBooleanFlag = (a: boolean, b: boolean): number => {
  if (a === b) return 0;
  return a ? -1 : 1;
};

export const ChoreographyTable: React.FC<ChoreographyTableProps> = ({
  choreographies,
  onEdit,
  onDelete,
  onSelect,
  isLoading = false,
}) => {
  "use no memo";

  const [allStepFigures, setAllStepFigures] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Fetch all step figures on mount
  useEffect(() => {
    const fetchStepFigures = async () => {
      try {
        const figures = await getStepFigures();
        const sorted = [...figures].sort((a: string, b: string) => a.localeCompare(b));
        setAllStepFigures(sorted);
      } catch (error) {
        console.error("Failed to fetch step figures:", error);
      }
    };
    fetchStepFigures();
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const sortedChoreographies = useMemo(() => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    const items = [...choreographies];

    items.sort((a, b) => {
      switch (sortField) {
        case "name":
          return a.name.localeCompare(b.name) * multiplier;
        case "level":
          return a.level.localeCompare(b.level) * multiplier;
        case "count":
          return compareOptionalNumber(a.count, b.count) * multiplier;
        case "wall_count":
          return compareOptionalNumber(a.wall_count, b.wall_count) * multiplier;
        case "creation_year":
          return compareOptionalNumber(a.creation_year, b.creation_year) * multiplier;
        case "restart": {
          const aValue = Boolean(a.restart_information);
          const bValue = Boolean(b.restart_information);
          return compareBooleanFlag(aValue, bValue) * multiplier;
        }
        case "tag": {
          const aValue = Boolean(a.tag_information);
          const bValue = Boolean(b.tag_information);
          return compareBooleanFlag(aValue, bValue) * multiplier;
        }
        default:
          return 0;
      }
    });

    return items;
  }, [choreographies, sortDirection, sortField]);

  return (
    <div className="choreography-table-wrapper">
      <div className="table-scroll-wrapper">
        <table className="choreography-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort("name")}>
                Name{getSortIndicator(sortField, "name", sortDirection)}
              </th>
              <th className="sortable" onClick={() => toggleSort("level")}>
                Level{getSortIndicator(sortField, "level", sortDirection)}
              </th>
              <th className="sortable" onClick={() => toggleSort("count")}>
                Count{getSortIndicator(sortField, "count", sortDirection)}
              </th>
              <th className="sortable" onClick={() => toggleSort("wall_count")}>
                Walls{getSortIndicator(sortField, "wall_count", sortDirection)}
              </th>
              <th className="sortable" onClick={() => toggleSort("creation_year")}>
                Year{getSortIndicator(sortField, "creation_year", sortDirection)}
              </th>
              <th className="figure-column sortable" onClick={() => toggleSort("restart")}>
                Restart{getSortIndicator(sortField, "restart", sortDirection)}
              </th>
              <th className="figure-column sortable" onClick={() => toggleSort("tag")}>
                Tag{getSortIndicator(sortField, "tag", sortDirection)}
              </th>
              {allStepFigures.map((figure) => (
                <th key={figure} className="figure-column" title={figure}>
                  {figure}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedChoreographies.map((choreo) => {
              return (
                <tr
                  key={choreo.id}
                  className="choreography-row"
                  onClick={() => onSelect?.(choreo.id)}
                >
                  <td className="name-cell">
                    <strong>{choreo.name}</strong>
                  </td>
                  <td className="level-cell">{choreo.level}</td>
                  <td>{choreo.count || "-"}</td>
                  <td>{choreo.wall_count || "-"}</td>
                  <td>{choreo.creation_year || "-"}</td>
                  <td className="figure-cell">{choreo.restart_information ? "✅" : ""}</td>
                  <td className="figure-cell">{choreo.tag_information ? "✅" : ""}</td>
                  {allStepFigures.map((figure) => (
                    <td key={`${choreo.id}-${figure}`} className="figure-cell">
                      {choreo.step_figures.includes(figure) ? "✅" : ""}
                    </td>
                  ))}
                  <td className="actions-cell">
                    {choreo.step_sheet_link && (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(choreo.step_sheet_link, "_blank");
                        }}
                        className="btn-small btn-secondary"
                        title="Open Step Sheet"
                      >
                        🦶
                      </ActionButton>
                    )}
                    {choreo.demo_video_url && (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(choreo.demo_video_url, "_blank");
                        }}
                        className="btn-small btn-secondary"
                        title="Open Demo Video"
                      >
                        🎬
                      </ActionButton>
                    )}
                    {choreo.tutorial_video_url && (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(choreo.tutorial_video_url || "", "_blank");
                        }}
                        className="btn-small btn-secondary"
                        title="Open Tutorial Video"
                      >
                        🎓
                      </ActionButton>
                    )}
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(choreo.id);
                      }}
                      className="btn-small btn-edit"
                      disabled={isLoading}
                      title="Edit"
                    >
                      ✏️
                    </ActionButton>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(choreo.id);
                      }}
                      className="btn-small btn-delete"
                      disabled={isLoading}
                      title="Delete"
                    >
                      🗑️
                    </ActionButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
