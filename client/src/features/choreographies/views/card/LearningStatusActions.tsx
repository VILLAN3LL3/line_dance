import React from "react";

import type { LearningStatus } from "../../../../types";
import { LEARNING_STATUS_OPTIONS } from "../../model/learning-status";

interface LearningStatusActionsProps {
  status: LearningStatus | null;
  onChange: (clicked: LearningStatus) => void;
}

const ACTION_TITLES: Record<LearningStatus, { add: string; remove: string }> = {
  wishlist: { add: "Add to wishlist", remove: "Remove from wishlist" },
  learned: { add: "Mark as learned", remove: "Remove learned mark" },
};

/** One toggle per status; pressing the active one clears the status. */
export const LearningStatusActions: React.FC<LearningStatusActionsProps> = ({
  status,
  onChange,
}) => (
  <>
    {LEARNING_STATUS_OPTIONS.map((option) => {
      const isActive = status === option.value;
      const titles = ACTION_TITLES[option.value];
      return (
        <button
          key={option.value}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChange(option.value);
          }}
          className={`btn-secondary btn-small learning-status-action${isActive ? " is-active" : ""}`}
          aria-pressed={isActive}
          aria-label={option.label}
          title={isActive ? titles.remove : titles.add}
        >
          <span aria-hidden="true">{option.emoji}</span>
        </button>
      );
    })}
  </>
);
