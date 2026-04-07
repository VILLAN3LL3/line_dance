import React, { useState } from "react";

import { Choreography } from "../../types";
import { ActionButton, EmptyState, Section, TagGroup } from "../shared/ui";

interface DanceGroupLevelsSectionProps {
  groupLevels: string[];
  choreographies: Choreography[];
  isLoading: boolean;
  onAddLevel: (level: string) => Promise<void>;
  onRemoveLevel: (level: string) => Promise<void>;
}

export const DanceGroupLevelsSection: React.FC<DanceGroupLevelsSectionProps> = ({
  groupLevels,
  choreographies,
  isLoading,
  onAddLevel,
  onRemoveLevel,
}) => {
  const [newLevel, setNewLevel] = useState("");

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newLevel.trim()) return;
    await onAddLevel(newLevel);
    setNewLevel("");
  };

  return (
    <Section title="Group Levels">
      <form onSubmit={handleSubmit} className="level-form">
        <input
          type="text"
          placeholder="Add a new level (e.g., Beginner, Intermediate)"
          value={newLevel}
          onChange={(e) => setNewLevel(e.target.value)}
          list="available-levels"
          disabled={isLoading}
        />
        <datalist id="available-levels">
          {Array.from(
            new Set(
              choreographies.map((c) => c.level).filter((level) => !groupLevels.includes(level)),
            ),
          )
            .sort((a, b) => a.localeCompare(b))
            .map((level) => (
              <option key={level} value={level} />
            ))}
        </datalist>
        <ActionButton type="submit" variant="primary" disabled={isLoading}>
          + Add Level
        </ActionButton>
      </form>

      {groupLevels.length === 0 ? (
        <EmptyState>No levels configured yet</EmptyState>
      ) : (
        <TagGroup className="tags-container">
          {groupLevels.map((level) => (
            <span key={level} className="tag">
              {level}
              <button
                type="button"
                onClick={() => onRemoveLevel(level)}
                className="btn-remove"
                disabled={isLoading}
              >
                ×
              </button>
            </span>
          ))}
        </TagGroup>
      )}
    </Section>
  );
};
