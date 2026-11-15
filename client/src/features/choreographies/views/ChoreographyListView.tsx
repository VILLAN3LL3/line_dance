import React from "react";

import { EmptyState, LoadingState } from "../../../shared/ui";
import type { Choreography, SearchFilters } from "../../../types";
import type { DisplayMode } from "../model/search-session";
import { ChoreographyCard } from "./ChoreographyCard";
import { ChoreographyTable } from "./ChoreographyTable";
import { SearchBar } from "./search-bar/SearchBar";

interface ChoreographyListViewProps {
  choreographies: Choreography[];
  currentFilters: SearchFilters;
  displayMode: DisplayMode;
  isLoading: boolean;
  onSearch: (filters: SearchFilters) => Promise<void>;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
  onSelect: (id: number) => void;
}

export const ChoreographyListView: React.FC<ChoreographyListViewProps> = ({
  choreographies,
  currentFilters,
  displayMode,
  isLoading,
  onSearch,
  onDisplayModeChange,
  onEdit,
  onDelete,
  onSelect,
}) => {
  let content: React.ReactNode;

  if (isLoading) {
    content = <LoadingState message="Loading choreographies..." />;
  } else if (choreographies.length === 0) {
    content = <EmptyState>No choreographies found. Start by adding one!</EmptyState>;
  } else if (displayMode === "card") {
    content = (
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
        {!isLoading && (
          <span className="results-count">
            {choreographies.length}{" "}
            {choreographies.length === 1 ? "choreography" : "choreographies"} found
          </span>
        )}
      </div>

      {content}
    </div>
  );
};
