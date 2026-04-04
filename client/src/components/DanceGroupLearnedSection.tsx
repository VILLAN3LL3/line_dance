import React from "react";
import { useNavigate } from "react-router-dom";

import { Choreography, LearnedChoreography } from "../types";
import { getBerlinTodayIso } from "../utils/courseStatus";

interface DanceGroupLearnedSectionProps {
  learnedChoreographies: LearnedChoreography[];
  choreographies: Choreography[];
  groupLevels: string[];
  groupName: string;
  isLoading: boolean;
}

export const DanceGroupLearnedSection: React.FC<DanceGroupLearnedSectionProps> = ({
  learnedChoreographies,
  choreographies,
  groupLevels,
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
    navigate("/", {
      state: {
        initialFilters: {
          step_figures: learnedStepFigures,
          level: groupLevels,
          step_figures_match_mode: "exact",
        },
      },
    });
  };

  return (
    <div className="learned-sections">
      <section className="section">
        <h3>Learned Step Figures</h3>
        {learnedStepFigures.length === 0 ? (
          <div className="empty-state">No step figures learned yet</div>
        ) : (
          <>
            <div className="tags-container">
              {learnedStepFigures.map((figure) => (
                <span key={figure} className="tag">
                  {figure}
                </span>
              ))}
            </div>
            <div style={{ marginTop: "15px" }}>
              <button
                onClick={handleSearchChoreographies}
                className="btn-primary"
                disabled={isLoading}
              >
                Search Choreographies
              </button>
            </div>
          </>
        )}
      </section>

      <section className="section">
        <h3>Learned Choreographies for {groupName}</h3>
        {learnedChoreographies.length === 0 ? (
          <div className="empty-state">No choreographies learned yet</div>
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
                      new Date(a.first_learned_date).getTime() -
                      new Date(b.first_learned_date).getTime(),
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
                        <td>{choreography?.level ?? "N/A"}</td>
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
      </section>
    </div>
  );
};
