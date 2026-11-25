import React from "react";

import { CONFIDENCE_OPTIONS } from "../model/practice-log";
import { describeSubmit } from "../model/quick-log";
import type { QuickLogViewModel } from "../viewmodels/useQuickLogViewModel";
import { QuickLogDanceList } from "./QuickLogDanceList";

interface QuickLogPanelProps {
  viewModel: QuickLogViewModel;
}

/** Quick capture for several dances: log a practice day, or put dances on an interval step once. */
export const QuickLogPanel: React.FC<QuickLogPanelProps> = ({ viewModel }) => {
  const { state, actions } = viewModel;
  const { form } = state;
  const isBaseline = form.mode === "baseline";

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
      {state.savedMessage !== null && (
        <output className="practice-saved">{state.savedMessage}</output>
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
              <fieldset className="practice-mode">
                <legend>What do you want to do?</legend>
                <label>
                  <input
                    type="radio"
                    name="practice-quick-log-mode"
                    checked={!isBaseline}
                    onChange={() => actions.setMode("practice")}
                  />
                  <span>I practiced these dances</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="practice-quick-log-mode"
                    checked={isBaseline}
                    onChange={() => actions.setMode("baseline")}
                  />
                  <span>Set an interval step (once, for dances I learned long ago)</span>
                </label>
              </fieldset>

              <QuickLogDanceList
                viewModel={viewModel}
                legend={isBaseline ? "Dances to set" : "Dances you practiced"}
              />

              {isBaseline ? (
                <>
                  <div className="form-group">
                    <label htmlFor="practice-quick-log-step">Interval step</label>
                    <select
                      id="practice-quick-log-step"
                      value={form.step}
                      onChange={(event) => actions.setStep(Number(event.target.value))}
                    >
                      {state.stepOptions.map((option) => (
                        <option key={option.step} value={option.step}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="practice-hint">
                    The dances count as practiced up to this step starting today. This does not add
                    a practice; your next practice continues from this step. A dance is due again
                    after the interval of its level for this step, and never sooner. To avoid
                    getting all dances on the same day, some come back a few days later.
                  </p>
                </>
              ) : (
                <>
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
                </>
              )}

              {state.error && (
                <p className="form-field-error" role="alert">
                  {state.error}
                </p>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  form.selected.length === 0 || state.isSaving || (!isBaseline && !form.practicedOn)
                }
              >
                {describeSubmit(form.mode, form.selected.length)}
              </button>
            </>
          )}
        </form>
      )}
    </section>
  );
};
