import React from "react";

import { Choreography, SearchFilters } from "../../types";
import { ChoreographyCard } from "../choreographies/ChoreographyCard";
import { ChoreographyTable } from "../choreographies/ChoreographyTable";
import { SearchBar } from "../choreographies/SearchBar";
import { EmptyState, LoadingState } from "../shared/ui";

interface AppListViewProps {
  choreographies: Choreography[];
  currentFilters: SearchFilters;
  displayMode: "card" | "table";
  isLoading: boolean;
  pagination: {
    page: number;
    totalPages: number;
  };
  onSearch: (filters: SearchFilters) => Promise<void>;
  onDisplayModeChange: (mode: "card" | "table") => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
  onSelect: (id: number) => void;
  onReload: () => Promise<void>;
}

export const AppListView: React.FC<AppListViewProps> = ({
  choreographies,
  currentFilters,
  displayMode,
  isLoading,
  pagination,
  onSearch,
  onDisplayModeChange,
  onEdit,
  onDelete,
  onSelect,
  onReload,
}) => {
  let content: React.ReactNode;

  if (isLoading) {
    content = <LoadingState message="Loading choreographies..." />;
  } else if (choreographies.length === 0) {
    content = <EmptyState>No choreographies found. Start by adding one!</EmptyState>;
  } else if (displayMode === "card") {
    content = (
      <>
        <div className="choreographies-grid">
          {choreographies.map((choreography) => (
            <ChoreographyCard
              key={choreography.id}
              choreography={choreography}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>

        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button disabled={pagination.page === 1 || isLoading} onClick={onReload}>
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page === pagination.totalPages || isLoading}
              onClick={onReload}
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  } else {
    content = (
      <ChoreographyTable
        choreographies={choreographies}
        onEdit={onEdit}
        onDelete={onDelete}
        onSelect={onSelect}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="list-view">
      <SearchBar onSearch={onSearch} filters={currentFilters} isLoading={isLoading} />

      <div className="view-toggle">
        <button
          className={`view-toggle-btn ${displayMode === "card" ? "active" : ""}`}
          onClick={() => onDisplayModeChange("card")}
          title="Card view"
        >
          Cards
        </button>
        <button
          className={`view-toggle-btn ${displayMode === "table" ? "active" : ""}`}
          onClick={() => onDisplayModeChange("table")}
          title="Table view"
        >
          Table
        </button>
      </div>

      {content}
    </div>
  );
};
