import React from "react";

import { EmptyState, ErrorMessage, LoadingState } from "../../../shared/ui";
import type { ChoreographyCardViewModel } from "../../choreographies";
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
  if (due.length + later.length === 0) {
    return (
      <EmptyState>
        No learned dances yet. Mark dances with the ✅ button on a choreography card to practice
        them here.
      </EmptyState>
    );
  }

  const renderCards = (cards: typeof due) => (
    <div className="choreographies-grid">
      {cards.map((card) => (
        <PracticeFlipCard
          key={card.choreography.id}
          card={card}
          cardViewModel={cardViewModel}
          isSaving={state.practicingId === card.choreography.id}
          onPractice={(draft) => void actions.practice(card.choreography, draft)}
        />
      ))}
    </div>
  );

  return (
    <div className="practice-deck">
      {state.saveError && <ErrorMessage message={state.saveError} />}
      <h3 className="practice-section-title">Time to practice ({due.length})</h3>
      {due.length > 0 ? (
        renderCards(due)
      ) : (
        <EmptyState>Nothing to practice right now. Come back later!</EmptyState>
      )}
      {later.length > 0 && (
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
