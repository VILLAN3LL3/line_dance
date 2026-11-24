import "../../../styles/App.css";

import React from "react";

import { EmptyState, ErrorMessage, LoadingState } from "../../../shared/ui";
import { ChoreographyCard } from "../../choreographies";
import { usePersonalViewModel } from "../viewmodels/usePersonalViewModel";

const PersonalPage: React.FC = () => {
  const { state, actions } = usePersonalViewModel();
  const { activeTab, choreographies, isLoading, error } = state;

  let content: React.ReactNode;
  if (isLoading) {
    content = <LoadingState message="Loading your dances..." />;
  } else if (choreographies.length === 0) {
    content = <EmptyState>{activeTab.emptyMessage}</EmptyState>;
  } else {
    content = (
      <div className="choreographies-grid">
        {choreographies.map((choreography) => (
          <ChoreographyCard
            key={choreography.id}
            choreography={choreography}
            cardViewModel={state.cardViewModel}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h2>Personal</h2>
      </header>

      {error && <ErrorMessage message={error} />}

      <div className="list-view">
        <div className="view-toggle" role="tablist" aria-label="Personal dance lists">
          {state.tabs.map((tab) => (
            <button
              key={tab.status}
              id={`personal-tab-${tab.status}`}
              type="button"
              role="tab"
              aria-selected={tab.status === state.activeStatus}
              aria-controls="personal-panel"
              className={`view-toggle-btn${tab.status === state.activeStatus ? " active" : ""}`}
              onClick={() => actions.selectStatus(tab.status)}
            >
              {tab.emoji} {tab.label}
              {tab.count !== null && ` (${tab.count})`}
            </button>
          ))}
        </div>

        <div
          id="personal-panel"
          role="tabpanel"
          aria-labelledby={`personal-tab-${state.activeStatus}`}
        >
          {content}
        </div>
      </div>
    </div>
  );
};

export default PersonalPage;
