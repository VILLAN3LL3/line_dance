import React from "react";

import { LevelOption } from "../../types";
import { Section } from "../shared/ui";

interface DanceGroupLevelsSectionProps {
  maxGroupLevelValue: number | null;
  levelOptions: LevelOption[];
  isLoading: boolean;
  onMaxGroupLevelValueChange: (value: number | null) => Promise<void>;
}

export const DanceGroupLevelsSection: React.FC<DanceGroupLevelsSectionProps> = ({
  maxGroupLevelValue,
  levelOptions,
  isLoading,
  onMaxGroupLevelValueChange,
}) => {
  return (
    <Section title="Max Group Level">
      <div className="level-form">
        <select
          aria-label="Max group level"
          value={maxGroupLevelValue ?? ""}
          onChange={(e) =>
            void onMaxGroupLevelValueChange(
              e.target.value ? Number.parseInt(e.target.value, 10) : null,
            )
          }
          disabled={isLoading || levelOptions.length === 0}
        >
          <option value="">No max group level</option>
          {levelOptions.map((option) => (
            <option key={option.id} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
    </Section>
  );
};
