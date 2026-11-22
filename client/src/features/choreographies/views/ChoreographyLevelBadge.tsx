import React from "react";

import { LevelBatch } from "../../../shared/ui";
import type { Choreography } from "../../../types";
import { hasPersonalLevel } from "../model/choreography-level";

interface ChoreographyLevelBadgeProps {
  choreography: Pick<Choreography, "level" | "official_level" | "personal_level">;
  trailingContent?: React.ReactNode;
}

/** Shows the effective level; a personal level is marked and the official one stays in the title. */
export const ChoreographyLevelBadge: React.FC<ChoreographyLevelBadgeProps> = ({
  choreography,
  trailingContent,
}) => {
  const isPersonal = hasPersonalLevel(choreography);
  return (
    <LevelBatch
      level={choreography.level || "UNKNOWN"}
      title={isPersonal ? `Personal level (official: ${choreography.official_level})` : undefined}
      trailingContent={
        <>
          {isPersonal && (
            <>
              <span className="level-personal-marker" aria-hidden="true">
                ✎
              </span>
              <span className="sr-only">
                Personal level, official level {choreography.official_level}
              </span>
            </>
          )}
          {trailingContent}
        </>
      }
    />
  );
};
