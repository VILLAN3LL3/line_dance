import "../../../styles/ChoreographyTable.css";

import React from "react";

import { ActionButton, LevelBatch } from "../../../shared/ui";
import { Choreography } from "../../../types";
import { getSortIndicator, type SortField } from "../model/choreography-table";
import { useChoreographyTableViewModel } from "../viewmodels/useChoreographyTableViewModel";

interface ChoreographyTableProps {
  choreographies: Choreography[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onSelect?: (id: number) => void;
  isLoading?: boolean;
}

export const ChoreographyTable: React.FC<ChoreographyTableProps> = ({
  choreographies,
  onEdit,
  onDelete,
  onSelect,
  isLoading = false,
}) => {
  "use no memo";

  const { state, actions } = useChoreographyTableViewModel(choreographies);
  const { sortField, sortDirection, sortedChoreographies, stepFigureColumns } = state;
  const toggleSort = actions.toggleSort;

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
              {state.informationCategories.map((category) => {
                const field: SortField = `information:${category}`;
                return (
                  <th
                    key={category}
                    className="figure-column sortable"
                    onClick={() => toggleSort(field)}
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
                  {state.informationCategories.map((category) => {
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
                          window.open(choreo.step_sheet_link, "_blank");
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
                          window.open(choreo.demo_video_url, "_blank");
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
                          window.open(choreo.tutorial_video_url || "", "_blank");
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
