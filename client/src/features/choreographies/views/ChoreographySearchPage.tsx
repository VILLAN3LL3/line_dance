import "../../../styles/App.css";

import React from "react";

import { confirmAction, ErrorMessage } from "../../../shared/ui";
import { useChoreographySearchViewModel } from "../viewmodels/useChoreographySearchViewModel";
import { ChoreographyDetailView } from "./ChoreographyDetailView";
import { ChoreographyListView } from "./ChoreographyListView";

export const ChoreographySearchPage: React.FC = () => {
  const { state, actions } = useChoreographySearchViewModel();
  const { view, selectedChoreography, isLoading, error } = state;

  const handleDelete = async (id: number) => {
    if (!confirmAction("Are you sure you want to delete this choreography?")) return;
    await actions.removeChoreography(id);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h2>Choreography Search</h2>
        <button onClick={actions.addChoreography} disabled={isLoading || view !== "list"}>
          + Add New Choreography
        </button>
      </header>

      {error && <ErrorMessage message={error} />}

      {view === "list" && (
        <ChoreographyListView
          choreographies={state.choreographies}
          displayMode={state.displayMode}
          isLoading={isLoading}
          searchBar={state.searchBar}
          table={state.table}
          cardViewModel={state.cardViewModel}
          onDisplayModeChange={actions.changeDisplayMode}
          onEdit={actions.editChoreography}
          onDelete={handleDelete}
          onSelect={actions.selectChoreography}
        />
      )}

      {view === "detail" && selectedChoreography && (
        <ChoreographyDetailView
          choreography={selectedChoreography}
          cardViewModel={state.cardViewModel}
          onBack={actions.showList}
          onEdit={actions.editChoreography}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};
