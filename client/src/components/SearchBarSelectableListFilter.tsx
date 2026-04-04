import React from "react";

interface SearchBarSelectableListFilterProps {
  label: string;
  inputId: string;
  listId: string;
  inputValue: string;
  options: string[];
  selectedValues: string[];
  placeholder: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFromInput: (value?: string) => void;
  onToggleValue: (value: string) => void;
}

export const SearchBarSelectableListFilter: React.FC<SearchBarSelectableListFilterProps> = ({
  label,
  inputId,
  listId,
  inputValue,
  options,
  selectedValues,
  placeholder,
  isLoading,
  onInputChange,
  onAddFromInput,
  onToggleValue,
}) => (
  <div className="filter-group">
    <label htmlFor={inputId}>{label}:</label>
    <div className="filter-input-container">
      <input
        id={inputId}
        type="text"
        value={inputValue}
        onChange={onInputChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAddFromInput(inputValue);
          }
        }}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
        disabled={isLoading}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <button
        type="button"
        onClick={() => onAddFromInput(inputValue)}
        className="btn-add-filter"
        disabled={isLoading}
      >
        +
      </button>
    </div>
    <div className="filter-tags">
      {selectedValues.map((value) => (
        <span key={value} className="filter-tag">
          {value}
          <button
            type="button"
            onClick={() => onToggleValue(value)}
            className="btn-remove-tag"
            disabled={isLoading}
          >
            x
          </button>
        </span>
      ))}
    </div>
  </div>
);
