import React from "react";

import { ActionButton, EmptyState, LevelBatch, Section } from "../shared/ui";

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
    <Section
      title={`Choreographies for ${new Date(selectedSession.session_date).toLocaleDateString()}`}
    >
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
        <ActionButton
          type="submit"
          variant="primary"
          disabled={isLoading || !selectedChoreographyId}
        >
          + Add to Session
        </ActionButton>
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
                  <LevelBatch level={choreography?.level || "UNKNOWN"} />
                </div>
                <ActionButton
                  onClick={() => onRemoveChoreography(sessionChoreography.choreography_id)}
                  variant="delete"
                  disabled={isLoading}
                >
                  Remove
                </ActionButton>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
};

export default CourseDetailChoreographiesSection;
