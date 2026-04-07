import React from "react";

import { AutoCompleteInput, Tag, TagGroup } from "../shared/ui";

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
      <AutoCompleteInput
        id={inputId}
        listId={listId}
        value={inputValue}
        options={options}
        onChange={onInputChange}
        onAdd={onAddFromInput}
        placeholder={placeholder}
        disabled={isLoading}
        autoComplete="off"
        addButtonLabel="+"
        addButtonClassName="btn-add-filter"
      />
    </div>
    <TagGroup className="filter-tags">
      {selectedValues.map((value) => (
        <Tag
          key={value}
          value={value}
          className="filter-tag"
          removeButtonClassName="btn-remove-tag"
          isRemovable
          disabled={isLoading}
          onRemove={() => onToggleValue(value)}
        />
      ))}
    </TagGroup>
  </div>
);
