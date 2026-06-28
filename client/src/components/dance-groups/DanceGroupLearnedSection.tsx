import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Choreography,
  LearnedChoreography,
  StepFigureOption,
  StepFigureSuggestion,
} from "../../types";
import { getBerlinTodayIso } from "../../utils/courseStatus";
import { ActionButton, EmptyState, LevelBatch, Section, TagGroup } from "../shared/ui";

interface DanceGroupLearnedSectionProps {
  learnedChoreographies: LearnedChoreography[];
  choreographies: Choreography[];
  stepFigureSuggestions: StepFigureSuggestion[];
  maxGroupLevelValue: number | null;
  groupName: string;
  isLoading: boolean;
  baseStepFigures: StepFigureOption[];
  allStepFigures: StepFigureOption[];
  onBaseStepFiguresChange: (stepFigureIds: number[]) => Promise<void>;
}

export const DanceGroupLearnedSection: React.FC<DanceGroupLearnedSectionProps> = ({
  learnedChoreographies,
  choreographies,
  stepFigureSuggestions,
  maxGroupLevelValue,
  groupName,
  isLoading,
  baseStepFigures,
  allStepFigures,
  onBaseStepFiguresChange,
}) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const berlinTodayIso = getBerlinTodayIso();

  const baseStepFigureNames = baseStepFigures.map((f) => f.name);

  const learnedFromChoreos = Array.from(
    new Set(
      learnedChoreographies
        .filter((learned) => learned.first_learned_date < berlinTodayIso)
        .flatMap(
          (learned) =>
            choreographies.find((c) => c.id === learned.choreography_id)?.step_figures ?? [],
        ),
    ),
  );

  const learnedStepFigures = Array.from(
    new Set([...baseStepFigureNames, ...learnedFromChoreos]),
  ).sort((a, b) => a.localeCompare(b));

  const handleSearchChoreographies = () => {
    const initialFilters = {
      step_figures: learnedStepFigures,
      step_figures_match_mode: "exact" as const,
      ...(maxGroupLevelValue === null ? {} : { max_level_value: maxGroupLevelValue }),
    };

    navigate("/", {
      state: {
        initialFilters,
      },
    });
  };

  const handleSearchWithSuggestion = (suggestedFigure: string) => {
    const initialFilters = {
      step_figures: [...learnedStepFigures, suggestedFigure],
      step_figures_match_mode: "exact" as const,
      required_step_figures: [suggestedFigure],
      ...(maxGroupLevelValue === null ? {} : { max_level_value: maxGroupLevelValue }),
    };

    globalThis.open(
      "/?filters=" + encodeURIComponent(JSON.stringify(initialFilters)),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const baseIds = new Set(baseStepFigures.map((f) => f.id));
  const addableStepFigures = allStepFigures.filter((f) => !baseIds.has(f.id));

  const handleRemoveBase = (id: number) => {
    void onBaseStepFiguresChange(baseStepFigures.filter((f) => f.id !== id).map((f) => f.id));
  };

  const handleAddBase = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    if (!id) return;
    void onBaseStepFiguresChange([...baseStepFigures.map((f) => f.id), id]);
    e.target.value = "";
  };

  return (
    <div className="learned-sections">
      <Section title="Learned Step Figures">
        {learnedStepFigures.length === 0 ? (
          <EmptyState>No step figures learned yet</EmptyState>
        ) : (
          <>
            <TagGroup className="tags-container">
              {learnedStepFigures.map((figure) => (
                <span key={figure} className="tag">
                  {figure}
                </span>
              ))}
            </TagGroup>
            <div style={{ marginTop: "15px" }}>
              <ActionButton
                onClick={handleSearchChoreographies}
                variant="primary"
                disabled={isLoading}
              >
                Search Choreographies
              </ActionButton>
            </div>
            <div className="base-step-figures-editor">
              <p className="base-step-figures-label">Base step figures (known before start):</p>
              <div className="base-step-figures-tags">
                {baseStepFigures.map((f) => (
                  <span key={f.id} className="tag base-tag">
                    {f.name}
                    <button
                      className="base-tag-remove"
                      onClick={() => handleRemoveBase(f.id)}
                      disabled={isLoading}
                      aria-label={`Remove ${f.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {addableStepFigures.length > 0 && (
                  <select
                    className="base-step-figures-add"
                    onChange={handleAddBase}
                    disabled={isLoading}
                    defaultValue=""
                    aria-label="Add base step figure"
                  >
                    <option value="" disabled>
                      + Add figure…
                    </option>
                    {addableStepFigures.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </>
        )}
      </Section>

      {stepFigureSuggestions.length > 0 && (
        <Section title="Next Step Figure to Learn">
          <p className="suggestion-description">
            Adding one of these step figures to the learned set would unlock the most new
            choreographies:
          </p>
          <div className="suggestion-list">
            {stepFigureSuggestions.map((s) => (
              <div key={s.step_figure} className="suggestion-item">
                <button
                  className="suggestion-figure-btn"
                  onClick={() => handleSearchWithSuggestion(s.step_figure)}
                  disabled={isLoading}
                  title={`Preview choreographies matching with ${s.step_figure} added`}
                >
                  {s.step_figure}
                </button>
                <span className="suggestion-count">
                  +{s.additional_choreographies} choreograph
                  {s.additional_choreographies === 1 ? "y" : "ies"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Learned Choreographies for ${groupName}`}>
        {learnedChoreographies.length === 0 ? (
          <EmptyState>No choreographies learned yet</EmptyState>
        ) : (
          <div className="learned-list">
            <label className="learned-show-all-toggle">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />{" "}
              Show planned (not yet danced)
            </label>
            <table className="learned-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Level</th>
                  <th>Times Danced</th>
                  <th>First Learned</th>
                  <th>Last Danced</th>
                </tr>
              </thead>
              <tbody>
                {[...learnedChoreographies]
                  .filter((learned) => showAll || learned.times_danced > 0)
                  .sort(
                    (a, b) =>
                      new Date(b.first_learned_date).getTime() -
                      new Date(a.first_learned_date).getTime(),
                  )
                  .map((learned) => {
                    const choreography = choreographies.find(
                      (c) => c.id === learned.choreography_id,
                    );
                    return (
                      <tr
                        key={`${learned.dance_group_id}-${learned.choreography_id}`}
                        onClick={() => navigate(`/choreographies/${learned.choreography_id}`)}
                        className="clickable-row"
                      >
                        <td>{choreography?.name ?? `Unknown (ID: ${learned.choreography_id})`}</td>
                        <td>{choreography ? <LevelBatch level={choreography.level} /> : "N/A"}</td>
                        <td>{learned.times_danced}</td>
                        <td>{new Date(learned.first_learned_date).toLocaleDateString()}</td>
                        <td>{new Date(learned.last_danced_date).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
};
