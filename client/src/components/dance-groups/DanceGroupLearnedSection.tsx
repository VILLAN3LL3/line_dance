import React from "react";
import { useNavigate } from "react-router-dom";

import { Choreography, LearnedChoreography } from "../../types";
import { getBerlinTodayIso } from "../../utils/courseStatus";
import { ActionButton, EmptyState, LevelBatch, Section, TagGroup } from "../shared/ui";

interface DanceGroupLearnedSectionProps {
  learnedChoreographies: LearnedChoreography[];
  choreographies: Choreography[];
  maxGroupLevelValue: number | null;
  groupName: string;
  isLoading: boolean;
}

export const DanceGroupLearnedSection: React.FC<DanceGroupLearnedSectionProps> = ({
  learnedChoreographies,
  choreographies,
  maxGroupLevelValue,
  groupName,
  isLoading,
}) => {
  const navigate = useNavigate();

  const berlinTodayIso = getBerlinTodayIso();

  const learnedStepFigures = Array.from(
    new Set(
      learnedChoreographies
        .filter((learned) => learned.first_learned_date < berlinTodayIso)
        .flatMap(
          (learned) =>
            choreographies.find((c) => c.id === learned.choreography_id)?.step_figures ?? [],
        ),
    ),
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
          </>
        )}
      </Section>

      <Section title={`Learned Choreographies for ${groupName}`}>
        {learnedChoreographies.length === 0 ? (
          <EmptyState>No choreographies learned yet</EmptyState>
        ) : (
          <div className="learned-list">
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
