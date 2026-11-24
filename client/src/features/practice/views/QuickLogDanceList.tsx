import React from "react";

import type { QuickLogViewModel } from "../viewmodels/useQuickLogViewModel";

interface QuickLogDanceListProps {
  viewModel: QuickLogViewModel;
  legend: string;
}

/** Search and multi-select of the learned dances, shared by both quick log modes. */
export const QuickLogDanceList: React.FC<QuickLogDanceListProps> = ({ viewModel, legend }) => {
  const { state, actions } = viewModel;
  const { form, dances } = state;

  return (
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
      <div className="practice-selection-actions">
        <button
          type="button"
          className="btn-secondary btn-small"
          disabled={dances.length === 0}
          onClick={actions.selectShown}
        >
          Select all shown ({dances.length})
        </button>
        <button
          type="button"
          className="btn-secondary btn-small"
          disabled={form.selected.length === 0}
          onClick={actions.clearSelection}
        >
          Clear selection
        </button>
      </div>
      <fieldset className="practice-dance-list">
        <legend>{legend}</legend>
        {dances.map((dance) => (
          <label key={dance.id} className="practice-dance-option">
            <input
              type="checkbox"
              checked={form.selected.includes(dance.id)}
              onChange={() => actions.toggleDance(dance.id)}
            />
            {dance.name}
          </label>
        ))}
        {dances.length === 0 && <p>No dance matches your search.</p>}
      </fieldset>
    </>
  );
};
