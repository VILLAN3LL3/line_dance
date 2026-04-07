import React from "react";

import { EmptyState } from "../shared/ui";

import type { Choreography, Session, SessionChoreography } from "../../types";

type CourseDetailChoreographiesSectionProps = {
  selectedSession: Session;
  isLoading: boolean;
  selectedChoreographyId: string;
  selectedChoreographyQuery: string;
  selectableChoreographies: Choreography[];
  sessionChoreographies: SessionChoreography[];
  availableChoreographies: Choreography[];
  getChoreographyOptionLabel: (choreography: Choreography) => string;
  onChoreographyInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddChoreography: (event: React.SyntheticEvent<HTMLFormElement>) => void;
  onRemoveChoreography: (choreographyId: number) => void;
};

const CourseDetailChoreographiesSection: React.FC<CourseDetailChoreographiesSectionProps> = ({
  selectedSession,
  isLoading,
  selectedChoreographyId,
  selectedChoreographyQuery,
  selectableChoreographies,
  sessionChoreographies,
  availableChoreographies,
  getChoreographyOptionLabel,
  onChoreographyInputChange,
  onAddChoreography,
  onRemoveChoreography,
}) => {
  return (
    <section className="section">
      <h3>Choreographies for {new Date(selectedSession.session_date).toLocaleDateString()}</h3>

      <form onSubmit={onAddChoreography} className="choreo-form">
        <div className="choreo-autocomplete">
          <input
            type="text"
            value={selectedChoreographyQuery}
            onChange={onChoreographyInputChange}
            list="session-choreography-options"
            placeholder="Search choreography by name..."
            className="choreo-autocomplete-input"
            disabled={isLoading}
          />
          <datalist id="session-choreography-options">
            {selectableChoreographies.map((choreography) => (
              <option key={choreography.id} value={getChoreographyOptionLabel(choreography)} />
            ))}
          </datalist>
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !selectedChoreographyId}
        >
          + Add to Session
        </button>
      </form>

      {!isLoading && selectableChoreographies.length === 0 && (
        <p className="choreo-autocomplete-hint">All choreographies are already in this session.</p>
      )}

      {!isLoading && selectableChoreographies.length > 0 && (
        <p className="choreo-autocomplete-hint">
          Start typing to autocomplete a choreography name.
        </p>
      )}

      {sessionChoreographies.length === 0 ? (
        <EmptyState>No choreographies in this session yet</EmptyState>
      ) : (
        <div className="choreographies-list">
          {sessionChoreographies.map((sessionChoreography) => {
            const choreography = availableChoreographies.find(
              (item) => item.id === sessionChoreography.choreography_id,
            );

            return (
              <div key={sessionChoreography.id} className="choreography-item">
                <div className="choreo-info">
                  <h4>{choreography?.name}</h4>
                  <p>{choreography?.level}</p>
                </div>
                <button
                  onClick={() => onRemoveChoreography(sessionChoreography.choreography_id)}
                  className="btn-delete"
                  disabled={isLoading}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CourseDetailChoreographiesSection;
