import "../../../styles/ChoreographyTable.css";

import React from "react";

import { openInNewTab } from "../../../shared/browser/window";
import { ActionButton, LevelBatch } from "../../../shared/ui";
import { Choreography } from "../../../types";
import { getSortIndicator, type SortDirection, type SortField } from "../model/choreography-table";

interface ChoreographyTableState {
  sortField: SortField;
  sortDirection: SortDirection;
  sortedChoreographies: Choreography[];
  stepFigureColumns: string[];
  informationCategories: string[];
}

interface ChoreographyTableProps {
  tableState: ChoreographyTableState;
  onToggleSort: (field: SortField) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onSelect?: (id: number) => void;
  isLoading?: boolean;
}

export const ChoreographyTable: React.FC<ChoreographyTableProps> = ({
  tableState,
  onToggleSort,
  onEdit,
  onDelete,
  onSelect,
  isLoading = false,
}) => {
  const {
    sortField,
    sortDirection,
    sortedChoreographies,
    stepFigureColumns,
    informationCategories,
  } = tableState;
  return (
    <div className="choreography-table-wrapper">
      <div className="table-scroll-wrapper">
        <table className="choreography-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => onToggleSort("name")}>
                Name{getSortIndicator(sortField, "name", sortDirection)}
              </th>
              <th className="sortable" onClick={() => onToggleSort("level")}>
                Level{getSortIndicator(sortField, "level", sortDirection)}
              </th>
              <th className="sortable" onClick={() => onToggleSort("count")}>
                Count{getSortIndicator(sortField, "count", sortDirection)}
              </th>
              <th className="sortable" onClick={() => onToggleSort("wall_count")}>
                Walls{getSortIndicator(sortField, "wall_count", sortDirection)}
              </th>
              <th className="sortable" onClick={() => onToggleSort("creation_year")}>
                Year{getSortIndicator(sortField, "creation_year", sortDirection)}
              </th>
              {informationCategories.map((category) => {
                const field: SortField = `information:${category}`;
                return (
                  <th
                    key={category}
                    className="figure-column sortable"
                    onClick={() => onToggleSort(field)}
                  >
                    {category}
                    {getSortIndicator(sortField, field, sortDirection)}
                  </th>
                );
              })}
              {stepFigureColumns.map((figure) => (
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
                  <td className="level-cell">
                    <LevelBatch level={choreo.level} />
                  </td>
                  <td>{choreo.count ?? "-"}</td>
                  <td>{choreo.wall_count ?? "-"}</td>
                  <td>{choreo.creation_year ?? "-"}</td>
                  {informationCategories.map((category) => {
                    const hasInformation = (choreo.choreography_information || []).some(
                      (information) => information.category === category,
                    );

                    return (
                      <td
                        key={`${choreo.id}-information-${category}`}
                        className="figure-cell"
                        title={hasInformation ? `${category} information available` : undefined}
                      >
                        {hasInformation ? "✅" : ""}
                      </td>
                    );
                  })}
                  {stepFigureColumns.map((figure) => (
                    <td key={`${choreo.id}-${figure}`} className="figure-cell">
                      {choreo.step_figures.includes(figure) ? "✅" : ""}
                    </td>
                  ))}
                  <td className="actions-cell">
                    {choreo.step_sheet_link && (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          if (choreo.step_sheet_link) openInNewTab(choreo.step_sheet_link);
                        }}
                        variant="secondary"
                        className="btn-small"
                        title="Open Step Sheet"
                      >
                        🦶
                      </ActionButton>
                    )}
                    {choreo.demo_video_url && (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          if (choreo.demo_video_url) openInNewTab(choreo.demo_video_url);
                        }}
                        variant="secondary"
                        className="btn-small"
                        title="Open Demo Video"
                      >
                        🎬
                      </ActionButton>
                    )}
                    {choreo.tutorial_video_url && (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          openInNewTab(choreo.tutorial_video_url || "");
                        }}
                        variant="secondary"
                        className="btn-small"
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
                      variant="edit"
                      className="btn-small"
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
                      variant="secondary"
                      className="btn-small"
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
