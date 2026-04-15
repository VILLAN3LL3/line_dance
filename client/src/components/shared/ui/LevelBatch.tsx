import React from "react";

interface LevelBatchProps {
  level: string;
  className?: string;
  removeButtonClassName?: string;
  title?: string;
  isRemovable?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

const getLevelColorClass = (level: string): string => {
  const l = level.toLowerCase();
  let tier = "base";
  if (l.includes("absolute")) {
    tier = "absolute";
  } else if (l.includes("easy")) {
    tier = "easy";
  } else if (l.includes("low")) {
    tier = "low";
  } else if (l.includes("high")) {
    tier = "high";
  }

  if (l.includes("beginner")) return `level-color-beginner-${tier}`;
  if (l.includes("improver")) return `level-color-improver-${tier}`;
  if (l.includes("intermediate")) return `level-color-intermediate-${tier}`;
  if (l.includes("advanced")) return `level-color-advanced-${tier}`;
  return "level-color-unknown";
};

export const LevelBatch: React.FC<LevelBatchProps> = ({
  level,
  className = "level-batch",
  removeButtonClassName = "btn-remove-level",
  title,
  isRemovable = false,
  isSelected = false,
  disabled = false,
  onClick,
  onRemove,
}) => {
  const classNames = [
    className,
    "level-badge",
    getLevelColorClass(level),
    isSelected ? "level-badge-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button
        type="button"
        className={classNames}
        title={title}
        disabled={disabled}
        onClick={onClick}
      >
        {level}
      </button>
    );
  }

  return (
    <span className={classNames} title={title}>
      <span>{level}</span>
      {isRemovable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={removeButtonClassName}
          disabled={disabled}
        >
          ×
        </button>
      )}
    </span>
  );
};
