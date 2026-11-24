import React from "react";

import { CONFIDENCE_OPTIONS } from "../model/practice-log";
import { describeSubmit } from "../model/quick-log";
import type { QuickLogViewModel } from "../viewmodels/useQuickLogViewModel";

interface QuickLogPanelProps {
  viewModel: QuickLogViewModel;
}

/** Quick capture of one practice day for several dances. */
export const QuickLogPanel: React.FC<QuickLogPanelProps> = ({ viewModel }) => {
  const { state, actions } = viewModel;
  const { form } = state;
  const count = form.selected.length;

  return (
    <section className="practice-quick-log" aria-label="Log practice">
      <button
        type="button"
        className="btn-secondary btn-small"
        aria-expanded={form.open}
        aria-controls="practice-quick-log-form"
        onClick={actions.toggleOpen}
      >
        ➕ Log practice
      </button>
      {state.savedCount !== null && (
        <output className="practice-saved">
          Logged {state.savedCount === 1 ? "1 dance" : `${state.savedCount} dances`}
        </output>
      )}

      {form.open && (
        <form
          id="practice-quick-log-form"
          className="practice-quick-log-form"
          onSubmit={(event) => {
            event.preventDefault();
            void actions.submit();
          }}
        >
          {!state.hasLearnedDances ? (
            <p>No learned dances yet.</p>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="practice-quick-log-search">Find a dance</label>
                <input
                  id="practice-quick-log-search"
                  type="search"
                  value={form.query}
                  onChange={(event) => actions.setQuery(event.target.value)}
                />
              </div>
              <fieldset className="practice-dance-list">
                <legend>Dances you practiced</legend>
                {state.dances.map((dance) => (
                  <label key={dance.id} className="practice-dance-option">
                    <input
                      type="checkbox"
                      checked={form.selected.includes(dance.id)}
                      onChange={() => actions.toggleDance(dance.id)}
                    />
                    {dance.name}
                  </label>
                ))}
                {state.dances.length === 0 && <p>No dance matches your search.</p>}
              </fieldset>
              <div className="practice-quick-log-fields">
                <div className="form-group">
                  <label htmlFor="practice-quick-log-date">Practiced on</label>
                  <input
                    id="practice-quick-log-date"
                    type="date"
                    value={form.practicedOn}
                    max={state.maxDate}
                    onChange={(event) => actions.setDate(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="practice-quick-log-confidence">How did it go?</label>
                  <select
                    id="practice-quick-log-confidence"
                    value={form.confidence}
                    onChange={(event) =>
                      actions.setConfidence(event.target.value as "sure" | "unsure")
                    }
                  >
                    {CONFIDENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.emoji} {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="practice-quick-log-note">Note</label>
                <textarea
                  id="practice-quick-log-note"
                  rows={2}
                  maxLength={500}
                  value={form.note}
                  onChange={(event) => actions.setNote(event.target.value)}
                />
              </div>
              {state.error && (
                <p className="form-field-error" role="alert">
                  {state.error}
                </p>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={count === 0 || !form.practicedOn || state.isSaving}
              >
                {describeSubmit(count)}
              </button>
            </>
          )}
        </form>
      )}
    </section>
  );
};
