import React, { useState } from "react";

import type { LearningStatus } from "../../../../types";
import { getLearningStatusOption, LEARNING_STATUS_OPTIONS } from "../../model/learning-status";

interface ChoreographyCardTitleProps {
  title: string;
  learningStatus: LearningStatus | null;
  /** Tooltip for the status icon, e.g. "Learned since 2026-11-24". */
  learningStatusText?: string;
  onLearningStatusChange: (status: LearningStatus | null) => void;
}

const NO_STATUS_LABEL = "No status";

/**
 * Card title with the learning status icon in front. The icon opens a small editor (like the
 * rating pill); a dance without status opens it by clicking the title itself. Pressing the
 * active option or Escape closes it without a change.
 */
export const ChoreographyCardTitle: React.FC<ChoreographyCardTitleProps> = ({
  title,
  learningStatus,
  learningStatusText,
  onLearningStatusChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = getLearningStatusOption(learningStatus);

  const choose = (status: LearningStatus | null) => {
    setIsOpen(false);
    onLearningStatusChange(status);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Escape") setIsOpen(false);
  };

  return (
    <h3>
      <span className="learning-status-picker" onKeyDown={handleKeyDown}>
        {isOpen && (
          <span className="learning-status-options" role="group" aria-label="Learning status">
            {LEARNING_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`learning-status-option${learningStatus === option.value ? " is-active" : ""}`}
                aria-pressed={learningStatus === option.value}
                aria-label={option.label}
                title={option.label}
                onClick={(event) => {
                  event.stopPropagation();
                  choose(option.value);
                }}
              >
                {option.emoji}
              </button>
            ))}
            <button
              type="button"
              className={`learning-status-option${learningStatus === null ? " is-active" : ""}`}
              aria-pressed={learningStatus === null}
              aria-label={NO_STATUS_LABEL}
              title={NO_STATUS_LABEL}
              onClick={(event) => {
                event.stopPropagation();
                choose(null);
              }}
            >
              ✕
            </button>
          </span>
        )}
        {!isOpen && current && (
          <button
            type="button"
            className="learning-status-summary"
            aria-label={`Learning status: ${current.label}. Open status editor`}
            aria-expanded={false}
            title={learningStatusText}
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(true);
            }}
          >
            {current.emoji}
          </button>
        )}
      </span>
      {current ? (
        title
      ) : (
        <button
          type="button"
          className="card-title-toggle"
          aria-expanded={isOpen}
          title="Set learning status"
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((open) => !open);
          }}
        >
          {title}
        </button>
      )}
    </h3>
  );
};
