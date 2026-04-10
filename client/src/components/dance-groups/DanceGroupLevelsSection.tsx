import React, { useState } from "react";

import { Choreography } from "../../types";
import { EmptyState, LevelBatch, Section, TagGroup } from "../shared/ui";

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
  const availableLevels = Array.from(
    new Set(
      choreographies
        .map((choreography) => choreography.level)
        .filter((level) => !groupLevels.includes(level)),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const [newLevel, setNewLevel] = useState("");

  const handleLevelSelect = async (level: string) => {
    if (!level) return;
    setNewLevel(level);
    await onAddLevel(level);
    setNewLevel("");
  };

  return (
    <Section title="Group Levels">
      <div className="level-form">
        <select
          aria-label="Available levels"
          value={newLevel}
          onChange={(e) => void handleLevelSelect(e.target.value)}
          disabled={isLoading || availableLevels.length === 0}
        >
          <option value="">Select a level...</option>
          {availableLevels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      {groupLevels.length === 0 ? (
        <EmptyState>No levels configured yet</EmptyState>
      ) : (
        <TagGroup className="tags-container">
          {groupLevels.map((level) => (
            <LevelBatch
              key={level}
              level={level}
              removeButtonClassName="btn-remove-tag"
              isRemovable
              disabled={isLoading}
              onRemove={() => onRemoveLevel(level)}
            />
          ))}
        </TagGroup>
      )}
    </Section>
  );
};
