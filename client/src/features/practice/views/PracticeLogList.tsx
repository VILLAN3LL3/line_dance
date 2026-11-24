import React from "react";

import { EmptyState, ErrorMessage, LoadingState } from "../../../shared/ui";
import { CONFIDENCE_OPTIONS } from "../model/practice-log";
import type { PracticeLogViewModel } from "../viewmodels/usePracticeLogViewModel";

interface PracticeLogListProps {
  viewModel: PracticeLogViewModel;
}

const emojiFor = (confidence: string): string =>
  CONFIDENCE_OPTIONS.find((option) => option.value === confidence)?.emoji ?? "";

export const PracticeLogList: React.FC<PracticeLogListProps> = ({ viewModel }) => {
  const { state, actions } = viewModel;

  if (state.isLoading) return <LoadingState message="Loading your practice log..." />;
  return (
    <div className="practice-log">
      {state.error && <ErrorMessage message={state.error} />}
      {state.days.length === 0 && !state.error && state.isFiltered && (
        <EmptyState>No practice matches your search.</EmptyState>
      )}
      {state.days.length === 0 && !state.error && !state.isFiltered && (
        <EmptyState>
          Nothing logged yet. Use “Log practice” or the buttons on the back of a card.
        </EmptyState>
      )}
      {state.days.map((day) => (
        <section key={day.date} className="practice-log-day">
          <h3 className="practice-section-title">{day.date}</h3>
          <ul>
            {day.entries.map((entry) => (
              <li key={entry.id} className="practice-log-entry">
                <span aria-hidden="true">{emojiFor(entry.confidence)}</span>
                <span className="practice-log-entry-text">
                  <strong>{entry.choreography_name}</strong>
                  {entry.song_title && <span> · {entry.song_title}</span>}
                  {entry.note && <span className="practice-log-note"> — {entry.note}</span>}
                </span>
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  aria-label={`Delete practice of ${entry.choreography_name} on ${entry.practiced_on}`}
                  onClick={() => void actions.removeEntry(entry.id)}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
