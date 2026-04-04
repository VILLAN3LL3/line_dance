import React from "react";

interface SearchBarStepFiguresFilterProps {
  selectedFigures: string[];
  inputFigure: string;
  figureOptions: string[];
  withoutStepFigures: boolean;
  stepFiguresMatchMode: "all" | "any" | "exact";
  isLoading: boolean;
  onFigureInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFigureFromInput: () => void;
  onToggleFigure: (figure: string) => void;
  onWithoutStepFiguresChange: (checked: boolean) => void;
  onStepFiguresMatchModeChange: (mode: "all" | "any" | "exact") => void;
}

export const SearchBarStepFiguresFilter: React.FC<SearchBarStepFiguresFilterProps> = ({
  selectedFigures,
  inputFigure,
  figureOptions,
  withoutStepFigures,
  stepFiguresMatchMode,
  isLoading,
  onFigureInput,
  onAddFigureFromInput,
  onToggleFigure,
  onWithoutStepFiguresChange,
  onStepFiguresMatchModeChange,
}) => (
  <div className="filter-group">
    <label htmlFor="figure-input">Step Figures:</label>
    <div className="filter-checkbox">
      <label>
        <input
          type="checkbox"
          checked={withoutStepFigures}
          onChange={(e) => onWithoutStepFiguresChange(e.target.checked)}
          disabled={isLoading}
        />{" "}
        Search choreographies without step figures
      </label>
    </div>
    <div className="filter-input-container">
      <input
        id="figure-input"
        type="text"
        value={inputFigure}
        onChange={onFigureInput}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAddFigureFromInput();
          }
        }}
        placeholder={
          withoutStepFigures ? "Readonly: using without-step-figures filter" : "Add step figure..."
        }
        list="figures-list"
        autoComplete="off"
        readOnly={withoutStepFigures}
        disabled={isLoading || withoutStepFigures}
      />
      <datalist id="figures-list">
        {figureOptions.map((figure) => (
          <option key={figure} value={figure} />
        ))}
      </datalist>
      <button
        type="button"
        onClick={onAddFigureFromInput}
        className="btn-add-filter"
        disabled={isLoading || withoutStepFigures}
      >
        +
      </button>
    </div>

    {selectedFigures.length > 0 && (
      <div className="filter-mode-toggle">
        <span>Match Mode:</span>
        <div className="match-mode-radios" role="radiogroup" aria-label="Step figure match mode">
          <label
            className={`match-mode-option mode-all ${stepFiguresMatchMode === "all" ? "active" : ""}`}
          >
            <input
              type="radio"
              name="step-figures-match-mode"
              value="all"
              checked={stepFiguresMatchMode === "all"}
              onChange={() => onStepFiguresMatchModeChange("all")}
              disabled={isLoading}
            />{" "}
            AND (all selected)
          </label>
          <label
            className={`match-mode-option mode-any ${stepFiguresMatchMode === "any" ? "active" : ""}`}
          >
            <input
              type="radio"
              name="step-figures-match-mode"
              value="any"
              checked={stepFiguresMatchMode === "any"}
              onChange={() => onStepFiguresMatchModeChange("any")}
              disabled={isLoading}
            />{" "}
            OR (any selected)
          </label>
          <label
            className={`match-mode-option mode-exact ${stepFiguresMatchMode === "exact" ? "active" : ""}`}
          >
            <input
              type="radio"
              name="step-figures-match-mode"
              value="exact"
              checked={stepFiguresMatchMode === "exact"}
              onChange={() => onStepFiguresMatchModeChange("exact")}
              disabled={isLoading}
            />{" "}
            EXACT (only selected)
          </label>
        </div>
      </div>
    )}

    <div className="filter-tags">
      {selectedFigures.map((figure) => (
        <span key={figure} className="filter-tag">
          {figure}
          <button
            type="button"
            onClick={() => onToggleFigure(figure)}
            className="btn-remove-tag"
            disabled={isLoading}
          >
            x
          </button>
        </span>
      ))}
    </div>
  </div>
);
