import "../../../styles/App.css";

import React from "react";
import { Navigate } from "react-router-dom";

import { EmptyState, ErrorMessage, LoadingState } from "../../../shared/ui";
import { ChoreographyCard } from "../../choreographies";
import { PracticeDeck, PracticeLogList, QuickLogPanel } from "../../practice";
import { RepertoireDashboard } from "../../statistics";
import {
  DEFAULT_PERSONAL_SECTION,
  PERSONAL_PATH,
  describeSection,
  isSearchableSection,
  isStatusSection,
} from "../model/personal-sections";
import { usePersonalViewModel } from "../viewmodels/usePersonalViewModel";

const PersonalPage: React.FC = () => {
  const { state, actions } = usePersonalViewModel();
  const { activeId, activeSection, choreographies, isLoading, error } = state;

  if (activeId === null) {
    return <Navigate to={`${PERSONAL_PATH}/${DEFAULT_PERSONAL_SECTION}`} replace />;
  }

  let content: React.ReactNode;
  if (activeId === "practice") {
    content = (
      <>
        <QuickLogPanel viewModel={state.practice.quickLog} />
        <PracticeDeck viewModel={state.practice.deck} cardViewModel={state.cardViewModel} />
      </>
    );
  } else if (activeId === "dashboard") {
    content = <RepertoireDashboard viewModel={state.statistics} />;
  } else if (activeId === "log") {
    content = <PracticeLogList viewModel={state.practice.log} />;
  } else if (isLoading) {
    content = <LoadingState message="Loading your dances..." />;
  } else if (choreographies.length === 0 && state.query.trim() !== "") {
    content = <EmptyState>No dance matches your search.</EmptyState>;
  } else if (choreographies.length === 0) {
    content = <EmptyState>{activeSection.emptyMessage}</EmptyState>;
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

      {error && isStatusSection(activeId) && <ErrorMessage message={error} />}

      <div className="list-view">
        <h3 id="personal-section-title" className="personal-section-title">
          <span aria-hidden="true">{activeSection.emoji}</span> {describeSection(activeSection)}
        </h3>

        {isSearchableSection(activeId) && (
          <input
            type="search"
            className="personal-search"
            placeholder="Search dances by name"
            aria-label="Search dances by name"
            value={state.query}
            onChange={(event) => actions.setQuery(event.target.value)}
          />
        )}

        <section aria-labelledby="personal-section-title">{content}</section>
      </div>
    </div>
  );
};

export default PersonalPage;
