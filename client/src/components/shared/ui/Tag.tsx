import React from "react";

interface TagProps {
  value: string;
  className?: string;
  removeButtonClassName?: string;
  title?: string;
  isRemovable?: boolean;
  disabled?: boolean;
  onRemove?: () => void;
}

export const Tag: React.FC<TagProps> = ({
  value,
  className = "tag",
  removeButtonClassName = "btn-remove",
  title,
  isRemovable = false,
  disabled = false,
  onRemove,
}) => (
  <span className={className} title={title}>
    {value}
    {isRemovable && onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className={removeButtonClassName}
        disabled={disabled}
      >
        x
      </button>
    )}
  </span>
);
