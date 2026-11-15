import React from "react";

import { EmptyState, LoadingState } from "../../../shared/ui";
import type { Choreography } from "../../../types";
import type { ChoreographyCardViewModel } from "../viewmodels/useChoreographyCardViewModel";
import type { DisplayMode } from "../model/search-session";
import type { useChoreographyTableViewModel } from "../viewmodels/useChoreographyTableViewModel";
import type { SearchBarViewModel } from "../viewmodels/useSearchBarViewModel";
import { ChoreographyCard } from "./ChoreographyCard";
import { ChoreographyTable } from "./ChoreographyTable";
import { SearchBar } from "./search-bar/SearchBar";

interface ChoreographyListViewProps {
  choreographies: Choreography[];
  displayMode: DisplayMode;
  isLoading: boolean;
  searchBar: SearchBarViewModel;
  table: ReturnType<typeof useChoreographyTableViewModel>;
  cardViewModel: ChoreographyCardViewModel;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
  onSelect: (id: number) => void;
}

export const ChoreographyListView: React.FC<ChoreographyListViewProps> = ({
  choreographies,
  displayMode,
  isLoading,
  searchBar,
  table,
  cardViewModel,
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
            cardViewModel={cardViewModel}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  } else {
    content = (
      <ChoreographyTable
        onEdit={onEdit}
        onDelete={onDelete}
        tableState={table.state}
        onToggleSort={table.actions.toggleSort}
        onSelect={onSelect}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="list-view">
      <SearchBar viewModel={searchBar} isLoading={isLoading} />

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
