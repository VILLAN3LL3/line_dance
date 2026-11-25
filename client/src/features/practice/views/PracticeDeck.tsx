import React from "react";

import { EmptyState, ErrorMessage, LoadingState } from "../../../shared/ui";
import type { ChoreographyCardViewModel } from "../../choreographies";
import { groupCardsByDueDate } from "../model/practice-deck";
import type { PracticeDeckViewModel } from "../viewmodels/usePracticeDeckViewModel";
import { PracticeFlipCard } from "./PracticeFlipCard";

interface PracticeDeckProps {
  viewModel: PracticeDeckViewModel;
  cardViewModel: ChoreographyCardViewModel;
}

export const PracticeDeck: React.FC<PracticeDeckProps> = ({ viewModel, cardViewModel }) => {
  const { state, actions } = viewModel;
  const { due, later } = state.deck;

  if (state.isLoading) return <LoadingState message="Loading your practice cards..." />;
  if (state.error) return <ErrorMessage message={state.error} />;
  if (due.length + later.length === 0 && state.isFiltered) {
    return <EmptyState>No learned dance matches your search.</EmptyState>;
  }
  if (due.length + later.length === 0) {
    return (
      <EmptyState>
        No learned dances yet. Mark dances with the ✅ button on a choreography card to practice
        them here.
      </EmptyState>
    );
  }

  const renderCards = (cards: typeof due) => (
    <>
      {groupCardsByDueDate(cards).map((group) => (
        <section key={group.key} className="practice-due-group" aria-label={group.label}>
          <h4 className="practice-group-title">
            {group.label} ({group.cards.length})
          </h4>
          <div className="choreographies-grid">
            {group.cards.map((card) => (
              <PracticeFlipCard
                key={card.choreography.id}
                card={card}
                cardViewModel={cardViewModel}
                isSaving={state.practicingId === card.choreography.id}
                onPractice={(draft) => void actions.practice(card.choreography, draft)}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );

  return (
    <div className="practice-deck">
      {state.saveError && <ErrorMessage message={state.saveError} />}
      {(due.length > 0 || !state.isFiltered) && (
        <h3 className="practice-section-title">Time to practice ({due.length})</h3>
      )}
      {due.length > 0 && renderCards(due)}
      {due.length === 0 && !state.isFiltered && (
        <EmptyState>Nothing to practice right now. Come back later!</EmptyState>
      )}
      {later.length > 0 && state.isFiltered && (
        <>
          <h3 className="practice-section-title">Not due yet ({later.length})</h3>
          {renderCards(later)}
        </>
      )}
      {later.length > 0 && !state.isFiltered && (
        <>
          <button
            type="button"
            className="btn-secondary btn-small practice-later-toggle"
            aria-expanded={state.showLater}
            onClick={actions.toggleLater}
          >
            {state.showLater ? "Hide" : "Show"} dances not due yet ({later.length})
          </button>
          {state.showLater && renderCards(later)}
        </>
      )}
    </div>
  );
};
