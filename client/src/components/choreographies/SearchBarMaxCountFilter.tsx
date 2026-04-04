import React from "react";

interface SearchBarMaxCountFilterProps {
  maxCount: number;
  maxCountLimit: number;
  isLoading: boolean;
  onMaxCountChange: (value: number) => void;
}

export const SearchBarMaxCountFilter: React.FC<SearchBarMaxCountFilterProps> = ({
  maxCount,
  maxCountLimit,
  isLoading,
  onMaxCountChange,
}) => (
  <div className="filter-group">
    <label htmlFor="max-count-slider">Max Counts:</label>
    <div className="max-count-filter">
      <input
        id="max-count-slider"
        type="range"
        min={0}
        max={maxCountLimit}
        step={8}
        value={Math.min(maxCount, maxCountLimit)}
        onChange={(e) => onMaxCountChange(Number(e.target.value))}
        disabled={isLoading || maxCountLimit === 0}
      />
      <span className="max-count-value">
        {maxCountLimit === 0 || maxCount >= maxCountLimit
          ? `No limit (max ${maxCountLimit})`
          : `<= ${maxCount}`}
      </span>
    </div>
  </div>
);
