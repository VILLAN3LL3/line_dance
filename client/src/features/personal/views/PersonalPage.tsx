import "../../../styles/App.css";

import React from "react";

import { EmptyState, ErrorMessage, LoadingState } from "../../../shared/ui";
import { ChoreographyCard } from "../../choreographies";
import { PracticeDeck, PracticeLogList, QuickLogPanel } from "../../practice";
import { isStatusTab } from "../model/personal-tabs";
import { usePersonalViewModel } from "../viewmodels/usePersonalViewModel";

const PersonalPage: React.FC = () => {
  const { state, actions } = usePersonalViewModel();
  const { activeTab, choreographies, isLoading, error } = state;

  let content: React.ReactNode;
  if (state.activeId === "practice") {
    content = (
      <>
        <QuickLogPanel viewModel={state.practice.quickLog} />
        <PracticeDeck viewModel={state.practice.deck} cardViewModel={state.cardViewModel} />
      </>
    );
  } else if (state.activeId === "log") {
    content = <PracticeLogList viewModel={state.practice.log} />;
  } else if (isLoading) {
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

      {error && isStatusTab(state.activeId) && <ErrorMessage message={error} />}

      <div className="list-view">
        <div className="view-toggle" role="tablist" aria-label="Personal dance lists">
          {state.tabs.map((tab) => (
            <button
              key={tab.id}
              id={`personal-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={tab.id === state.activeId}
              aria-controls="personal-panel"
              className={`view-toggle-btn${tab.id === state.activeId ? " active" : ""}`}
              onClick={() => actions.selectTab(tab.id)}
            >
              {tab.emoji} {tab.label}
              {tab.count !== null && ` (${tab.count})`}
            </button>
          ))}
        </div>

        <div id="personal-panel" role="tabpanel" aria-labelledby={`personal-tab-${state.activeId}`}>
          {content}
        </div>
      </div>
    </div>
  );
};

export default PersonalPage;
